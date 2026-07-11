import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { assertSafeUploadBucket } from '@/lib/s3-config';

// Configure S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME!;

// WordPress-style filename sanitization
function sanitizeFilename(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');
  const name = lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
  const extension = lastDotIndex > 0 ? filename.substring(lastDotIndex) : '';

  let sanitized = name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-_]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!sanitized) {
    sanitized = 'image';
  }

  // Preserve original extension but make it lowercase
  return sanitized + extension.toLowerCase();
}


export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const bucketError = assertSafeUploadBucket();
    if (bucketError) return NextResponse.json({ error: bucketError }, { status: 500 });

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const imageUrl = ((formData.get('url') as string | null) || '').trim() || null;

    if ((!file || typeof file === 'string') && !imageUrl) {
      return NextResponse.json({ error: 'No file or url provided' }, { status: 400 });
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'];
    const MAX_BYTES = 5 * 1024 * 1024; // 5MB

    const conventionId = formData.get('conventionId') as string;
    const userId = formData.get('userId') as string;
    const brandId = formData.get('brandId') as string;
    const mediaType = formData.get('mediaType') as string; // 'cover', 'profile', 'promotional', 'brand', 'talent'

    if ((!conventionId && !userId && !brandId) || !mediaType) {
      return NextResponse.json({ error: 'conventionId, userId, or brandId, and mediaType are required' }, { status: 400 });
    }

    // Acquire the image bytes from either the uploaded file or a remote URL.
    let buffer: Buffer;
    let contentType: string;
    let sourceName: string;
    if (file && typeof file !== 'string') {
      if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 });
      }
      if (!validTypes.includes(file.type)) {
        return NextResponse.json({ error: 'Invalid file type.' }, { status: 400 });
      }
      buffer = Buffer.from(await file.arrayBuffer());
      contentType = file.type;
      sourceName = file.name;
    } else {
      let imgRes: Response;
      try {
        imgRes = await fetch(imageUrl!, {
          redirect: 'follow',
          signal: AbortSignal.timeout(15000),
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' },
        });
      } catch {
        return NextResponse.json({ error: 'Could not fetch that image URL.' }, { status: 400 });
      }
      if (!imgRes.ok) {
        return NextResponse.json({ error: `Could not fetch that image URL (HTTP ${imgRes.status}).` }, { status: 400 });
      }
      contentType = (imgRes.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
      if (!validTypes.includes(contentType)) {
        return NextResponse.json({ error: 'That URL is not a supported image (JPEG, PNG, GIF, WEBP, or AVIF).' }, { status: 400 });
      }
      const ab = await imgRes.arrayBuffer();
      if (ab.byteLength > MAX_BYTES) {
        return NextResponse.json({ error: 'Image must be less than 5MB' }, { status: 400 });
      }
      buffer = Buffer.from(ab);
      let nameFromUrl = 'image';
      try { nameFromUrl = new URL(imageUrl!).pathname.split('/').pop() || 'image'; } catch { /* keep default */ }
      if (!/\.[a-z0-9]+$/i.test(nameFromUrl)) {
        const ext = (contentType.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
        nameFromUrl = `${nameFromUrl}.${ext}`;
      }
      sourceName = nameFromUrl;
    }

    // Downscale + compress so stored images stay web-friendly — pasted and remote
    // images can be many MB at full resolution, which makes them slow to load.
    // Keep PNG (and its transparency) for images with an alpha channel; convert
    // opaque images to JPEG. Skip GIFs (may be animated) and fall back to the
    // original bytes if processing fails for any reason.
    const MAX_DIM = 1600;
    if (contentType !== 'image/gif') {
      try {
        // Pasted images often carry an alpha channel even when fully opaque, so test
        // actual transparency (isOpaque), not just whether an alpha channel exists.
        let opaque: boolean;
        try {
          opaque = (await sharp(buffer, { failOn: 'none' }).stats()).isOpaque;
        } catch {
          const m = await sharp(buffer, { failOn: 'none' }).metadata();
          opaque = !m.hasAlpha;
        }
        const resized = sharp(buffer, { failOn: 'none' })
          .rotate() // honor EXIF orientation
          .resize({ width: MAX_DIM, height: MAX_DIM, fit: 'inside', withoutEnlargement: true });
        if (opaque) {
          buffer = await resized.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
          contentType = 'image/jpeg';
        } else {
          buffer = await resized.png({ compressionLevel: 9 }).toBuffer();
          contentType = 'image/png';
        }
      } catch (e) {
        console.warn('[Upload] image processing skipped:', e);
      }
    }

    // Sanitize filename and create a unique key for S3 (extension matches the
    // final, possibly converted, format).
    const forcedExt = contentType === 'image/png' ? 'png' : contentType === 'image/jpeg' ? 'jpg' : (contentType.split('/')[1] || 'img');
    const baseName = sourceName.replace(/\.[^./]+$/, '') || 'image';
    const originalFilename = sanitizeFilename(`${baseName}.${forcedExt}`) || `upload-${uuidv4()}.${forcedExt}`;
    let key: string;

    if (conventionId) {
      key = `uploads/${conventionId}/${mediaType}/${originalFilename}`;
    } else if (userId) {
      key = `uploads/users/${userId}/${mediaType}/${originalFilename}`;
    } else if (brandId) {
      key = `uploads/brands/${brandId}/profile/${originalFilename}`;
    } else if (userId && mediaType === 'brand') {
      // For new brands, store in a temporary location
      key = `uploads/users/${userId}/brand-temp/${originalFilename}`;
    } else {
      // This case should be prevented by the check above, but as a safeguard:
      return NextResponse.json({ error: 'A valid identifier (conventionId, userId, or brandId) is required.' }, { status: 400 });
    }

    // Upload to S3
    const putCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await s3Client.send(putCommand);

    // Return the full S3 URL
    const url = `https://${BUCKET_NAME}.s3.us-east-1.amazonaws.com/${key}`;

    console.log(`[Upload] Saved file to S3: ${url}`);
    return NextResponse.json({ url });

  } catch (error) {
    console.error('Error uploading file to S3:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    const bucketError = assertSafeUploadBucket();
    if (bucketError) return NextResponse.json({ message: bucketError }, { status: 500 });

    const { key } = await request.json();

    if (!key) {
      return NextResponse.json({ message: 'No file key provided' }, { status: 400 });
    }

    // The key should be the path within the bucket, e.g., 'uploads/conventionId/...'
    // The frontend should be updated to send the S3 key, not a partial path.
    // Assuming the full URL is passed, we extract the key.
    const url = new URL(key);
    const s3Key = url.pathname.substring(1); // Remove leading '/'

    if (!s3Key) {
      return NextResponse.json({ message: 'Invalid S3 key provided' }, { status: 400 });
    }

    const deleteCommand = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    });

    await s3Client.send(deleteCommand);

    console.log(`[Delete] Removed file from S3: ${s3Key}`);
    return NextResponse.json({ message: 'File deleted successfully', key: s3Key });

  } catch (error) {
    console.error('Error deleting file from S3:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ message: 'Failed to delete file', details: errorMessage }, { status: 500 });
  }
} 