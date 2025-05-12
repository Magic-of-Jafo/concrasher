import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { message: 'No file provided' },
        { status: 400 }
      );
    }

    // Create a unique filename to prevent collisions
    const timestamp = Date.now();
    const uniqueFilename = `${timestamp}-${file.name}`;
    
    // Ensure the uploads directory exists
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Write the file
    const filePath = join(uploadDir, uniqueFilename);
    await writeFile(filePath, buffer);

    // Return the URL relative to the public directory
    return NextResponse.json({
      url: `/uploads/${uniqueFilename}`,
      key: uniqueFilename,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    
    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorDetails = {
      message: 'Failed to upload file',
      details: errorMessage,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(errorDetails, { status: 500 });
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

    const filePath = join(process.cwd(), 'public', 'uploads', key);
    if (!existsSync(filePath)) {
      return NextResponse.json({ message: 'File not found' }, { status: 404 });
    }

    await unlink(filePath);
    return NextResponse.json({ message: 'File deleted successfully', key });
  } catch (error) {
    console.error('Error deleting file:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ message: 'Failed to delete file', details: errorMessage }, { status: 500 });
  }
} 