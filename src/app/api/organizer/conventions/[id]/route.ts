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
  request: NextRequest,
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
        venues: true, // Include venues
        hotels: true, // Include hotels
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
  // #############################################################################
  console.log("--- CORRECT ORGANIZER PUT HANDLER HIT --- SRC/APP/API/ORGANIZER/CONVENTIONS/[ID]/ROUTE.TS ---");
  // #############################################################################
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const hasAccess = await authorizeAccess(session.user.id, session.user.roles as Role[], params.id);
  if (!hasAccess) {
    const conventionExists = await prisma.convention.findFirst({ where: { id: params.id, deletedAt: null }});
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
      isOneDayEvent,
      isTBD,
      priceTiers,
      priceDiscounts
    } = body;

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
    console.log(`[API PUT /organizer/conventions/${conventionId}] After promotion - primaryVenueData:`, JSON.stringify(primaryVenueData, null, 2));
    console.log(`[API PUT /organizer/conventions/${conventionId}] After promotion - secondaryVenuesData:`, JSON.stringify(secondaryVenuesData, null, 2));
    
    const conventionDataForUpdate: any = {
      name, slug, city, stateAbbreviation, stateName, country, status, seriesId,
      descriptionShort, descriptionMain, isOneDayEvent, isTBD,
      guestsStayAtPrimaryVenue, // Make sure this is part of the convention update
      updatedAt: new Date(),
    };

    let finalStartDate: Date | null = null;
    let finalEndDate: Date | null = null;
    conventionDataForUpdate.isOneDayEvent = isOneDayEvent; 

    if (isTBD) {
      finalStartDate = rawStartDate ? new Date(rawStartDate) : null;
      finalEndDate = rawEndDate ? new Date(rawEndDate) : null;
      if (finalStartDate && isNaN(finalStartDate.getTime())) return NextResponse.json({ error: 'Invalid start date format when TBD' }, { status: 400 });
      if (finalEndDate && isNaN(finalEndDate.getTime())) return NextResponse.json({ error: 'Invalid end date format when TBD' }, { status: 400 });
      if (finalStartDate && finalEndDate && finalStartDate > finalEndDate) return NextResponse.json({ error: 'Start date must be before end date, even if TBD' }, { status: 400 });
      conventionDataForUpdate.isOneDayEvent = false; 
    } else {
      if (!rawStartDate || !rawEndDate) return NextResponse.json({ error: 'Start date and end date are required when not TBD' }, { status: 400 });
      finalStartDate = new Date(rawStartDate);
      finalEndDate = new Date(rawEndDate);
      if (isNaN(finalStartDate.getTime()) || isNaN(finalEndDate.getTime())) return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
      if (finalStartDate > finalEndDate) return NextResponse.json({ error: 'Start date must be before end date' }, { status: 400 });
      if (conventionDataForUpdate.isOneDayEvent) finalEndDate = finalStartDate;
    }
    conventionDataForUpdate.startDate = finalStartDate;
    conventionDataForUpdate.endDate = finalEndDate;

    if (!seriesId) return NextResponse.json({ error: 'Series ID is required for an update.' }, { status: 400 });
    if (body.hasOwnProperty('name') && (typeof name !== 'string' || name.trim() === '')) return NextResponse.json({ error: 'Convention name, if provided, cannot be empty.' }, { status: 400 });
    if (body.hasOwnProperty('slug')) {
      if (typeof slug !== 'string' || slug.trim() === '') return NextResponse.json({ error: 'Convention slug, if provided, cannot be empty.' }, { status: 400 });
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return NextResponse.json({ error: 'Invalid slug format.' }, { status: 400 });
    }
    if (body.hasOwnProperty('status')) {
      const validStatuses = Object.values(ConventionStatus);
      if (typeof status !== 'string' || !validStatuses.includes(status as ConventionStatus)) return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}.` }, { status: 400 });
    }
    
    const existingConvention = await prisma.convention.findFirst({ where: { id: conventionId, deletedAt: null }});
    if (!existingConvention) return NextResponse.json({ error: 'Convention not found or deleted, cannot update.' }, { status: 404 });

    if (slug && slug !== existingConvention.slug) {
      const conflictingConvention = await prisma.convention.findFirst({ where: { slug: slug, id: { not: conventionId }, deletedAt: null }});
      if (conflictingConvention) return NextResponse.json({ error: 'Slug already in use.' }, { status: 409 });
      conventionDataForUpdate.slug = slug; 
    } 

    const updatedConvention = await prisma.convention.update({
      where: { id: conventionId },
      data: conventionDataForUpdate,
    });

    if (updatedConvention && updatedConvention.seriesId) {
      await prisma.conventionSeries.update({
        where: { id: updatedConvention.seriesId },
        data: { updatedAt: new Date() },
      });
    }

    // --- ScheduleDay isOfficial status update logic ---
    if (updatedConvention.startDate && updatedConvention.endDate) {
        const newStartDate = new Date(updatedConvention.startDate);
        const newEndDate = new Date(updatedConvention.endDate);
        const scheduleDaysToAdjust = await prisma.scheduleDay.findMany({
            where: { conventionId: updatedConvention.id },
        });

        const scheduleDayUpdates: Prisma.PrismaPromise<any>[] = [];

        for (const day of scheduleDaysToAdjust) {
            const actualDayDate = new Date(newStartDate); // Start with the convention's new start date
            // Adjust actualDayDate by day.dayOffset
            // Using setUTCDate and getUTCDate to work consistently with date parts regardless of server/db timezone for date-only logic.
            actualDayDate.setUTCDate(newStartDate.getUTCDate() + day.dayOffset);
            actualDayDate.setUTCHours(0,0,0,0); // Normalize to start of day UTC for comparison

            // Normalize convention start/end dates to start of day UTC for comparison
            const normalizedNewStartDate = new Date(newStartDate);
            normalizedNewStartDate.setUTCHours(0,0,0,0);
            const normalizedNewEndDate = new Date(newEndDate);
            normalizedNewEndDate.setUTCHours(0,0,0,0);
            
            let newIsOfficialStatus = day.isOfficial; // Default to its current status

            // Check if the schedule day (after offset calculation) is outside the new convention date range
            if (actualDayDate.getTime() < normalizedNewStartDate.getTime() || actualDayDate.getTime() > normalizedNewEndDate.getTime()) {
                newIsOfficialStatus = false;
            } else {
                // If the day's actual date is within the new convention date range, it should be official.
                // This handles cases where the convention is extended to cover a day that might have been manually added as non-official.
                newIsOfficialStatus = true; 
            }

            if (newIsOfficialStatus !== day.isOfficial) {
                scheduleDayUpdates.push(
                    prisma.scheduleDay.update({
                        where: { id: day.id },
                        data: { isOfficial: newIsOfficialStatus },
                    })
                );
            }
        }

        if (scheduleDayUpdates.length > 0) {
            console.log(`[API PUT /organizer/conventions/${conventionId}] Updating 'isOfficial' status for ${scheduleDayUpdates.length} schedule days.`);
            await prisma.$transaction(scheduleDayUpdates);
            // Consider revalidating schedule-specific paths if necessary
            // e.g., revalidatePath(`/organizer/conventions/edit/${conventionId}/schedule`);
            // However, the final revalidation for the whole convention might cover this.
        }
    } else {
        console.log(`[API PUT /organizer/conventions/${conventionId}] Skipping ScheduleDay 'isOfficial' update due to missing start/end dates on updatedConvention.`);
    }
    // --- END ScheduleDay isOfficial status update logic ---

    // --- VENUE PROCESSING (Revised) ---
    const allCurrentDbVenues = await prisma.venue.findMany({
      where: { conventionId: updatedConvention.id }
    });
    const incomingVenueIds = new Set<string>();
    console.log(`[API PUT /organizer/conventions/${conventionId}] Initial allCurrentDbVenues IDs for convention ${updatedConvention.id}:`, JSON.stringify(allCurrentDbVenues.map(v => v.id), null, 2));

    // Process Primary Venue (Upsert)
    if (primaryVenueData && primaryVenueData.venueName) {
      const payload = {
        isPrimaryVenue: true,
        venueName: primaryVenueData.venueName,
        description: primaryVenueData.description || '',
        websiteUrl: primaryVenueData.websiteUrl || '',
        googleMapsUrl: primaryVenueData.googleMapsUrl || '',
        streetAddress: primaryVenueData.streetAddress || '',
        city: primaryVenueData.city || '',
        stateRegion: primaryVenueData.stateRegion || '',
        postalCode: primaryVenueData.postalCode || '',
        country: primaryVenueData.country || '',
        contactEmail: primaryVenueData.contactEmail || '',
        contactPhone: primaryVenueData.contactPhone || '',
        amenities: primaryVenueData.amenities || [],
        parkingInfo: primaryVenueData.parkingInfo || '',
        publicTransportInfo: primaryVenueData.publicTransportInfo || '',
        overallAccessibilityNotes: primaryVenueData.overallAccessibilityNotes || '',
        // Photos are handled after upsert
      };
      console.log(`[API PUT /organizer/conventions/${conventionId}] Attempting to upsert PRIMARY venue. Current ID on primaryVenueData: ${primaryVenueData.id}. Payload for upsert:`, JSON.stringify(payload, null, 2));
      const upsertedPrimaryVenue = await prisma.venue.upsert({
        where: { id: primaryVenueData.id || generateShortRandomId() }, 
        create: { ...payload, convention: { connect: { id: updatedConvention.id } } },
        update: payload, // conventionId is not updated for existing records
      });
      incomingVenueIds.add(upsertedPrimaryVenue.id);

      // Process photos for Primary Venue
      if (primaryVenueData.photos) { // Ensure photos array exists
        await processPhotos(upsertedPrimaryVenue.id, primaryVenueData.photos, prisma.venuePhoto, 'venueId');
      }
    }

    // Process Secondary Venues (Upsert)
    for (const sv of secondaryVenuesData) {
      if (!sv.venueName) {
        console.log(`[API PUT /organizer/conventions/${conventionId}] Skipping secondary venue due to no venueName. Data:`, JSON.stringify(sv, null, 2));
        continue;
      }
      const payload = {
        isPrimaryVenue: false, // Secondary venues are explicitly not primary
        venueName: sv.venueName,
        description: sv.description || '',
        websiteUrl: sv.websiteUrl || '',
        googleMapsUrl: sv.googleMapsUrl || '',
        streetAddress: sv.streetAddress || '',
        city: sv.city || '',
        stateRegion: sv.stateRegion || '',
        postalCode: sv.postalCode || '',
        country: sv.country || '',
        contactEmail: sv.contactEmail || '',
        contactPhone: sv.contactPhone || '',
        amenities: sv.amenities || [],
        parkingInfo: sv.parkingInfo || '',
        publicTransportInfo: sv.publicTransportInfo || '',
        overallAccessibilityNotes: sv.overallAccessibilityNotes || '',
         // Photos are handled after upsert
      };
      console.log(`[API PUT /organizer/conventions/${conventionId}] Attempting to upsert SECONDARY venue. Current ID on sv: ${sv.id}. Payload for upsert:`, JSON.stringify(payload, null, 2));
      const upsertedSecondaryVenue = await prisma.venue.upsert({
        where: { id: sv.id || generateShortRandomId() }, 
        create: { ...payload, convention: { connect: { id: updatedConvention.id } } },
        update: payload,
      });
      incomingVenueIds.add(upsertedSecondaryVenue.id);

      // Process photos for Secondary Venue
      if (sv.photos) { // Ensure photos array exists
        await processPhotos(upsertedSecondaryVenue.id, sv.photos, prisma.venuePhoto, 'venueId');
      }
    }

    // Delete venues that are in DB but not in the incoming payload
    console.log(`[API PUT /organizer/conventions/${conventionId}] After venue upserts, incomingVenueIds for convention ${updatedConvention.id}:`, JSON.stringify(Array.from(incomingVenueIds), null, 2));
    for (const dbVenue of allCurrentDbVenues) {
      if (!incomingVenueIds.has(dbVenue.id)) {
        console.log(`[API PUT /organizer/conventions/${conventionId}] Deleting venue with ID: ${dbVenue.id} because it was not in incomingVenueIds.`);
        await prisma.venue.delete({ where: { id: dbVenue.id } });
      } else {
        console.log(`[API PUT /organizer/conventions/${conventionId}] Keeping venue with ID: ${dbVenue.id} because it was in incomingVenueIds.`);
      }
    }
    // --- END VENUE PROCESSING ---
    

    // --- NEW HOTEL PROCESSING BLOCK ---
    console.log("--- DEBUGGING HOTEL PROCESSING (ORGANIZER ROUTE) ---");
    console.log(`[API PUT /organizer/conventions/${conventionId}] CHECKPOINT 1: Before primary hotel processing block.`);
    console.log(`[API PUT /organizer/conventions/${conventionId}] guestsStayAtPrimaryVenue:`, guestsStayAtPrimaryVenue);
    console.log(`[API PUT /organizer/conventions/${conventionId}] primaryHotelDetailsFromRequest:`, JSON.stringify(primaryHotelDetailsFromRequest, null, 2));
    console.log(`[API PUT /organizer/conventions/${conventionId}] additionalHotelsFromRequest:`, JSON.stringify(additionalHotelsFromRequest, null, 2));

    const allCurrentDbHotels = await prisma.hotel.findMany({ where: { conventionId: updatedConvention.id } });
    const incomingHotelIds = new Set<string>();
    let primaryHotelIdToKeep: string | null = null;

    if (guestsStayAtPrimaryVenue === true) {
      console.log(`[API PUT /organizer/conventions/${conventionId}] CHECKPOINT 2: guestsStayAtPrimaryVenue is TRUE. Unmarking all existing hotels as primary.`);
      await prisma.hotel.updateMany({
        where: { conventionId: updatedConvention.id, isPrimaryHotel: true },
        data: { isPrimaryHotel: false, isAtPrimaryVenueLocation: true }, // also mark them as at primary venue location
      });
      // No specific primary hotel to process from primaryHotelDetails in this case.
      // Any hotel at primary venue might be implied, but we don't create a specific "primary" record.
    } else {
      // guestsStayAtPrimaryVenue is FALSE or undefined (treat as false for primary hotel logic)
      console.log(`[API PUT /organizer/conventions/${conventionId}] CHECKPOINT 3: guestsStayAtPrimaryVenue is FALSE/undefined. Processing primaryHotelDetails.`);
      if (primaryHotelDetailsFromRequest && primaryHotelDetailsFromRequest.hotelName) {
        console.log(`[API PUT /organizer/conventions/${conventionId}] CHECKPOINT 4: primaryHotelDetailsFromRequest HAS hotelName. Upserting it as primary.`);
        
        // Unset any other hotel that might be primary
        await prisma.hotel.updateMany({
          where: { 
            conventionId: updatedConvention.id, 
            isPrimaryHotel: true,
            id: primaryHotelDetailsFromRequest.id ? { not: primaryHotelDetailsFromRequest.id } : undefined // don't unmark itself if updating
          },
          data: { isPrimaryHotel: false },
        });

        const hotelPayload = {
          isPrimaryHotel: true,
          isAtPrimaryVenueLocation: false, // Explicitly false as guests are not at primary venue
          hotelName: primaryHotelDetailsFromRequest.hotelName,
          description: primaryHotelDetailsFromRequest.description || '',
          websiteUrl: primaryHotelDetailsFromRequest.websiteUrl || '',
          googleMapsUrl: primaryHotelDetailsFromRequest.googleMapsUrl || '',
          streetAddress: primaryHotelDetailsFromRequest.streetAddress || '',
          city: primaryHotelDetailsFromRequest.city || '',
          stateRegion: primaryHotelDetailsFromRequest.stateRegion || '',
          postalCode: primaryHotelDetailsFromRequest.postalCode || '',
          country: primaryHotelDetailsFromRequest.country || '',
          contactEmail: primaryHotelDetailsFromRequest.contactEmail || '',
          contactPhone: primaryHotelDetailsFromRequest.contactPhone || '',
          groupRateOrBookingCode: primaryHotelDetailsFromRequest.groupRateOrBookingCode || '',
          groupPrice: primaryHotelDetailsFromRequest.groupPrice, // Keep as is (could be number or string)
          bookingLink: primaryHotelDetailsFromRequest.bookingLink || '',
          bookingCutoffDate: primaryHotelDetailsFromRequest.bookingCutoffDate ? new Date(primaryHotelDetailsFromRequest.bookingCutoffDate) : null,
          amenities: primaryHotelDetailsFromRequest.amenities || [],
          parkingInfo: primaryHotelDetailsFromRequest.parkingInfo || '',
          publicTransportInfo: primaryHotelDetailsFromRequest.publicTransportInfo || '',
          overallAccessibilityNotes: primaryHotelDetailsFromRequest.overallAccessibilityNotes || '',
          // Photos are handled after upsert
        };
        console.log(`[API PUT /organizer/conventions/${conventionId}] Upserting PRIMARY hotel. ID: ${primaryHotelDetailsFromRequest.id}. Payload:`, JSON.stringify(hotelPayload, null, 2));

        const upsertedPrimaryHotel = await prisma.hotel.upsert({
          where: { id: primaryHotelDetailsFromRequest.id || generateShortRandomId() },
          create: { ...hotelPayload, convention: { connect: { id: updatedConvention.id } } },
          update: hotelPayload,
        });
        incomingHotelIds.add(upsertedPrimaryHotel.id);
        primaryHotelIdToKeep = upsertedPrimaryHotel.id;
        console.log(`[API PUT /organizer/conventions/${conventionId}] Upserted primary hotel:`, JSON.stringify(upsertedPrimaryHotel, null, 2));
        
        // Process photos for Primary Hotel
        if (primaryHotelDetailsFromRequest.photos) { // Ensure photos array exists
            await processPhotos(upsertedPrimaryHotel.id, primaryHotelDetailsFromRequest.photos, prisma.hotelPhoto, 'hotelId');
        }
      } else {
        console.log(`[API PUT /organizer/conventions/${conventionId}] CHECKPOINT 5: guestsStayAtPrimaryVenue is FALSE, but NO primaryHotelDetails. Unmarking all hotels as primary.`);
        // No primary hotel specified, ensure no hotel is marked as primary.
        await prisma.hotel.updateMany({
          where: { conventionId: updatedConvention.id, isPrimaryHotel: true },
          data: { isPrimaryHotel: false },
        });
      }
    }

    // Process additional/secondary hotels from the `hotels` array
    console.log(`[API PUT /organizer/conventions/${conventionId}] CHECKPOINT 6: Processing additionalHotelsFromRequest array.`);
    if (Array.isArray(additionalHotelsFromRequest)) {
      for (const hotelData of additionalHotelsFromRequest) {
        if (!hotelData.hotelName) {
            console.log(`[API PUT /organizer/conventions/${conventionId}] Skipping additional hotel due to no hotelName. Data:`, JSON.stringify(hotelData, null, 2));
            continue;
        }
        // If this hotel was already processed as primary, skip it.
        if (hotelData.id && hotelData.id === primaryHotelIdToKeep) {
            console.log(`[API PUT /organizer/conventions/${conventionId}] Skipping hotel ID ${hotelData.id} in additionalHotels loop as it was already processed as primary.`);
            continue;
        }

        const hotelPayload = {
          isPrimaryHotel: false, // Ensure these are not primary, unless it's the one just set above
          isAtPrimaryVenueLocation: hotelData.isAtPrimaryVenueLocation || false, // Respect this flag from payload
          hotelName: hotelData.hotelName,
          description: hotelData.description || '',
          websiteUrl: hotelData.websiteUrl || '',
          googleMapsUrl: hotelData.googleMapsUrl || '',
          streetAddress: hotelData.streetAddress || '',
          city: hotelData.city || '',
          stateRegion: hotelData.stateRegion || '',
          postalCode: hotelData.postalCode || '',
          country: hotelData.country || '',
          contactEmail: hotelData.contactEmail || '',
          contactPhone: hotelData.contactPhone || '',
          groupRateOrBookingCode: hotelData.groupRateOrBookingCode || '',
          groupPrice: hotelData.groupPrice,
          bookingLink: hotelData.bookingLink || '',
          bookingCutoffDate: hotelData.bookingCutoffDate ? new Date(hotelData.bookingCutoffDate) : null,
          amenities: hotelData.amenities || [],
          parkingInfo: hotelData.parkingInfo || '',
          publicTransportInfo: hotelData.publicTransportInfo || '',
          overallAccessibilityNotes: hotelData.overallAccessibilityNotes || '',
          // Photos are handled after upsert
        };
        console.log(`[API PUT /organizer/conventions/${conventionId}] Upserting ADDITIONAL hotel. ID: ${hotelData.id}. Payload:`, JSON.stringify(hotelPayload, null, 2));
        
        const upsertedHotel = await prisma.hotel.upsert({
          where: { id: hotelData.id || generateShortRandomId() },
          create: { ...hotelPayload, convention: { connect: { id: updatedConvention.id } } },
          update: hotelPayload,
        });
        incomingHotelIds.add(upsertedHotel.id);
        console.log(`[API PUT /organizer/conventions/${conventionId}] Upserted additional hotel:`, JSON.stringify(upsertedHotel, null, 2));

        // Process photos for Additional Hotel
        if (hotelData.photos) { // Ensure photos array exists
            await processPhotos(upsertedHotel.id, hotelData.photos, prisma.hotelPhoto, 'hotelId');
        }
      }
    }

    // Delete hotels that are in DB but not in the incoming payload (either as primary or additional)
    console.log(`[API PUT /organizer/conventions/${conventionId}] CHECKPOINT 7: After hotel upserts, incomingHotelIds for convention ${updatedConvention.id}:`, JSON.stringify(Array.from(incomingHotelIds), null, 2));
    for (const dbHotel of allCurrentDbHotels) {
      if (!incomingHotelIds.has(dbHotel.id)) {
        console.log(`[API PUT /organizer/conventions/${conventionId}] Deleting hotel with ID: ${dbHotel.id} because it was not in incomingHotelIds.`);
        await prisma.hotel.delete({ where: { id: dbHotel.id } });
      } else {
        console.log(`[API PUT /organizer/conventions/${conventionId}] Keeping hotel with ID: ${dbHotel.id} because it was in incomingHotelIds.`);
      }
    }
    console.log("--- END DEBUGGING HOTEL PROCESSING (ORGANIZER ROUTE) ---");
    // --- End NEW HOTEL PROCESSING BLOCK ---


    // --- Process Price Tiers ---
    if (Array.isArray(priceTiers)) {
        // Delete tiers not present in the incoming array
        const incomingTierIds = priceTiers.map(tier => tier.id).filter(id => id);
        if (incomingTierIds.length > 0) {
        await prisma.priceTier.deleteMany({
            where: {
                conventionId: updatedConvention.id,
                NOT: {
                    id: { in: incomingTierIds }
                }
            }
        });
        } else { // If no tiers are incoming, delete all existing for this convention
             await prisma.priceTier.deleteMany({
                where: { conventionId: updatedConvention.id }
            });
        }

        // Upsert incoming tiers
        for (const tierData of priceTiers) {
            const tierPayload = {
                label: tierData.label,
                amount: parseFloat(tierData.amount), // Ensure amount is float
                order: tierData.order,
            };
            if (tierData.id) {
                await prisma.priceTier.update({
                    where: { id: tierData.id },
                    data: tierPayload,
                });
            } else {
                await prisma.priceTier.create({
                    data: { ...tierPayload, convention: { connect: { id: updatedConvention.id } } },
                });
            }
        }
    } else { // If priceTiers array is not provided, or null, assume all existing should be deleted
        await prisma.priceTier.deleteMany({
            where: { conventionId: updatedConvention.id }
        });
    }
    // --- End Process Price Tiers ---

    // --- Process Price Discounts ---
    if (Array.isArray(priceDiscounts)) {
        const incomingDiscountIds = priceDiscounts.map(discount => discount.id).filter(id => id);
        if (incomingDiscountIds.length > 0) {
        await prisma.priceDiscount.deleteMany({
            where: {
                conventionId: updatedConvention.id,
                NOT: {
                    id: { in: incomingDiscountIds }
                }
            }
        });
        } else { // If no discounts are incoming, delete all existing for this convention
            await prisma.priceDiscount.deleteMany({
                where: { conventionId: updatedConvention.id }
            });
        }
        
        for (const discountData of priceDiscounts) {
            const discountPayload: any = { // Use 'any' temporarily for flexibility
                code: discountData.code, // Assuming code is always present
                percentage: discountData.percentage ? parseFloat(discountData.percentage) : null,
                fixedAmount: discountData.fixedAmount ? parseFloat(discountData.fixedAmount) : null,
                cutoffDate: discountData.cutoffDate ? new Date(discountData.cutoffDate) : null,
                priceTierId: discountData.priceTierId || null, // Link to priceTier
            };
            // Ensure only one of percentage or fixedAmount is set
            if (discountPayload.percentage && discountPayload.fixedAmount) {
                // Handle error or prioritize one, e.g., clear fixedAmount if percentage is set
                console.warn(`[API PUT /organizer/conventions/${conventionId}] Discount has both percentage and fixedAmount. Prioritizing percentage.`);
                discountPayload.fixedAmount = null;
            }

            if (discountData.id) {
                await prisma.priceDiscount.update({
                    where: { id: discountData.id },
                    data: discountPayload,
                });
            } else {
                await prisma.priceDiscount.create({
                    data: { ...discountPayload, convention: { connect: { id: updatedConvention.id } } },
                });
            }
        }
    } else { // If priceDiscounts array is not provided, or null, delete all existing
         await prisma.priceDiscount.deleteMany({
            where: { conventionId: updatedConvention.id }
        });
    }
    // --- End Process Price Discounts ---


    // Fetch the fully updated convention to return
    const finalUpdatedConvention = await prisma.convention.findUnique({
      where: { id: conventionId },
      include: { 
        series: true, 
        venues: { include: { photos: true } }, // Include photos for venues
        hotels: { include: { photos: true } }, // Include photos for hotels
        priceTiers: true, 
        priceDiscounts: true 
      },
    });

    return NextResponse.json(finalUpdatedConvention);

  } catch (error: any) {
    console.error(`[API PUT /organizer/conventions/${conventionId}] Error updating convention:`, error);
    if (error.code && error.meta) {
        console.error(`[API PUT /organizer/conventions/${conventionId}] Prisma Error Code: ${error.code}, Meta: ${JSON.stringify(error.meta)}`);
    }
    return NextResponse.json({ error: 'Failed to update convention', details: error.message }, { status: 500 });
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