import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: userId, roles } = session.user as { id: string; roles: Role[] };

  let userRoleForQuery: Role | null = null;

  if (roles.includes(Role.ADMIN)) {
    userRoleForQuery = Role.ADMIN;
  } else if (roles.includes(Role.ORGANIZER)) {
    userRoleForQuery = Role.ORGANIZER;
  } else {
    return NextResponse.json({ error: 'Forbidden: User does not have required role' }, { status: 403 });
  }

  try {
    let conventions;
    if (userRoleForQuery === Role.ADMIN) {
      conventions = await prisma.convention.findMany({
        orderBy: { createdAt: 'desc' },
        // No deletedAt filter here, fetching all
      });
    } else { // Must be ORGANIZER if not ADMIN due to earlier check
      conventions = await prisma.convention.findMany({
        where: {
          series: { organizerUserId: userId },
        },
        orderBy: { createdAt: 'desc' },
        // No deletedAt filter here, fetching all for this organizer
      });
    }
    return NextResponse.json({ conventions });
  } catch (error) {
    console.error('Error fetching all conventions:', error);
    return NextResponse.json({ error: 'Failed to fetch conventions' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !(session.user.roles?.includes(Role.ORGANIZER) || session.user.roles?.includes(Role.ADMIN))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      name,
      slug,
      description,
      startDate,
      endDate,
      city,
      stateAbbreviation,
      stateName,
      country,
      venueName,
      seriesId,
      status = 'DRAFT', // Default to DRAFT if not provided
    } = body;

    // Validate required fields
    if (!name || !slug || !startDate || !endDate || !seriesId || !city || !country) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Basic slug format validation (Zod in form handles stricter rules)
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        return NextResponse.json(
            { error: 'Invalid slug format. Slug must be lowercase alphanumeric with hyphens and no spaces.' },
            { status: 400 }
        );
    }

    // Check for slug uniqueness
    const existingBySlug = await prisma.convention.findFirst({
      where: { slug: slug, deletedAt: null },
    });

    if (existingBySlug) {
      return NextResponse.json(
        { error: 'Slug already in use. Please choose a unique slug.' },
        { status: 409 } // Conflict
      );
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }
    if (start > end) {
      return NextResponse.json({ error: 'Start date must be before end date' }, { status: 400 });
    }

    const newConvention = await prisma.convention.create({
      data: {
        name,
        slug,
        description,
        startDate: start,
        endDate: end,
        city,
        stateAbbreviation,
        stateName,
        country,
        venueName,
        seriesId,
        status,
      },
    });

    // After successfully creating the convention, update its series' updatedAt timestamp
    if (newConvention && seriesId) {
      await prisma.conventionSeries.update({
        where: { id: seriesId },
        data: { updatedAt: new Date() },
      });
    }

    return NextResponse.json(newConvention, { status: 201 });
  } catch (error) {
    console.error('Error creating convention:', error);
    // Check for Prisma unique constraint violation if slug check somehow missed (e.g., race condition or deletedAt was involved)
    if (error instanceof Error && error.message.includes('Unique constraint failed') && error.message.includes('slug')) {
        return NextResponse.json(
            { error: 'Slug already in use. Please choose a unique slug.' }, 
            { status: 409 }
        );
    }
    return NextResponse.json({ error: 'Failed to create convention' }, { status: 500 });
  }
} 