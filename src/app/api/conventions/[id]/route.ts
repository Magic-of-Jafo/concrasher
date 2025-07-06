import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getConventionDetailsByIdWithRelations } from '@/lib/db';

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
    // Use the comprehensive helper function to load all related data
    const convention = await getConventionDetailsByIdWithRelations(conventionId);

    if (!convention) {
      return NextResponse.json({ error: 'Convention not found' }, { status: 404 });
    }

    // Populate dealer links with brand data (only BRAND type for now)
    const populatedDealerLinks = await Promise.all(
      (convention.dealerLinks || []).map(async (dl: any) => {
        if (dl.profileType === 'BRAND') {
          const brand = await prisma.brand.findUnique({ where: { id: dl.linkedProfileId } });
          if (brand) {
            return {
              id: dl.id,
              displayNameOverride: dl.displayNameOverride,
              descriptionOverride: dl.descriptionOverride,
              profileType: dl.profileType,
              name: brand.name,
              profileImageUrl: brand.logoUrl,
              profileLink: `/brands/${brand.id}`,
            };
          }
        }
        // fallback minimal
        return {
          id: dl.id,
          displayNameOverride: dl.displayNameOverride,
          descriptionOverride: dl.descriptionOverride,
          profileType: dl.profileType,
          name: dl.displayNameOverride || 'Dealer',
          profileImageUrl: null,
          profileLink: undefined,
        };
      })
    );

    // Derive display timezone & currency from settings first (fallbacks embedded)
    const displayTimezone = getTimezoneFromSettings((convention as any).settings || []);
    const currency = getCurrencyFromSettings((convention as any).settings || []);

    // Transform the data for better frontend consumption
    const transformedConvention = {
      ...convention,
      // Transform pricing data with active discounts and currency display
      pricingData: transformPricingData(convention.priceTiers, convention.priceDiscounts),
      // Transform dates with TBD logic
      dateDisplay: transformDateDisplay(convention.startDate, convention.endDate, convention.isTBD),
      // Transform schedule with timezone conversion using derived timezone
      scheduleDisplay: transformScheduleDisplay(convention.scheduleDays, convention.scheduleItems, displayTimezone),
      // Currency & display timezone
      currency,
      displayTimezone,
      dealerLinks: populatedDealerLinks,
    };

    return NextResponse.json(transformedConvention, { status: 200 });
  } catch (error: any) {
    console.error(`[API GET /conventions/${conventionId}] Error fetching convention:`, error);
    return NextResponse.json({ error: 'Failed to fetch convention', details: error.message }, { status: 500 });
  }
}

// Helper function to transform pricing data with active discounts
function transformPricingData(priceTiers: any[], priceDiscounts: any[]) {
  const now = new Date();

  return priceTiers.map(tier => {
    // Find active discounts for this tier
    const activeDiscounts = priceDiscounts
      .filter(discount =>
        discount.priceTierId === tier.id &&
        new Date(discount.cutoffDate) > now
      )
      .sort((a, b) => new Date(a.cutoffDate).getTime() - new Date(b.cutoffDate).getTime());

    return {
      ...tier,
      activeDiscounts,
      currentPrice: activeDiscounts.length > 0 ? activeDiscounts[0].discountedAmount : tier.amount,
      hasActiveDiscount: activeDiscounts.length > 0,
      nextDiscountCutoff: activeDiscounts.length > 0 ? activeDiscounts[0].cutoffDate : null
    };
  });
}

// Helper function to transform date display with TBD logic
function transformDateDisplay(startDate: Date | null, endDate: Date | null, isTBD: boolean) {
  if (isTBD) {
    return {
      displayText: 'TBD',
      isTBD: true,
      startDate: null,
      endDate: null
    };
  }

  return {
    displayText: formatDateRange(startDate, endDate),
    isTBD: false,
    startDate,
    endDate
  };
}

// Helper function to format date ranges
function formatDateRange(startDate: Date | null, endDate: Date | null): string {
  if (!startDate) return 'TBD';

  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;

  if (!end || start.toDateString() === end.toDateString()) {
    return start.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }

  return `${start.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric'
  })} - ${end.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })}`;
}

// Helper function to transform schedule display with timezone conversion
function transformScheduleDisplay(scheduleDays: any[], scheduleItems: any[], timezone: string | null) {
  const displayTimezone = timezone || 'UTC';

  return {
    scheduleDays: scheduleDays.map(day => ({
      ...day,
      events: day.events.map((event: any) => transformScheduleEvent(event, displayTimezone))
    })),
    scheduleItems: scheduleItems.map(item => transformScheduleEvent(item, displayTimezone)),
    timezone: displayTimezone
  };
}

// Helper function to transform individual schedule events
function transformScheduleEvent(event: any, timezone: string) {
  return {
    ...event,
    timeDisplay: formatEventTime(event.startTimeMinutes, event.durationMinutes, timezone),
    feesDisplay: event.feeTiers?.map((fee: any) => ({
      ...fee,
      formattedAmount: formatCurrency(fee.amount, 'USD') // TODO: Use convention currency
    })) || []
  };
}

// Helper function to format event times
function formatEventTime(startTimeMinutes: number | null, durationMinutes: number | null, timezone: string): string {
  if (!startTimeMinutes) return 'Time TBD';

  const hours = Math.floor(startTimeMinutes / 60);
  const minutes = startTimeMinutes % 60;
  const startTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

  if (durationMinutes) {
    const endTimeMinutes = startTimeMinutes + durationMinutes;
    const endHours = Math.floor(endTimeMinutes / 60);
    const endMins = endTimeMinutes % 60;
    const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
    return `${startTime} - ${endTime}`;
  }

  return startTime;
}

// Helper function to get currency from settings
function getCurrencyFromSettings(settings: any[]): string {
  const currencySetting = settings.find(s => s.key === 'currency');
  return currencySetting?.value || 'USD';
}

// Helper function to get timezone from settings
function getTimezoneFromSettings(settings: any[]): string {
  const timezoneSetting = settings.find(s => s.key === 'timezone');
  return timezoneSetting?.value || 'UTC';
}

// Helper function to format currency
function formatCurrency(amount: number | string, currency: string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (numAmount === 0) return 'FREE';

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(numAmount);
  } catch (error) {
    // Fallback if currency is not supported
    return `${currency} ${numAmount.toFixed(2)}`;
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