import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { Role, ConventionStatus } from '@prisma/client';
import { generateShortRandomId } from '@/lib/utils';

// Helper function to check ownership or admin status
async function authorizeAccess(userId: string, userRoles: Role[], conventionId: string): Promise<boolean> {
  const convention = await prisma.convention.findUnique({
    where: { id: conventionId },
    include: { series: true },
  });

  if (!convention) {
    return false; // Convention not found, access implicitly denied for operation
  }

  if (userRoles.includes(Role.ADMIN)) {
    return true; // Admins have access
  }

  // Organizers can only access their own conventions
  if (userRoles.includes(Role.ORGANIZER)) {
    if (convention.series?.organizerUserId === userId) {
      return true;
    }
  }
  return false;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Authorization check (also checks if convention exists indirectly)
  const hasAccess = await authorizeAccess(session.user.id, session.user.roles as Role[], params.id);
  if (!hasAccess) {
    // Attempt to fetch convention again just to give a 404 if it doesn't exist, vs 403 if it does but no access.
    const conventionExists = await prisma.convention.findFirst({ where: { id: params.id, deletedAt: null }});
    if (!conventionExists) {
        return NextResponse.json({ error: 'Convention not found or has been deleted' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const convention = await prisma.convention.findFirst({
      where: {
        id: params.id,
        deletedAt: null, // Ensure we don't fetch soft-deleted conventions
      },
      include: { // Optionally include series if needed by the edit form
        series: true,
      }
    });

    if (!convention) { // Should be caught by authorizeAccess, but as a fallback
      return NextResponse.json({ error: 'Convention not found or has been deleted' }, { status: 404 });
    }

    return NextResponse.json(convention);
  } catch (error) {
    console.error('Error fetching convention:', error);
    return NextResponse.json(
      { error: 'Failed to fetch convention' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Authorization check
  const hasAccess = await authorizeAccess(session.user.id, session.user.roles as Role[], params.id);
  if (!hasAccess) {
    const conventionExists = await prisma.convention.findFirst({ where: { id: params.id, deletedAt: null }});
    if (!conventionExists) {
        return NextResponse.json({ error: 'Convention not found or has been deleted' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
      status,
      seriesId
    } = body;

    // Validate required fields
    if (!name || !slug || !startDate || !endDate || !status || !city || !country || !seriesId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    if (start > end) {
      return NextResponse.json(
        { error: 'Start date must be before end date' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['DRAFT', 'PUBLISHED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Ensure convention is not soft-deleted before update, or handle as needed
    const existingConvention = await prisma.convention.findFirst({
        where: { id: params.id, deletedAt: null }
    });

    if (!existingConvention) {
        return NextResponse.json({ error: 'Convention not found or has been deleted, cannot update.' }, { status: 404 });
    }

    // Check for slug uniqueness if it has changed
    if (slug && slug !== existingConvention.slug) {
      const conflictingConvention = await prisma.convention.findFirst({
        where: {
          slug: slug,
          id: { not: params.id }, // Exclude the current convention
          deletedAt: null, // Only check against active conventions
        },
      });
      if (conflictingConvention) {
        return NextResponse.json(
          { error: 'Slug already in use by another convention. Please choose a unique slug.' },
          { status: 409 } // Conflict
        );
      }
    }
    
    // Basic slug format validation (already in Zod, but a light check here is fine)
    if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        return NextResponse.json(
            { error: 'Invalid slug format. Slug must be lowercase alphanumeric with hyphens and no spaces.' },
            { status: 400 }
        );
    }

    const updatedConventionData: any = {
      name,
      description,
      startDate: start,
      endDate: end,
      city,
      stateAbbreviation,
      stateName,
      country,
      venueName,
      status,
      seriesId,
    };

    if (slug) {
      updatedConventionData.slug = slug;
    }

    const convention = await prisma.convention.update({
      where: {
        id: params.id,
      },
      data: updatedConventionData,
    });

    // After successfully updating the convention, update its series' updatedAt timestamp
    if (convention && convention.seriesId) {
      await prisma.conventionSeries.update({
        where: { id: convention.seriesId },
        data: { updatedAt: new Date() },
      });
    }

    return NextResponse.json(convention);
  } catch (error) {
    console.error('Error updating convention:', error);
    return NextResponse.json(
      { error: 'Failed to update convention' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request, // request object might not be used but is standard for handlers
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Authorization check
  const hasAccess = await authorizeAccess(session.user.id, session.user.roles as Role[], params.id);
  if (!hasAccess) {
    const conventionExists = await prisma.convention.findUnique({ where: { id: params.id } });
    if (!conventionExists) {
        return NextResponse.json({ error: 'Convention not found' }, { status: 404 });
    }
    if (conventionExists.deletedAt) {
        return NextResponse.json({ error: 'Convention already deleted' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const conventionToMarkDeleted = await prisma.convention.findFirst({
      where: {
        id: params.id,
        deletedAt: null, 
      },
    });

    if (!conventionToMarkDeleted) {
      return NextResponse.json(
        { error: 'Convention not found or already deleted' },
        { status: 404 }
      );
    }

    const newSlug = `${conventionToMarkDeleted.slug}-DELETED-${Date.now().toString(36)}-${generateShortRandomId(8)}`;

    await prisma.convention.update({
      where: {
        id: params.id,
      },
      data: {
        deletedAt: new Date(),
        slug: newSlug,
      },
    });

    return NextResponse.json({ message: 'Convention deleted successfully' }, { status: 200 });

  } catch (error) {
    console.error('Error deleting convention:', error);
    return NextResponse.json(
      { error: 'Failed to delete convention' },
      { status: 500 }
    );
  }
}

// PATCH handler for partial updates, specifically for status
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Authorization check
  const hasAccess = await authorizeAccess(session.user.id, session.user.roles as Role[], params.id);
  if (!hasAccess) {
    const conventionExists = await prisma.convention.findFirst({ where: { id: params.id, deletedAt: null }});
    if (!conventionExists) {
        return NextResponse.json({ error: 'Convention not found or has been deleted' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { error: 'Missing status in request body' },
        { status: 400 }
      );
    }

    // Validate status enum
    const validStatuses = Object.values(ConventionStatus);
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      );
    }

    // Ensure convention is not soft-deleted before update
    const existingConvention = await prisma.convention.findFirst({
        where: { id: params.id, deletedAt: null }
    });

    if (!existingConvention) {
        return NextResponse.json({ error: 'Convention not found or has been deleted, cannot update status.' }, { status: 404 });
    }

    // Additional validation for specific status transitions can be added here if needed
    // For example, ensuring a convention has required fields before being set to PUBLISHED
    // if (status === 'PUBLISHED') {
    //   if (!existingConvention.description || !existingConvention.venueName /* other checks */) {
    //     return NextResponse.json(
    //       { error: 'Cannot publish convention: missing required details.' },
    //       { status: 400 }
    //     );
    //   }
    // }

    const updatedConvention = await prisma.convention.update({
      where: {
        id: params.id,
      },
      data: {
        status: status,
        // updatedAt is automatically handled by Prisma
      },
    });

    // After successfully updating the convention's status, update its series' updatedAt timestamp
    if (updatedConvention && updatedConvention.seriesId) {
      await prisma.conventionSeries.update({
        where: { id: updatedConvention.seriesId },
        data: { updatedAt: new Date() },
      });
    }

    return NextResponse.json(updatedConvention);
  } catch (error) {
    console.error('Error updating convention status:', error);
    // Check for Prisma specific errors if necessary, e.g., P2025 (Record not found)
    return NextResponse.json(
      { error: 'Failed to update convention status' },
      { status: 500 }
    );
  }
} 