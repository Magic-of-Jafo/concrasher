import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { unlink } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

// Generic image uploads (venue/hotel photos via ImageUploadInput).
//
// Formerly wrote to public/uploads/images on LOCAL DISK, which is ephemeral
// on Render (files vanished on every deploy) and invisible to getS3ImageUrl.
// Now uploads to S3 under uploads/images/ — the same prefix the display
// mapper already resolves — and requires a signed-in user (the disk version
// accepted anonymous uploads).

const s3Client = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME!;
const S3_PUBLIC_BASE = `https://${BUCKET_NAME}.s3.us-east-1.amazonaws.com`;

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
        }
        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: 'Invalid file type. Only images are allowed.' }, { status: 400 });
        }
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            return NextResponse.json({ error: `File size exceeds the limit of ${maxSize / (1024 * 1024)}MB.` }, { status: 400 });
        }

        let buffer: Buffer = Buffer.from(await file.arrayBuffer());
        let contentType = file.type;

        // Same web-friendly downscale/compress treatment as /api/upload:
        // keep transparency as PNG, flatten opaque images to JPEG, skip GIFs.
        const MAX_DIM = 1600;
        if (contentType !== 'image/gif') {
            try {
                let opaque: boolean;
                try {
                    opaque = (await sharp(buffer, { failOn: 'none' }).stats()).isOpaque;
                } catch {
                    const m = await sharp(buffer, { failOn: 'none' }).metadata();
                    opaque = !m.hasAlpha;
                }
                const resized = sharp(buffer, { failOn: 'none' })
                    .rotate()
                    .resize({ width: MAX_DIM, height: MAX_DIM, fit: 'inside', withoutEnlargement: true });
                if (opaque) {
                    buffer = await resized.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
                    contentType = 'image/jpeg';
                } else {
                    buffer = await resized.png({ compressionLevel: 9 }).toBuffer();
                    contentType = 'image/png';
                }
            } catch (e) {
                console.warn('[API upload-image] image processing skipped:', e);
            }
        }

        const ext = contentType === 'image/png' ? 'png' : contentType === 'image/jpeg' ? 'jpg' : (contentType.split('/')[1] || 'img');
        const key = `uploads/images/${uuidv4()}.${ext}`;

        await s3Client.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: buffer,
            ContentType: contentType,
        }));

        const url = `${S3_PUBLIC_BASE}/${key}`;
        console.log(`[API upload-image] Uploaded to S3: ${url}`);
        return NextResponse.json({ success: true, url });
    } catch (error) {
        console.error('[API upload-image] Error uploading file:', error);
        return NextResponse.json({ error: 'Error uploading file.', details: (error as Error).message }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const imageUrl: unknown = body.url;
        if (!imageUrl || typeof imageUrl !== 'string') {
            return NextResponse.json({ error: 'Image URL is required for deletion.' }, { status: 400 });
        }

        // Current form: full S3 URL under our managed prefix.
        if (imageUrl.startsWith(`${S3_PUBLIC_BASE}/uploads/images/`)) {
            const s3Key = new URL(imageUrl).pathname.substring(1);
            await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: s3Key }));
            console.log(`[API upload-image DELETE] Removed from S3: ${s3Key}`);
            return NextResponse.json({ success: true, message: 'File deleted successfully.' });
        }

        // Legacy form: relative path from the old local-disk uploader. Remove
        // the local file when it exists (dev machines), and the S3 twin if the
        // file was later re-hosted.
        if (imageUrl.startsWith('/uploads/images/')) {
            const filename = path.basename(imageUrl);
            try {
                await unlink(path.join(process.cwd(), 'public', 'uploads', 'images', filename));
            } catch { /* not on this disk — fine */ }
            try {
                await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: `uploads/images/${filename}` }));
            } catch { /* no S3 twin — fine */ }
            return NextResponse.json({ success: true, message: 'File deleted successfully.' });
        }

        console.warn(`[API upload-image DELETE] Attempt to delete unmanaged path: ${imageUrl}`);
        return NextResponse.json({ error: 'Invalid image path for deletion.' }, { status: 400 });
    } catch (error) {
        console.error('[API upload-image DELETE] Error processing delete request:', error);
        return NextResponse.json({ error: 'Error processing delete request.' }, { status: 500 });
    }
}
