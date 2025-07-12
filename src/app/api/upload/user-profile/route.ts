import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import mime from 'mime-types';

// Configure the S3 client
const s3Client = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME!;

/**
 * Deletes all objects in the user's profile picture directory in S3.
 * This ensures that when a new profile picture is uploaded, the old one is removed.
 * @param userId The ID of the user whose profile picture directory should be cleared.
 */
async function deleteOldS3ProfilePicture(userId: string) {
    const prefix = `uploads/users/${userId}/profile/`;

    try {
        // List all objects in the directory
        const listCommand = new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            Prefix: prefix,
        });
        const listedObjects = await s3Client.send(listCommand);

        if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
            return; // No objects to delete
        }

        // Prepare the delete command
        const deleteParams = {
            Bucket: BUCKET_NAME,
            Delete: {
                Objects: listedObjects.Contents.map(({ Key }) => ({ Key })),
            },
        };

        const deleteCommand = new DeleteObjectsCommand(deleteParams);
        await s3Client.send(deleteCommand);
        console.log(`[UserProfileUpload] Successfully deleted old profile pictures for user ${userId}`);
    } catch (error) {
        console.error(`[UserProfileUpload] Error deleting old profile pictures for user ${userId}:`, error);
        // Do not re-throw, as failing to delete the old image should not block uploading a new one.
    }
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    try {
        const data = await request.formData();
        const file: File | null = data.get('file') as unknown as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // 1. Delete the old profile picture(s) from S3
        await deleteOldS3ProfilePicture(userId);

        // 2. Prepare the new file for upload
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const extension = mime.extension(file.type) || 'png';
        const filename = `${uuidv4()}.${extension}`;
        const key = `uploads/users/${userId}/profile/${filename}`;

        // 3. Upload the new file to S3
        const putCommand = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: buffer,
            ContentType: file.type,
        });

        await s3Client.send(putCommand);

        // 4. Construct the public URL and return it
        const url = `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`;

        return NextResponse.json({ success: true, url: url });
    } catch (error) {
        console.error('[UserProfileUpload] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
} 