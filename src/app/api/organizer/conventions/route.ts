import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { Role, ConventionStatus, Convention, ConventionSeries } from '@prisma/client';

// Define an extended Convention type that includes the series for responses
type ConventionWithSeries = Convention & {
  series?: ConventionSeries | null;
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
      isOneDayEvent,
      isTBD,
      descriptionShort,
      descriptionMain,
      websiteUrl,
      venueName,
      city,
      stateAbbreviation,
      stateName,
      country,
      seriesId,
    } = body;

    // Basic validation for required fields.
    // The slug is generated client-side and passed in.
    if (!name || !slug || !seriesId) {
      return NextResponse.json(
        { error: 'Missing required fields: name, slug, and seriesId are required.' },
        { status: 400 }
      );
    }

    // Date handling and conditional validation
    let finalStartDate: Date | null = startDate ? new Date(startDate) : null;
    let finalEndDate: Date | null = endDate ? new Date(endDate) : null;

    if (!isTBD) {
      // If not TBD, then startDate and endDate from body are expected to be valid dates.
      if (!finalStartDate || !finalEndDate) {
        return NextResponse.json(
          { error: 'startDate and endDate are required and must be valid dates if isTBD is false.' },
          { status: 400 }
        );
      }

      // For one-day events, ensure end date matches start date
      if (isOneDayEvent && finalStartDate) {
        finalEndDate = finalStartDate;
      }

      // Perform date sequence validation only if not TBD
      if (finalStartDate >= finalEndDate && !isOneDayEvent) {
        return NextResponse.json(
          { error: 'Start date must be before end date for multi-day events.' },
          { status: 400 }
        );
      }
    } else {
      // If isTBD is true, client should have already set isOneDayEvent to false.
      // We ensure it here for data integrity if client didn't.
      // Dates sent by client (even if TBD) are preserved in finalStartDate/finalEndDate for DB storage.
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

    const newConventionData: any = {
      name,
      slug,
      startDate: finalStartDate, // Will be null if body's startDate was null, or actual date
      endDate: finalEndDate,   // Will be null if body's endDate was null, or actual date
      isOneDayEvent: isTBD ? false : isOneDayEvent, // If TBD, it cannot be a one-day event
      isTBD,
      descriptionShort: descriptionShort,
      descriptionMain: descriptionMain,
      websiteUrl,
      venueName,
      city,
      stateAbbreviation,
      stateName,
      country,
      seriesId,
      status: ConventionStatus.DRAFT,
    };

    // Ensure optional fields are not set to undefined if they are missing in body, prisma handles missing fields as undefined by default
    // For example, if websiteUrl is not in body, newConventionData.websiteUrl will be undefined, which is fine.

    const newConvention = await prisma.convention.create({
      data: newConventionData,
      include: {
        series: true,
      },
    });

    return NextResponse.json(newConvention, { status: 201 });

  } catch (error) {
    console.error('Error creating convention:', error);
    if (error instanceof Error && 'code' in error && (error as any).code === 'P2002') {
      // Check for unique constraint on slug. Adjust if other fields are unique.
      const target = (error as any).meta?.target;
      if (target && target.includes('slug')) {
        return NextResponse.json(
          { error: 'A convention with this slug already exists.' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'A unique constraint violation occurred.' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create convention' },
      { status: 500 }
    );
  }
} 