import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

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

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size and type
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 });
    }
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type.' }, { status: 400 });
    }

    const conventionId = formData.get('conventionId') as string;
    const userId = formData.get('userId') as string;
    const mediaType = formData.get('mediaType') as string; // 'cover', 'profile', 'promotional'

    if ((!conventionId && !userId) || !mediaType) {
      return NextResponse.json({ error: 'conventionId or userId, and mediaType are required' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Sanitize filename and create a unique key for S3
    const originalFilename = sanitizeFilename(file.name) || `upload-${uuidv4()}`;
    let key: string;

    if (conventionId) {
      key = `uploads/${conventionId}/${mediaType}/${originalFilename}`;
    } else if (userId) {
      key = `uploads/users/${userId}/${mediaType}/${originalFilename}`;
    } else {
      // This case should be prevented by the check above, but as a safeguard:
      return NextResponse.json({ error: 'A valid identifier (conventionId or userId) is required.' }, { status: 400 });
    }

    // Upload to S3
    const putCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: file.type,
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