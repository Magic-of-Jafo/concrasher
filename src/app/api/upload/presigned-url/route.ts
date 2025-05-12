import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

const PresignedUrlRequestSchema = z.object({
  fileName: z.string(),
  fileType: z.string(),
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const validation = PresignedUrlRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: 'Invalid request body', errors: validation.error.format() },
        { status: 400 }
      );
    }

    const { fileName, fileType } = validation.data;

    // For now, we'll use a simple URL structure
    // In a production environment, you would integrate with a cloud storage service
    // like AWS S3, Google Cloud Storage, etc.
    const key = `uploads/${Date.now()}-${fileName}`;
    const url = `${process.env.NEXT_PUBLIC_UPLOAD_URL}/${key}`;

    return NextResponse.json({ url, key });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json(
      { message: 'Failed to generate presigned URL' },
      { status: 500 }
    );
  }
} 