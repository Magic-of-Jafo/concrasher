import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
    request: NextRequest,
    { params }: { params: { slug: string } }
) {
    try {
        const convention = await prisma.convention.findUnique({
            where: {
                slug: params.slug,
                deletedAt: null,
            },
            select: {
                id: true,
                name: true,
                slug: true,
                status: true,
                startDate: true,
                endDate: true,
                isTBD: true,
                isOneDayEvent: true,
                city: true,
                stateAbbreviation: true,
                stateName: true,
                country: true,
                venueName: true,
                descriptionMain: true,
                descriptionShort: true,
                coverImageUrl: true,
                profileImageUrl: true,
                websiteUrl: true,
                registrationUrl: true,

                createdAt: true,
                updatedAt: true,
            },
        });

        if (!convention) {
            return NextResponse.json(
                { error: 'Convention not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(convention);
    } catch (error) {
        console.error('Error fetching convention:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 