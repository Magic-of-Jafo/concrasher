import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { Role, ConventionStatus, Prisma } from '@prisma/client';
import { generateShortRandomId } from '@/lib/utils';

// Helper function to process a single photo for a venue or hotel
async function processPhotos(
  entityId: string,
  incomingPhotosData: any[] | undefined, // Expects an array from Zod, max 1 item
  prismaPhotoDelegate: any, // e.g., prisma.venuePhoto or prisma.hotelPhoto
  foreignKeyField: 'venueId' | 'hotelId' // The field name on the photo table linking to the parent
) {
  const photoData = incomingPhotosData && incomingPhotosData.length > 0 ? incomingPhotosData[0] : null;

  if (photoData && photoData.url) {
    // If new photo data is provided (url is mandatory)
    const photoPayload = {
      url: photoData.url,
      caption: photoData.caption || null,
    };

    // Delete all existing photos for this entity EXCEPT the one we might be updating
    await prismaPhotoDelegate.deleteMany({
      where: {
        [foreignKeyField]: entityId,
        NOT: { id: photoData.id || undefined }, // Don't delete the photo if we're about to update it
      },
    });

    // Upsert the new/updated photo
    await prismaPhotoDelegate.upsert({
      where: { id: photoData.id || generateShortRandomId() }, // Use existing ID or a new one for creation
      create: {
        ...photoPayload,
        [foreignKeyField]: entityId, // Link to parent entity
      },
      update: photoPayload,
    });
  } else {
    // No photo data provided or URL is missing, so remove all existing photos for this entity
    await prismaPhotoDelegate.deleteMany({
      where: { [foreignKeyField]: entityId },
    });
  }
}

// Helper function to check ownership or admin status
async function authorizeAccess(userId: string, userRoles: Role[], conventionId: string): Promise<boolean> {
  if (userRoles.includes(Role.ADMIN)) {
    return true; // Admins ALWAYS have access
  }

  // From here, we are dealing with a non-admin, so we check for ownership.
  const convention = await prisma.convention.findFirst({
    where: {
      id: conventionId,
      deletedAt: null,
    },
    include: { series: true },
  });

  if (!convention) {
    return false; // Convention not found, access implicitly denied for operation
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
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log(`[API GET /organizer/conventions/:id] -- Attempting to fetch convention with ID: ${params.id}`);
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Authorization check (also checks if convention exists indirectly)
  const hasAccess = await authorizeAccess(session.user.id, session.user.roles as Role[], params.id);
  if (!hasAccess) {
    // Attempt to fetch convention again just to give a 404 if it doesn't exist, vs 403 if it does but no access.
    const conventionExists = await prisma.convention.findFirst({ where: { id: params.id, deletedAt: null } });
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
        venues: true, // Include venues
        hotels: true, // Include hotels
        media: true, // Include media
      }
    });

    if (!convention) { // Should be caught by authorizeAccess, but as a fallback
      return NextResponse.json({ error: 'Convention not found or has been deleted' }, { status: 404 });
    }

    return NextResponse.json(convention);
  } catch (error) {
    console.error('[API GET /organizer/conventions/:id] Error fetching convention:', error);
    return NextResponse.json(
      { error: 'Failed to fetch convention' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const hasAccess = await authorizeAccess(session.user.id, session.user.roles as Role[], params.id);
  if (!hasAccess) {
    const conventionExists = await prisma.convention.findFirst({ where: { id: params.id, deletedAt: null } });
    if (!conventionExists) {
      return NextResponse.json({ error: 'Convention not found or has been deleted' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const conventionId = params.id;

  try {
    const body = await request.json();
    console.log(`[API PUT /organizer/conventions/${conventionId}] Received body:`, JSON.stringify(body, null, 2));
    const {
      venues: incomingVenues,
      hotels: incomingHotels,
      name,
      slug,
      startDate: rawStartDate,
      endDate: rawEndDate,
      city,
      stateAbbreviation,
      stateName,
      country,
      status,
      seriesId,
      descriptionShort,
      descriptionMain,
      websiteUrl,
      registrationUrl,
      isOneDayEvent,
      isTBD,
      priceTiers,
      priceDiscounts,
      coverImageUrl,
      profileImageUrl
    } = body;

    // Check if this is an image-only update
    const isImageOnlyUpdate = (coverImageUrl !== undefined || profileImageUrl !== undefined) &&
      Object.keys(body).length <= 2 && // Only cover/profile image fields
      !incomingVenues && !name && !slug; // No other major fields

    const allVenuesFromRequest = incomingVenues || [];
    console.log('[API] Parsed allVenuesFromRequest:', JSON.stringify(allVenuesFromRequest, null, 2));
    let primaryVenueData = allVenuesFromRequest.find((v: any) => v.isPrimaryVenue);
    let secondaryVenuesData = allVenuesFromRequest.filter((v: any) => !v.isPrimaryVenue);

    const guestsStayAtPrimaryVenue = body.guestsStayAtPrimaryVenue;

    // --- Process Venue Promotion ---
    const promotedVenueIndex = secondaryVenuesData.findIndex(
      (v: { markedForPrimaryPromotion?: boolean }) => v.markedForPrimaryPromotion === true
    );

    if (promotedVenueIndex > -1) {
      const promotedVenue = { ...secondaryVenuesData[promotedVenueIndex] };
      promotedVenue.isPrimaryVenue = true;
      promotedVenue.markedForPrimaryPromotion = false; // Reset flag

      // Demote current primary venue if it exists
      if (primaryVenueData && primaryVenueData.id) { // Check ID to ensure it's an existing venue
        const demotedPrimary = { ...primaryVenueData, isPrimaryVenue: false };
        secondaryVenuesData.push(demotedPrimary);
      }

      // Set new primary venue
      primaryVenueData = promotedVenue;

      // Remove promoted venue from secondary list
      secondaryVenuesData.splice(promotedVenueIndex, 1);
    }
    // --- End Process Venue Promotion ---

    // --- Main Transaction ---
    const updatedConvention = await prisma.$transaction(async (tx) => {
      const conventionUpdatePayload: Prisma.ConventionUpdateInput = {
        name, slug, city, stateAbbreviation, stateName, country, status,
        descriptionShort, descriptionMain, isOneDayEvent, isTBD,
        websiteUrl, registrationUrl,
        guestsStayAtPrimaryVenue,
        updatedAt: new Date(),
      };

      if (seriesId) {
        conventionUpdatePayload.series = { connect: { id: seriesId } };
      }
      if (coverImageUrl !== undefined) conventionUpdatePayload.coverImageUrl = coverImageUrl;
      if (profileImageUrl !== undefined) conventionUpdatePayload.profileImageUrl = profileImageUrl;

      // Step 1: Update the core convention details
      const convention = await tx.convention.update({
        where: { id: conventionId },
        data: conventionUpdatePayload,
      });

      // Step 2: Handle Venues
      if (incomingVenues) {
        const incomingVenueIds = allVenuesFromRequest.map((v: any) => v.id).filter(Boolean);

        // Delete venues that are no longer present
        await tx.venue.deleteMany({
          where: {
            conventionId: conventionId,
            id: { notIn: incomingVenueIds },
          },
        });

        // Upsert all venues from the request
        for (const venueData of allVenuesFromRequest) {
          const venuePayload: any = {
            venueName: venueData.venueName,
            isPrimaryVenue: venueData.isPrimaryVenue,
            description: venueData.description,
            websiteUrl: venueData.websiteUrl,
            googleMapsUrl: venueData.googleMapsUrl,
            streetAddress: venueData.streetAddress,
            city: venueData.city,
            stateRegion: venueData.stateRegion,
            postalCode: venueData.postalCode,
            country: venueData.country,
            contactEmail: venueData.contactEmail,
            contactPhone: venueData.contactPhone,
            parkingInfo: venueData.parkingInfo,
            publicTransportInfo: venueData.publicTransportInfo,
            overallAccessibilityNotes: venueData.overallAccessibilityNotes,
            amenities: venueData.amenities,
            convention: { connect: { id: conventionId } },
          };

          console.log(`[API] Upserting venue with payload:`, JSON.stringify(venuePayload, null, 2));

          const upsertedVenue = await tx.venue.upsert({
            where: { id: venueData.id || generateShortRandomId() },
            create: venuePayload,
            update: venuePayload,
          });

          // Process photos for the venue
          await processPhotos(upsertedVenue.id, venueData.photos, tx.venuePhoto, 'venueId');
        }
      }

      // Step 3: Handle Hotels
      if (incomingHotels) {
        const incomingHotelIds = incomingHotels.map((h: any) => h.id).filter(Boolean);

        // Delete hotels that are no longer present
        await tx.hotel.deleteMany({
          where: {
            conventionId: conventionId,
            id: { notIn: incomingHotelIds },
          },
        });

        // Upsert all hotels from the request
        for (const hotelData of incomingHotels) {
          const hotelPayload: any = {
            hotelName: hotelData.hotelName,
            isPrimaryHotel: hotelData.isPrimaryHotel,
            description: hotelData.description,
            websiteUrl: hotelData.websiteUrl,
            googleMapsUrl: hotelData.googleMapsUrl,
            streetAddress: hotelData.streetAddress,
            city: hotelData.city,
            stateRegion: hotelData.stateRegion,
            postalCode: hotelData.postalCode,
            country: hotelData.country,
            contactEmail: hotelData.contactEmail,
            contactPhone: hotelData.contactPhone,
            parkingInfo: hotelData.parkingInfo,
            amenities: hotelData.amenities,
            bookingLink: hotelData.bookingLink,
            groupPrice: hotelData.groupPrice,
            bookingCutoffDate: hotelData.bookingCutoffDate,
            groupRateOrBookingCode: hotelData.groupRateOrBookingCode,
            convention: { connect: { id: conventionId } },
          };

          const upsertedHotel = await tx.hotel.upsert({
            where: { id: hotelData.id || generateShortRandomId() },
            create: hotelPayload,
            update: hotelPayload,
          });

          // Process photos for the hotel
          await processPhotos(upsertedHotel.id, hotelData.photos, tx.hotelPhoto, 'hotelId');
        }
      }

      return convention;
    });


    return NextResponse.json(updatedConvention);

  } catch (error) {
    console.error(`[API PUT /organizer/conventions/:id] Error updating convention ${conventionId}:`, error);
    return NextResponse.json(
      { error: 'Failed to update convention', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Authorization check
  const hasAccess = await authorizeAccess(session.user.id, session.user.roles as Role[], params.id);
  if (!hasAccess) {
    const conventionExists = await prisma.convention.findFirst({ where: { id: params.id, deletedAt: null } });
    if (!conventionExists) {
      return NextResponse.json({ error: 'Convention not found or has been deleted' }, { status: 404 });
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
    console.error('[API DELETE /organizer/conventions/:id] Error deleting convention:', error);
    return NextResponse.json(
      { error: 'Failed to delete convention' },
      { status: 500 }
    );
  }
}

// PATCH handler for partial updates, specifically for status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Authorization check
  const hasAccess = await authorizeAccess(session.user.id, session.user.roles as Role[], params.id);
  if (!hasAccess) {
    const conventionExists = await prisma.convention.findFirst({ where: { id: params.id, deletedAt: null } });
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
        updatedAt: new Date(), // Explicitly set updatedAt on status change
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
    console.error('[API PATCH /organizer/conventions/:id] Error updating convention status:', error);
    // Check for Prisma specific errors if necessary, e.g., P2025 (Record not found)
    return NextResponse.json(
      { error: 'Failed to update convention status' },
      { status: 500 }
    );
  }
} 