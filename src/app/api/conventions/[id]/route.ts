import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// Placeholder types to satisfy linter if it's stuck on old references.
// These are NOT used for validation in the current PUT handler.
import { z } from 'zod'; 
const ConventionSchema = z.object({}); 
const VenueSchema = z.object({});
const HotelSchema = z.object({});

// Define a partial schema for the expected PUT request body including venueHotel data
const ConventionUpdatePayloadSchema = ConventionSchema.partial().extend({
  venueHotel: z.object({
    primaryVenue: VenueSchema.partial().optional(),
    guestsStayAtPrimaryVenue: z.boolean().optional(),
    primaryHotelDetails: HotelSchema.partial().optional(),
    hotels: z.array(HotelSchema.partial()).optional(),
  }).optional(),
});

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const conventionId = params.id;
  if (!conventionId) {
    return NextResponse.json({ error: 'Convention ID is required' }, { status: 400 });
  }
  try {
    const convention = await prisma.convention.findUnique({
      where: { id: conventionId },
      include: {
        series: true,
        priceTiers: true,
        priceDiscounts: true,
        venues: true,
      },
    });
    if (!convention) {
      return NextResponse.json({ error: 'Convention not found' }, { status: 404 });
    }
    return NextResponse.json(convention, { status: 200 });
  } catch (error: any) {
    console.error(`[API GET /conventions/${conventionId}] Error fetching convention:`, error);
    return NextResponse.json({ error: 'Failed to fetch convention', details: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.roles?.includes('ORGANIZER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const conventionId = params.id;
  if (!conventionId) {
    return NextResponse.json({ error: 'Convention ID is required' }, { status: 400 });
  }

  try {
    const body = await request.json();

    const { venueHotel, ...basicConventionData } = body;
    const primaryVenueData = venueHotel?.primaryVenue;

    // 1. Update basic convention details
    const dataForConventionUpdate = {
      name: basicConventionData.name,
      slug: basicConventionData.slug,
      startDate: basicConventionData.startDate ? new Date(basicConventionData.startDate) : null,
      endDate: basicConventionData.endDate ? new Date(basicConventionData.endDate) : null,
      isOneDayEvent: basicConventionData.isOneDayEvent,
      isTBD: basicConventionData.isTBD,
      city: basicConventionData.city,
      stateName: basicConventionData.stateName,
      stateAbbreviation: basicConventionData.stateAbbreviation,
      country: basicConventionData.country,
      descriptionShort: basicConventionData.descriptionShort,
      descriptionMain: basicConventionData.descriptionMain,
      seriesId: basicConventionData.seriesId,
      updatedAt: new Date(),
      guestsStayAtPrimaryVenue: venueHotel?.guestsStayAtPrimaryVenue ?? false,
    };

    const updatedConvention = await prisma.convention.update({
      where: { id: conventionId },
      data: dataForConventionUpdate,
    });

    // 2. Process Primary Venue
    if (primaryVenueData && Object.keys(primaryVenueData).length > 0 && primaryVenueData.venueName) {
      const venuePayload = {
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
        amenities: primaryVenueData.amenities || [],
        parkingInfo: primaryVenueData.parkingInfo,
        publicTransportInfo: primaryVenueData.publicTransportInfo,
        overallAccessibilityNotes: primaryVenueData.overallAccessibilityNotes,
        isPrimaryVenue: true,
      };

      const existingPrimaryVenue = await prisma.venue.findFirst({
        where: {
          conventionId: conventionId,
          isPrimaryVenue: true,
        },
      });

      let savedVenue;
      if (existingPrimaryVenue) {
        savedVenue = await prisma.venue.update({
          where: { id: existingPrimaryVenue.id },
          data: {
            ...venuePayload,
          },
        });
      } else {
        savedVenue = await prisma.venue.create({
          data: {
            ...venuePayload,
            convention: { connect: { id: conventionId } },
          },
        });
      }
    }

    // <<<< ADD LOGS AROUND HERE >>>>
    console.log("\n--- DEBUGGING HOTEL PROCESSING ---");
    console.log("[API PUT /conventions/:id] CHECKPOINT 1: Before primary hotel processing block.");
    console.log("[API PUT /conventions/:id] venueHotel value:", JSON.stringify(venueHotel, null, 2));

    // 3. Process Primary Hotel
    const primaryHotelDataFromRequest = venueHotel?.primaryHotelDetails;
    console.log("[API PUT /conventions/:id] CHECKPOINT 2: Extracted primaryHotelDataFromRequest:", JSON.stringify(primaryHotelDataFromRequest, null, 2));
    console.log("[API PUT /conventions/:id] guestsStayAtPrimaryVenue status:", venueHotel?.guestsStayAtPrimaryVenue);

    if (venueHotel?.guestsStayAtPrimaryVenue === false && primaryHotelDataFromRequest && Object.keys(primaryHotelDataFromRequest).length > 0 && primaryHotelDataFromRequest.hotelName) {
      console.log("[API PUT /conventions/:id] CHECKPOINT 3: Condition MET to process/save primary hotel.");
      const hotelPayload = {
        hotelName: primaryHotelDataFromRequest.hotelName,
        description: primaryHotelDataFromRequest.description,
        websiteUrl: primaryHotelDataFromRequest.websiteUrl,
        googleMapsUrl: primaryHotelDataFromRequest.googleMapsUrl,
        streetAddress: primaryHotelDataFromRequest.streetAddress,
        city: primaryHotelDataFromRequest.city,
        stateRegion: primaryHotelDataFromRequest.stateRegion,
        postalCode: primaryHotelDataFromRequest.postalCode,
        country: primaryHotelDataFromRequest.country,
        contactEmail: primaryHotelDataFromRequest.contactEmail,
        contactPhone: primaryHotelDataFromRequest.contactPhone,
        groupRateOrBookingCode: primaryHotelDataFromRequest.groupRateOrBookingCode,
        groupPrice: primaryHotelDataFromRequest.groupPrice,
        bookingLink: primaryHotelDataFromRequest.bookingLink,
        bookingCutoffDate: primaryHotelDataFromRequest.bookingCutoffDate ? new Date(primaryHotelDataFromRequest.bookingCutoffDate) : null,
        amenities: primaryHotelDataFromRequest.amenities || [],
        parkingInfo: primaryHotelDataFromRequest.parkingInfo,
        publicTransportInfo: primaryHotelDataFromRequest.publicTransportInfo,
        overallAccessibilityNotes: primaryHotelDataFromRequest.overallAccessibilityNotes,
        isPrimaryHotel: true,
        isAtPrimaryVenueLocation: false,
      };
      console.log("[API PUT /conventions/:id] Constructed hotelPayload:", JSON.stringify(hotelPayload, null, 2));

      try {
        console.log("[API PUT /conventions/:id] CHECKPOINT 4: Inside try block for hotel DB operations.");
        const unmarkResult = await prisma.hotel.updateMany({
          where: {
            conventionId: conventionId,
            isPrimaryHotel: true,
          },
          data: {
            isPrimaryHotel: false,
          },
        });
        console.log("[API PUT /conventions/:id] Result of unmarking other primary hotels:", unmarkResult);

        let savedHotel;
        if (primaryHotelDataFromRequest.id) {
          console.log(`[API PUT /conventions/:id] Attempting to UPDATE existing hotel ID: ${primaryHotelDataFromRequest.id} as primary.`);
          savedHotel = await prisma.hotel.update({
            where: { id: primaryHotelDataFromRequest.id },
            data: hotelPayload,
          });
        } else {
          console.log("[API PUT /conventions/:id] Attempting to CREATE new hotel as primary.");
          savedHotel = await prisma.hotel.create({
            data: {
              ...hotelPayload,
              convention: { connect: { id: conventionId } },
            },
          });
        }
        console.log("[API PUT /conventions/:id] Result of save/update primary hotel (savedHotel):", JSON.stringify(savedHotel, null, 2));
      } catch (hotelProcessingError: any) {
        console.error("[API PUT /conventions/:id] ERROR during primary hotel DB operations:", hotelProcessingError);
      }
    } else if (venueHotel?.guestsStayAtPrimaryVenue === true) {
      console.log("[API PUT /conventions/:id] CHECKPOINT 5: Condition MET: guests ARE staying at primary venue. Unmarking any primary hotel.");
      try {
        const unmarkResult = await prisma.hotel.updateMany({
          where: {
            conventionId: conventionId,
            isPrimaryHotel: true,
          },
          data: {
            isPrimaryHotel: false,
          },
        });
        console.log("[API PUT /conventions/:id] Result of unmarking primary hotel (guestsStayAtPrimaryVenue is true):", unmarkResult);
      } catch (unmarkingError: any) {
        console.error("[API PUT /conventions/:id] ERROR during unmarking primary hotel (guestsStayAtPrimaryVenue is true):", unmarkingError);
      }
    } else {
        console.log("[API PUT /conventions/:id] CHECKPOINT 6: Conditions NOT MET to process/save primary hotel OR unmark (guestsStayAtPrimaryVenue is true).");
        console.log("[API PUT /conventions/:id] Details for non-met condition - guestsStayAtPrimaryVenue:", venueHotel?.guestsStayAtPrimaryVenue);
        console.log("[API PUT /conventions/:id] Details for non-met condition - primaryHotelDataFromRequest exists:", !!primaryHotelDataFromRequest);
        if (primaryHotelDataFromRequest) {
            console.log("[API PUT /conventions/:id] Details for non-met condition - primaryHotelDataFromRequest keys > 0:", Object.keys(primaryHotelDataFromRequest).length > 0);
            console.log("[API PUT /conventions/:id] Details for non-met condition - primaryHotelDataFromRequest.hotelName exists:", !!primaryHotelDataFromRequest.hotelName);
        }
    }
    console.log("--- END DEBUGGING HOTEL PROCESSING ---\n");

    // 4. Process Secondary Venues (ensure this is present and correct if you have complex logic)
    // ... if you have specific logic for secondaryVenues beyond what the frontend prepares ...

    // 5. Process Additional Hotels (ensure this is present and correct)
    // ... if you have specific logic for 'hotels' array beyond what the frontend prepares ...

    const finalConventionData = await prisma.convention.findUnique({
        where: { id: conventionId },
        include: {
            venues: true,
            hotels: true,
            series: true,
            priceTiers: true,
            priceDiscounts: true,
        }
    });

    return NextResponse.json(finalConventionData, { status: 200 });

  } catch (error: any) {
    console.error(`[API PUT /conventions/${conventionId}] Error updating convention:`, error);
    if (error.code && error.meta) {
        console.error(`[API PUT /conventions/${conventionId}] Prisma Error Code: ${error.code}, Meta: ${JSON.stringify(error.meta)}`);
    }
    return NextResponse.json({ error: 'Failed to update convention', details: error.message }, { status: 500 });
  }
}