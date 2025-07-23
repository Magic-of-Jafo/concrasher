import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { TalentProfileCreateSchema } from '@/lib/validators';
import { z } from 'zod';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }



        const existingProfile = await db.talentProfile.findUnique({
            where: { userId: session.user.id },
        });

        if (existingProfile) {
            return new NextResponse('Forbidden: User already has a talent profile', {
                status: 403,
            });
        }

        const body = await req.json();
        const validatedData = TalentProfileCreateSchema.parse(body);

        const newProfile = await db.talentProfile.create({
            data: {
                ...validatedData,
                userId: session.user.id,
            },
        });

        return NextResponse.json(newProfile, { status: 201 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return new NextResponse(JSON.stringify(error.issues), { status: 400 });
        }

        console.error('[TalentProfile_POST]', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '20', 10);

        const skip = (page - 1) * limit;

        const [profiles, total] = await db.$transaction([
            db.talentProfile.findMany({
                skip,
                take: limit,
                orderBy: {
                    updatedAt: 'desc',
                },
            }),
            db.talentProfile.count(),
        ]);

        return NextResponse.json({
            data: profiles,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('[TalentProfiles_GET]', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
} 