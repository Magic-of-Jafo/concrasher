import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }



        // Check if user already has a talent profile
        const existingProfile = await db.talentProfile.findUnique({
            where: { userId: session.user.id },
        });

        if (existingProfile) {
            return new NextResponse('User already has a talent profile', {
                status: 409,
            });
        }

        // Create a new talent profile with default values
        const newProfile = await db.talentProfile.create({
            data: {
                userId: session.user.id,
                displayName: session.user.name || 'Talent',
                tagline: '',
                bio: '',
                profilePictureUrl: '',
                websiteUrl: '',
                contactEmail: '',
                skills: [],
            },
        });

        return NextResponse.json(newProfile, { status: 201 });
    } catch (error) {
        console.error('[TalentProfile_Initialize_POST]', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
} 