import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid'; // For generating unique filenames
import fs from 'fs/promises';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    // Basic validation for file type (can be expanded)
    if (!file.type.startsWith('image/')) {
        return NextResponse.json({ error: 'Invalid file type. Only images are allowed.' }, { status: 400 });
    }

    // Basic validation for file size (e.g., 5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        return NextResponse.json({ error: `File size exceeds the limit of ${maxSize / (1024*1024)}MB.` }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate a unique filename to prevent overwrites and add extension
    const fileExtension = path.extname(file.name) || '.png'; // Default to .png if no extension
    const uniqueFilename = `${uuidv4()}${fileExtension}`;
    
    // Define the upload path. For development, saving to `public/uploads/images`
    // IMPORTANT: In production, use a persistent file storage solution (e.g., S3, Cloudinary).
    // Ensure the `public` directory exists at the root of your project.
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'images');
    const relativePath = `/uploads/images/${uniqueFilename}`; // Path to be stored/returned

    // Create the upload directory if it doesn't exist
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (mkdirError: any) {
      // Ignore EEXIST error (directory already exists), re-throw others
      if (mkdirError.code !== 'EEXIST') {
        console.error('[API upload-image] Error creating directory:', mkdirError);
        return NextResponse.json({ error: 'Failed to create upload directory.' }, { status: 500 });
      }
    }
    
    const filePath = path.join(uploadDir, uniqueFilename);

    await writeFile(filePath, buffer);
    console.log(`[API upload-image] File uploaded successfully to: ${filePath}`);

    return NextResponse.json({ success: true, url: relativePath });

  } catch (error) {
    console.error('[API upload-image] Error uploading file:', error);
    return NextResponse.json({ error: 'Error uploading file.', details: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const imageUrl = body.url;

    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json({ error: 'Image URL is required for deletion.' }, { status: 400 });
    }

    // Basic security check: Ensure the URL is relative and within our expected path
    if (!imageUrl.startsWith('/uploads/images/')) {
      console.warn(`[API upload-image DELETE] Attempt to delete invalid path: ${imageUrl}`);
      return NextResponse.json({ error: 'Invalid image path for deletion.' }, { status: 400 });
    }

    const filename = path.basename(imageUrl);
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'images');
    const filePath = path.join(uploadDir, filename);

    // Check if file exists before attempting to delete
    // Note: fs.promises.access can be used, but unlink handles non-existence gracefully by throwing an error.
    try {
      await fs.unlink(filePath); // Use fs from 'fs/promises'
      console.log(`[API upload-image DELETE] File deleted successfully: ${filePath}`);
      return NextResponse.json({ success: true, message: 'File deleted successfully.'});
    } catch (unlinkError: any) {
      if (unlinkError.code === 'ENOENT') { // File not found
        console.warn(`[API upload-image DELETE] File not found for deletion: ${filePath}`);
        return NextResponse.json({ error: 'File not found.' }, { status: 404 });
      }
      // Other errors (e.g., permissions)
      console.error(`[API upload-image DELETE] Error deleting file ${filePath}:`, unlinkError);
      return NextResponse.json({ error: 'Failed to delete file from server.' }, { status: 500 });
    }

  } catch (error) {
    console.error('[API upload-image DELETE] Error processing delete request:', error);
    return NextResponse.json({ error: 'Error processing delete request.' }, { status: 500 });
  }
} 