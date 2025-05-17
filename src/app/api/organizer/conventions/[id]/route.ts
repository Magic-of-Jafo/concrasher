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
      include: { 
        series: true,
        priceTiers: true, // Include PriceTiers
        priceDiscounts: true, // Include PriceDiscounts (though these are more complex to load directly)
                              // Consider if PriceDiscounts should be a separate fetch or structured differently
                              // For now, including them to see if it works for the page load.
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
      startDate: rawStartDate,
      endDate: rawEndDate,
      city,
      stateAbbreviation,
      stateName,
      country,
      venueName,
      status,
      seriesId,
      descriptionShort,
      descriptionMain,
      isOneDayEvent,
      isTBD
    } = body;

    let finalStartDate: Date | null = null;
    let finalEndDate: Date | null = null;
    let finalIsOneDayEvent = isOneDayEvent;

    // Date handling logic (isTBD, rawStartDate, rawEndDate validation)
    if (isTBD) {
      finalStartDate = rawStartDate ? new Date(rawStartDate) : null;
      finalEndDate = rawEndDate ? new Date(rawEndDate) : null;
      if (finalStartDate && isNaN(finalStartDate.getTime())) {
        return NextResponse.json({ error: 'Invalid start date format when TBD' }, { status: 400 });
      }
      if (finalEndDate && isNaN(finalEndDate.getTime())) {
        return NextResponse.json({ error: 'Invalid end date format when TBD' }, { status: 400 });
      }
      if (finalStartDate && finalEndDate && finalStartDate > finalEndDate) {
         return NextResponse.json({ error: 'Start date must be before end date, even if TBD' }, { status: 400 });
      }
      finalIsOneDayEvent = false;
    } else {
      if (!rawStartDate || !rawEndDate) {
        return NextResponse.json(
          { error: 'Start date and end date are required when not TBD' },
          { status: 400 }
        );
      }
      finalStartDate = new Date(rawStartDate);
      finalEndDate = new Date(rawEndDate);

      if (isNaN(finalStartDate.getTime()) || isNaN(finalEndDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date format' },
          { status: 400 }
        );
      }
      if (finalStartDate > finalEndDate) {
        return NextResponse.json(
          { error: 'Start date must be before end date' },
          { status: 400 }
        );
      }
      if (finalIsOneDayEvent) {
        finalEndDate = finalStartDate;
      }
    }

    // --- New Validation Logic ---
    if (!seriesId) { // seriesId is always critical for linking to an organizer
      return NextResponse.json({ error: 'Series ID is required for an update.' }, { status: 400 });
    }

    // Validate 'name' if provided in the body
    if (body.hasOwnProperty('name')) {
      if (typeof name !== 'string' || name.trim() === '') {
        return NextResponse.json({ error: 'Convention name, if provided, cannot be empty.' }, { status: 400 });
      }
    } else {
      // If name is not in the body, this implies an update where name is not being changed.
      // This is acceptable for a PUT if other fields are being updated.
      // However, BasicInfoTab should always send it. If it's missing, it might be an issue with client data.
      // For now, we allow PUT if name is not in body, Prisma won't update it.
    }

    // Validate 'slug' if provided in the body
    if (body.hasOwnProperty('slug')) {
      if (typeof slug !== 'string' || slug.trim() === '') {
        return NextResponse.json({ error: 'Convention slug, if provided, cannot be empty.' }, { status: 400 });
      }
      // Basic slug format validation (already in Zod, but a light check here is fine)
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        return NextResponse.json(
            { error: 'Invalid slug format. Slug must be lowercase alphanumeric with hyphens and no spaces.' },
            { status: 400 }
        );
      }
    }
    // Similar logic for slug as for name: if not in body, Prisma won't update it.

    // Validate 'status' ONLY IF IT IS PROVIDED in the request body.
    if (body.hasOwnProperty('status')) {
      const validStatuses = Object.values(ConventionStatus); // Use Prisma enum values
      if (typeof status !== 'string' || !validStatuses.includes(status as ConventionStatus)) {
        return NextResponse.json(
          { error: `Invalid status value provided. Must be one of: ${validStatuses.join(', ')}.` },
          { status: 400 }
        );
      }
    }
    // --- End of New Validation Logic ---

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
    
    const updatedConventionData: any = {
      name,
      startDate: finalStartDate,
      endDate: finalEndDate,
      city,
      stateAbbreviation,
      stateName,
      country,
      venueName,
      status,
      seriesId,
      descriptionShort,
      descriptionMain,
      isOneDayEvent: finalIsOneDayEvent,
      isTBD,
      ...(slug && slug !== existingConvention.slug && { slug }),
    };

    const updatedConvention = await prisma.convention.update({
      where: {
        id: params.id,
      },
      data: updatedConventionData,
    });

    // After successfully updating the convention, update its series' updatedAt timestamp
    if (updatedConvention && updatedConvention.seriesId) {
      await prisma.conventionSeries.update({
        where: { id: updatedConvention.seriesId },
        data: { updatedAt: new Date() },
      });
    }

    return NextResponse.json(updatedConvention);
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