import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { Role, ConventionStatus, Convention, ConventionSeries } from '@prisma/client';

// Define an extended Convention type that includes the series for responses
type ConventionWithSeries = Convention & {
  series?: ConventionSeries;
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    console.log("[API /api/organizer/conventions] Session object:", JSON.stringify(session, null, 2));

    if (!session?.user) {
      console.log("[API /api/organizer/conventions] No session user found, returning 401");
      return NextResponse.json(
        { error: 'You must be logged in to view your conventions' },
        { status: 401 }
      );
    }

    // Check if user is an organizer
    if (!session.user.roles?.includes(Role.ORGANIZER)) {
      console.log(`[API /api/organizer/conventions] User ${session.user.id} is not an organizer, returning 403`);
      return NextResponse.json(
        { error: 'You do not have permission to view this page' },
        { status: 403 }
      );
    }

    console.log(`[API /api/organizer/conventions] Processing GET request for user ID: ${session.user.id}`);

    let conventions: ConventionWithSeries[] = [];
    
    // If user is an admin, show all conventions
    if (session.user.roles?.includes(Role.ADMIN)) {
      conventions = await prisma.convention.findMany({
        where: {
          deletedAt: null,
        },
        orderBy: {
          startDate: 'desc'
        },
        include: {
          series: true
        }
      });
    } else {
      // First get all the series belonging to the user
      console.log(`[API /api/organizer/conventions] Fetching series for organizer user ID: ${session.user.id}`);
      const userSeries = await prisma.conventionSeries.findMany({
        where: {
          organizerUserId: session.user.id
        },
        select: {
          id: true
        }
      });
      console.log(`[API /api/organizer/conventions] Found userSeries:`, JSON.stringify(userSeries, null, 2));
      
      const seriesIds = userSeries.map(series => series.id);
      console.log(`[API /api/organizer/conventions] seriesIds for user ${session.user.id}:`, JSON.stringify(seriesIds, null, 2));
      
      // Then get all conventions belonging to those series
      if (seriesIds.length > 0) {
        conventions = await prisma.convention.findMany({
          where: {
            seriesId: {
              in: seriesIds
            },
            deletedAt: null,
          },
          orderBy: {
            startDate: 'desc'
          },
          include: {
            series: true
          }
        });
      } else {
        console.log(`[API /api/organizer/conventions] No series found for user ${session.user.id}, conventions will be empty.`);
      }
    }

    // Return the conventions array
    console.log(`[API /api/organizer/conventions] Returning ${conventions.length} conventions for user ${session.user.id}:`, JSON.stringify(conventions, null, 2));
    return NextResponse.json(conventions);

  } catch (error) {
    console.error('[API /api/organizer/conventions] Error fetching organizer conventions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conventions' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'You must be logged in to create a convention' },
        { status: 401 }
      );
    }

    if (!session.user.roles?.includes(Role.ORGANIZER)) {
      return NextResponse.json(
        { error: 'You do not have permission to create a convention' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      slug,
      startDate,
      endDate,
      description,
      websiteUrl,
      venueName,
      city,
      stateAbbreviation,
      stateName,
      country,
      type,
      seriesId,
    } = body;

    // Basic validation for required fields
    if (!name || !slug || !startDate || !endDate || !city || !country || !type || !seriesId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate date sequence
    if (new Date(startDate) >= new Date(endDate)) {
        return NextResponse.json(
            { error: 'Start date must be before end date' },
            { status: 400 }
        );
    }

    // Verify seriesId ownership if user is not an admin
    if (!session.user.roles.includes(Role.ADMIN)) {
      const series = await prisma.conventionSeries.findFirst({
        where: {
          id: seriesId,
          organizerUserId: session.user.id,
        },
      });
      if (!series) {
        return NextResponse.json(
          { error: 'Invalid series ID or you do not own this series' },
          { status: 403 }
        );
      }
    }

    const newConvention = await prisma.convention.create({
      data: {
        name,
        slug,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        description,
        websiteUrl,
        venueName,
        city,
        stateAbbreviation,
        stateName,
        country,
        type,
        seriesId,
        status: ConventionStatus.DRAFT, // Default to DRAFT status
      },
      include: {
        series: true, // Include series information in the response
      },
    });

    return NextResponse.json(newConvention, { status: 201 });

  } catch (error) {
    console.error('Error creating convention:', error);
    // Check for Prisma specific errors, e.g., unique constraint violation for slug
    if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        // Assuming 'slug' is the field causing the unique constraint violation
        // You might need to check error.meta.target to be sure
        return NextResponse.json(
            { error: 'A convention with this slug already exists.' },
            { status: 409 } // Conflict
        );
    }
    return NextResponse.json(
      { error: 'Failed to create convention' },
      { status: 500 }
    );
  }
} 