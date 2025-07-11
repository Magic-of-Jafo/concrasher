import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import mime from 'mime-types';
import { rmdir } from 'fs/promises';

async function deleteUserDirectoryIfExists(userId: string) {
    const dir = join(process.cwd(), 'public', 'uploads', 'users', userId, 'profile');
    try {
        await rmdir(dir, { recursive: true });
    } catch (error: any) {
        if (error.code !== 'ENOENT') { // ENOENT means directory doesn't exist, which is fine
            console.error(`[UserProfileUpload] Error deleting directory ${dir}:`, error);
        }
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

        await deleteUserDirectoryIfExists(userId);

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const extension = mime.extension(file.type) || 'png';
        const filename = `${uuidv4()}.${extension}`;

        const dir = join(process.cwd(), 'public', 'uploads', 'users', userId, 'profile');
        await mkdir(dir, { recursive: true });
        await writeFile(join(dir, filename), buffer);

        const url = `/uploads/users/${userId}/profile/${filename}`;

        return NextResponse.json({ success: true, url: url });
    } catch (error) {
        console.error('[UserProfileUpload] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
} 