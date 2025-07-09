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
    const {
      venueHotel,
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
      !venueHotel && !name && !slug; // No other major fields

    let primaryVenueData = venueHotel?.primaryVenue;
    let secondaryVenuesData = venueHotel?.secondaryVenues || [];
    const guestsStayAtPrimaryVenue = venueHotel?.guestsStayAtPrimaryVenue;
    const primaryHotelDetailsFromRequest = venueHotel?.primaryHotelDetails;
    const additionalHotelsFromRequest = venueHotel?.hotels || [];


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

    // Build update data based on what's being updated
    const conventionDataForUpdate: any = {
      updatedAt: new Date(),
    };

    if (isImageOnlyUpdate) {
      // For image-only updates, only include the image fields
      if (coverImageUrl !== undefined) {
        conventionDataForUpdate.coverImageUrl = coverImageUrl;
      }
      if (profileImageUrl !== undefined) {
        conventionDataForUpdate.profileImageUrl = profileImageUrl;
      }
      // Update the convention with only the image URLs
      const updatedConvention = await prisma.convention.update({
        where: { id: conventionId },
        data: conventionDataForUpdate,
      });
      return NextResponse.json(updatedConvention);
    }

    // For full updates, include all fields
    Object.assign(conventionDataForUpdate, {
      name, slug, city, stateAbbreviation, stateName, country, status, seriesId,
      descriptionShort, descriptionMain, isOneDayEvent, isTBD,
      websiteUrl, registrationUrl,
      guestsStayAtPrimaryVenue,
    });

    // Add cover and profile image URLs if provided
    if (coverImageUrl !== undefined) {
      conventionDataForUpdate.coverImageUrl = coverImageUrl;
    }
    if (profileImageUrl !== undefined) {
      conventionDataForUpdate.profileImageUrl = profileImageUrl;
    }

    if (!isImageOnlyUpdate) {
      const startDate = rawStartDate ? new Date(rawStartDate) : null;
      const endDate = rawEndDate ? new Date(rawEndDate) : null;
      conventionDataForUpdate.startDate = startDate;
      conventionDataForUpdate.endDate = endDate;
    }

    const updatedConvention = await prisma.$transaction(async (tx) => {
      // Step 1: Update the core convention details
      await tx.convention.update({
        where: { id: conventionId },
        data: conventionDataForUpdate,
      });

      // Step 2: Handle Primary Venue (Upsert is fine here as there's only one)
      if (primaryVenueData) {
        const venuePayload: Omit<Prisma.VenueCreateInput, 'convention'> = {
          isPrimaryVenue: true,
          venueName: primaryVenueData.venueName,
          description: primaryVenueData.description,
          websiteUrl: primaryVenueData.websiteUrl,
          googleMapsUrl: primaryVenueData.googleMapsUrl,
          streetAddress: primaryVenueData.streetAddress,
          city: primaryVenueData.city,
          stateRegion: primaryVenueData.stateRegion,
          postalCode: primaryVenueData.postalCode,
          country: primaryVenueData.country,
          contactEmail: primaryVenueData.contactEmail,
          contactPhone: primaryVenueData.contactPhone,
          amenities: primaryVenueData.amenities,
          parkingInfo: primaryVenueData.parkingInfo,
          publicTransportInfo: primaryVenueData.publicTransportInfo,
          overallAccessibilityNotes: primaryVenueData.overallAccessibilityNotes,
        };
        const upsertedPrimaryVenue = await tx.venue.upsert({
          where: { id: primaryVenueData.id || generateShortRandomId() },
          create: { ...venuePayload, convention: { connect: { id: conventionId } } },
          update: venuePayload,
        });
        await processPhotos(upsertedPrimaryVenue.id, primaryVenueData.photos, tx.venuePhoto, 'venueId');
      }

      // Step 3: Handle Secondary Venues with explicit Sync logic
      const existingSecondaryVenues = await tx.venue.findMany({
        where: { conventionId: conventionId, isPrimaryVenue: false },
      });
      const existingVenueIds = existingSecondaryVenues.map(v => v.id);
      const incomingVenueIds = secondaryVenuesData.map((v: any) => v.id).filter(Boolean);

      // 3a: Delete venues that are no longer present
      const venuesToDelete = existingVenueIds.filter(id => !incomingVenueIds.includes(id));
      if (venuesToDelete.length > 0) {
        await tx.venue.deleteMany({
          where: { id: { in: venuesToDelete } }
        });
      }

      // 3b: Update existing venues and create new ones
      for (const venueData of secondaryVenuesData) {
        const venuePayload = {
          isPrimaryVenue: false,
          venueName: venueData.venueName,
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
          amenities: venueData.amenities,
          parkingInfo: venueData.parkingInfo,
          publicTransportInfo: venueData.publicTransportInfo,
          overallAccessibilityNotes: venueData.overallAccessibilityNotes,
        };

        let upsertedVenue;
        if (venueData.id && existingVenueIds.includes(venueData.id)) {
          // Update existing venue
          upsertedVenue = await tx.venue.update({
            where: { id: venueData.id },
            data: venuePayload,
          });
        } else {
          // Create new venue
          upsertedVenue = await tx.venue.create({
            data: {
              ...venuePayload,
              convention: { connect: { id: conventionId } }
            },
          });
        }
        await processPhotos(upsertedVenue.id, venueData.photos, tx.venuePhoto, 'venueId');
      }

      // Step 4: Handle Hotel Logic (Primary & Additional)
      // This section needs to correctly identify the primary hotel and manage its data,
      // If guests stay at primary venue, there should be no primary hotel.
      // If there is one in the DB, it should be demoted.
      if (guestsStayAtPrimaryVenue) {
        await tx.hotel.updateMany({
          where: { conventionId, isPrimaryHotel: true },
          data: { isPrimaryHotel: false },
        });
      }

      // Determine the ID of the primary hotel from the request, if it exists
      const primaryHotelIdFromRequest = primaryHotelDetailsFromRequest?.id;

      // Demote any existing primary hotels in the DB that are not the one from the request
      if (primaryHotelIdFromRequest) {
        await tx.hotel.updateMany({
          where: {
            conventionId,
            isPrimaryHotel: true,
            id: { not: primaryHotelIdFromRequest },
          },
          data: { isPrimaryHotel: false },
        });
      }

      // Upsert the primary hotel details if they exist
      if (primaryHotelDetailsFromRequest && !guestsStayAtPrimaryVenue) {
        const hotelPayload = {
          isPrimaryHotel: true,
          isAtPrimaryVenueLocation: primaryHotelDetailsFromRequest.isAtPrimaryVenueLocation || false,
          hotelName: primaryHotelDetailsFromRequest.hotelName,
          description: primaryHotelDetailsFromRequest.description,
          websiteUrl: primaryHotelDetailsFromRequest.websiteUrl,
          googleMapsUrl: primaryHotelDetailsFromRequest.googleMapsUrl,
          streetAddress: primaryHotelDetailsFromRequest.streetAddress,
          city: primaryHotelDetailsFromRequest.city,
          stateRegion: primaryHotelDetailsFromRequest.stateRegion,
          postalCode: primaryHotelDetailsFromRequest.postalCode,
          country: primaryHotelDetailsFromRequest.country,
          contactEmail: primaryHotelDetailsFromRequest.contactEmail,
          contactPhone: primaryHotelDetailsFromRequest.contactPhone,

          amenities: primaryHotelDetailsFromRequest.amenities,
          parkingInfo: primaryHotelDetailsFromRequest.parkingInfo,
          publicTransportInfo: primaryHotelDetailsFromRequest.publicTransportInfo,
          overallAccessibilityNotes: primaryHotelDetailsFromRequest.overallAccessibilityNotes,

          bookingLink: primaryHotelDetailsFromRequest.bookingLink,
          bookingCutoffDate: primaryHotelDetailsFromRequest.bookingCutoffDate ? new Date(primaryHotelDetailsFromRequest.bookingCutoffDate) : null,
          groupRateOrBookingCode: primaryHotelDetailsFromRequest.groupRateOrBookingCode,
          groupPrice: primaryHotelDetailsFromRequest.groupPrice,
        };

        const upsertedPrimaryHotel = await tx.hotel.upsert({
          where: { id: primaryHotelDetailsFromRequest.id || generateShortRandomId() },
          create: { ...hotelPayload, convention: { connect: { id: conventionId } } },
          update: hotelPayload,
        });
        await processPhotos(upsertedPrimaryHotel.id, primaryHotelDetailsFromRequest.photos, tx.hotelPhoto, 'hotelId');
      }

      // Step 5: Handle Additional Hotels with explicit sync logic
      const existingAdditionalHotels = await tx.hotel.findMany({
        where: {
          conventionId,
          isPrimaryHotel: false
        },
      });
      const existingHotelIds = existingAdditionalHotels.map(h => h.id);
      const incomingHotelIds = additionalHotelsFromRequest.map((h: any) => h.id).filter(Boolean);

      const hotelsToDelete = existingHotelIds.filter(id => !incomingHotelIds.includes(id));
      if (hotelsToDelete.length > 0) {
        await tx.hotel.deleteMany({
          where: { id: { in: hotelsToDelete } },
        });
      }

      for (const hotelData of additionalHotelsFromRequest) {
        const hotelPayload = {
          isPrimaryHotel: false,
          isAtPrimaryVenueLocation: hotelData.isAtPrimaryVenueLocation || false,
          hotelName: hotelData.hotelName,
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
          amenities: hotelData.amenities,
          parkingInfo: hotelData.parkingInfo,
          publicTransportInfo: hotelData.publicTransportInfo,
          overallAccessibilityNotes: hotelData.overallAccessibilityNotes,
          bookingLink: hotelData.bookingLink,
          bookingCutoffDate: hotelData.bookingCutoffDate ? new Date(hotelData.bookingCutoffDate) : null,
          groupRateOrBookingCode: hotelData.groupRateOrBookingCode,
          groupPrice: hotelData.groupPrice,
        };

        let upsertedHotel;
        if (hotelData.id && existingHotelIds.includes(hotelData.id)) {
          upsertedHotel = await tx.hotel.update({
            where: { id: hotelData.id },
            data: hotelPayload,
          });
        } else {
          upsertedHotel = await tx.hotel.create({
            data: {
              ...hotelPayload,
              convention: { connect: { id: conventionId } }
            },
          });
        }
        await processPhotos(upsertedHotel.id, hotelData.photos, tx.hotelPhoto, 'hotelId');
      }

      // Step 6: Return the updated convention object (or at least its ID)
      return { id: conventionId };
    });

    return NextResponse.json(updatedConvention);
  } catch (error) {
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