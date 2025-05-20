-- CreateTable
CREATE TABLE "Venue" (
    "id" TEXT NOT NULL,
    "conventionId" TEXT NOT NULL,
    "isPrimaryVenue" BOOLEAN NOT NULL DEFAULT false,
    "venueName" TEXT NOT NULL,
    "description" TEXT,
    "websiteUrl" TEXT,
    "googleMapsUrl" TEXT,
    "streetAddress" TEXT,
    "city" TEXT,
    "stateRegion" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "amenities" TEXT[],
    "parkingInfo" TEXT,
    "publicTransportInfo" TEXT,
    "overallAccessibilityNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VenuePhoto" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VenuePhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hotel" (
    "id" TEXT NOT NULL,
    "conventionId" TEXT NOT NULL,
    "isPrimaryHotel" BOOLEAN NOT NULL DEFAULT false,
    "isAtPrimaryVenueLocation" BOOLEAN NOT NULL DEFAULT false,
    "hotelName" TEXT NOT NULL,
    "description" TEXT,
    "websiteUrl" TEXT,
    "googleMapsUrl" TEXT,
    "streetAddress" TEXT,
    "city" TEXT,
    "stateRegion" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "groupRateOrBookingCode" TEXT,
    "groupPrice" TEXT,
    "bookingLink" TEXT,
    "bookingCutoffDate" TIMESTAMP(3),
    "amenities" TEXT[],
    "parkingInfo" TEXT,
    "publicTransportInfo" TEXT,
    "overallAccessibilityNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hotel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HotelPhoto" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HotelPhoto_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Venue" ADD CONSTRAINT "Venue_conventionId_fkey" FOREIGN KEY ("conventionId") REFERENCES "Convention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenuePhoto" ADD CONSTRAINT "VenuePhoto_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hotel" ADD CONSTRAINT "Hotel_conventionId_fkey" FOREIGN KEY ("conventionId") REFERENCES "Convention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelPhoto" ADD CONSTRAINT "HotelPhoto_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
