import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// WordPress-style filename sanitization
function sanitizeFilename(filename: string): string {
  // Split filename and extension
  const lastDotIndex = filename.lastIndexOf('.');
  const name = lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
  const extension = lastDotIndex > 0 ? filename.substring(lastDotIndex) : '';

  // Sanitize the name part
  let sanitized = name
    .toLowerCase()
    .replace(/\s+/g, '-')  // Replace spaces with hyphens
    .replace(/[^a-z0-9\-_]/g, '')  // Remove special characters (keep alphanumeric, hyphens, underscores)
    .replace(/-+/g, '-')  // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, '');  // Trim hyphens from start/end

  // Fallback if name becomes empty
  if (!sanitized) {
    sanitized = 'image';
  }

  return sanitized + extension.toLowerCase();
}

// Generate unique filename if conflict exists
async function getUniqueFilename(directory: string, filename: string): Promise<string> {
  const sanitizedFilename = sanitizeFilename(filename);
  let finalFilename = sanitizedFilename;
  let counter = 1;

  // Check if file exists and increment counter until we find a unique name
  while (existsSync(join(directory, finalFilename))) {
    const lastDotIndex = sanitizedFilename.lastIndexOf('.');
    const name = lastDotIndex > 0 ? sanitizedFilename.substring(0, lastDotIndex) : sanitizedFilename;
    const extension = lastDotIndex > 0 ? sanitizedFilename.substring(lastDotIndex) : '';

    counter++;
    finalFilename = `${name}-${counter}${extension}`;
  }

  return finalFilename;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, GIF, WebP, and AVIF are allowed' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Get new path parameters
    const conventionId = formData.get('conventionId') as string;
    const mediaType = formData.get('mediaType') as string; // 'cover', 'profile', 'promotional'

    // Validate required parameters
    if (!conventionId || !mediaType) {
      return NextResponse.json(
        { error: 'conventionId and mediaType are required' },
        { status: 400 }
      );
    }

    // Validate mediaType
    const validMediaTypes = ['cover', 'profile', 'promotional'];
    if (!validMediaTypes.includes(mediaType)) {
      return NextResponse.json(
        { error: 'Invalid mediaType. Must be: cover, profile, or promotional' },
        { status: 400 }
      );
    }

    // Create new directory structure: /uploads/{conventionId}/{mediaType}/
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    const conventionDir = join(uploadsDir, conventionId);
    const mediaDir = join(conventionDir, mediaType);

    // Ensure directories exist
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }
    if (!existsSync(conventionDir)) {
      await mkdir(conventionDir, { recursive: true });
    }
    if (!existsSync(mediaDir)) {
      await mkdir(mediaDir, { recursive: true });
    }

    // Get unique filename with WordPress-style sanitization
    const filename = await getUniqueFilename(mediaDir, file.name);

    // Save file
    const filepath = join(mediaDir, filename);
    await writeFile(filepath, buffer);

    // Return the URL path
    const url = `/uploads/${conventionId}/${mediaType}/${filename}`;

    console.log(`[Upload] Saved file: ${filename} to ${url}`);

    return NextResponse.json({ url, filename });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    let key = '';
    // Try to get key from JSON body
    try {
      const body = await request.json();
      key = body.key || '';
    } catch (e) {
      // fallback: try to get from query param
      const url = new URL(request.url);
      key = url.searchParams.get('key') || '';
    }

    if (!key) {
      return NextResponse.json({ message: 'No file key provided' }, { status: 400 });
    }

    // Handle both old and new path structures
    const filePath = join(process.cwd(), 'public', 'uploads', key);
    if (!existsSync(filePath)) {
      return NextResponse.json({ message: 'File not found' }, { status: 404 });
    }

    await unlink(filePath);
    console.log(`[Delete] Removed file: ${key}`);

    return NextResponse.json({ message: 'File deleted successfully', key });
  } catch (error) {
    console.error('Error deleting file:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ message: 'Failed to delete file', details: errorMessage }, { status: 500 });
  }
} 