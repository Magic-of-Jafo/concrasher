import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'You must be logged in to view your conventions' },
        { status: 401 }
      );
    }

    // Check if user is an organizer
    if (!session.user.roles?.includes(Role.ORGANIZER)) {
      return NextResponse.json(
        { error: 'You do not have permission to view this page' },
        { status: 403 }
      );
    }

    // Get all conventions for the organizer
    const conventions = await prisma.convention.findMany({
      where: {
        organizerUserId: session.user.id
      },
      orderBy: {
        startDate: 'desc'
      }
    });

    // Return just the conventions array
    return NextResponse.json(conventions);

  } catch (error) {
    console.error('Error fetching organizer conventions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conventions' },
      { status: 500 }
    );
  }
} 