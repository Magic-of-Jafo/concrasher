import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { TalentProfileUpdateSchema } from '@/lib/validators';
import { z } from 'zod';

export async function GET(
    req: NextRequest,
    { params }: { params: { userId: string } }
) {
    try {
        const { userId } = params;

        if (!userId) {
            return new NextResponse('User ID is required', { status: 400 });
        }

        const talentProfile = await db.talentProfile.findUnique({
            where: {
                userId: userId,
            },
            include: {
                media: true, // Include the gallery media
            },
        });

        if (!talentProfile) {
            return new NextResponse('Talent profile not found', { status: 404 });
        }

        return NextResponse.json(talentProfile);
    } catch (error) {
        console.error('[TalentProfile_GET]', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: { userId: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const { userId } = params;
        const isOwner = userId === session.user.id;
        const isAdmin = session.user.roles?.includes('ADMIN');

        if (!isOwner && !isAdmin) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        const body = await req.json();
        const validatedData = TalentProfileUpdateSchema.parse(body);

        const updatedProfile = await db.talentProfile.update({
            where: {
                userId: userId,
            },
            data: validatedData,
        });

        return NextResponse.json(updatedProfile);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return new NextResponse(JSON.stringify(error.issues), { status: 400 });
        }

        console.error('[TalentProfile_PUT]', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
} 