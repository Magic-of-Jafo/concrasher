import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(
    request: NextRequest,
    { params }: { params: { seriesId: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { seriesId } = params;

        // Check if the series exists and if the current user is the organizer
        const series = await prisma.conventionSeries.findUnique({
            where: { id: seriesId },
            select: { organizerUserId: true }
        });

        if (!series) {
            return NextResponse.json({ error: 'Series not found' }, { status: 404 });
        }

        const isOwner = series.organizerUserId === session.user.id;

        return NextResponse.json({ isOwner });
    } catch (error) {
        console.error('Error checking series ownership:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 