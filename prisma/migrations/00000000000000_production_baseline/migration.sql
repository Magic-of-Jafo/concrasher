-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BrandUserRole" AS ENUM ('OWNER', 'MANAGER');

-- CreateEnum
CREATE TYPE "ConventionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'PAST', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ConventionType" AS ENUM ('CONVENTION', 'FESTIVAL');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO_LINK');

-- CreateEnum
CREATE TYPE "ProfileType" AS ENUM ('USER', 'TALENT', 'BRAND');

-- CreateEnum
CREATE TYPE "RequestedRole" AS ENUM ('ORGANIZER', 'BRAND_CREATOR');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ORGANIZER', 'TALENT', 'ADMIN', 'BRAND_CREATOR');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "websiteUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandUser" (
    "brandId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "BrandUserRole" NOT NULL,

    CONSTRAINT "BrandUser_pkey" PRIMARY KEY ("brandId","userId")
);

-- CreateTable
CREATE TABLE "Convention" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "city" TEXT,
    "country" TEXT,
    "venueName" TEXT,
    "websiteUrl" TEXT,
    "status" "ConventionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "stateAbbreviation" TEXT,
    "stateName" TEXT,
    "seriesId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "coverImageUrl" TEXT,
    "descriptionMain" TEXT,
    "descriptionShort" TEXT,
    "isOneDayEvent" BOOLEAN NOT NULL DEFAULT false,
    "isTBD" BOOLEAN NOT NULL DEFAULT false,
    "profileImageUrl" TEXT,
    "guestsStayAtPrimaryVenue" BOOLEAN DEFAULT false,
    "registrationUrl" TEXT,
    "timezoneId" TEXT,
    "keywords" TEXT[],
    "type" "ConventionType" NOT NULL DEFAULT 'CONVENTION',

    CONSTRAINT "Convention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConventionDealerLink" (
    "id" TEXT NOT NULL,
    "conventionId" TEXT NOT NULL,
    "profileType" "ProfileType" NOT NULL,
    "linkedProfileId" TEXT NOT NULL,
    "displayNameOverride" TEXT,
    "descriptionOverride" TEXT,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConventionDealerLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConventionMedia" (
    "id" TEXT NOT NULL,
    "conventionId" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConventionMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConventionScheduleItem" (
    "id" TEXT NOT NULL,
    "conventionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "locationName" TEXT,
    "venueId" TEXT,
    "order" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "eventType" TEXT NOT NULL,
    "atPrimaryVenue" BOOLEAN NOT NULL,
    "dayOffset" INTEGER,
    "durationMinutes" INTEGER,
    "startTimeMinutes" INTEGER,
    "scheduleDayId" TEXT,
    "productionId" TEXT,
    "soldOut" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ConventionScheduleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConventionSeries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizerUserId" TEXT NOT NULL,
    "logoUrl" TEXT,
    "slug" TEXT NOT NULL,

    CONSTRAINT "ConventionSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConventionSetting" (
    "id" TEXT NOT NULL,
    "conventionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "timezoneId" TEXT,
    "currencyId" INTEGER,

    CONSTRAINT "ConventionSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConventionTalent" (
    "id" TEXT NOT NULL,
    "conventionId" TEXT NOT NULL,
    "talentProfileId" TEXT NOT NULL,
    "overrideDisplayName" TEXT,
    "overrideBio" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConventionTalent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Country" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "alpha_2" TEXT NOT NULL,
    "country_code" TEXT NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Currency" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "demonym" TEXT,
    "majorSingle" TEXT NOT NULL,
    "majorPlural" TEXT NOT NULL,
    "ISOnum" INTEGER,
    "symbol" TEXT NOT NULL,
    "symbolNative" TEXT NOT NULL,
    "minorSingle" TEXT NOT NULL,
    "minorPlural" TEXT NOT NULL,
    "ISOdigits" INTEGER NOT NULL,
    "decimals" INTEGER NOT NULL,
    "numToBasic" INTEGER,

    CONSTRAINT "Currency_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "PriceDiscount" (
    "id" TEXT NOT NULL,
    "conventionId" TEXT NOT NULL,
    "cutoffDate" TIMESTAMP(3) NOT NULL,
    "priceTierId" TEXT NOT NULL,
    "discountedAmount" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "channel" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "PriceDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceTier" (
    "id" TEXT NOT NULL,
    "conventionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tab" TEXT NOT NULL DEFAULT '',
    "amountSecondary" DECIMAL(65,30),

    CONSTRAINT "PriceTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Production" (
    "id" TEXT NOT NULL,
    "conventionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "tagline" TEXT,
    "ageRating" TEXT,
    "description" TEXT,
    "coverImageUrl" TEXT,
    "detailsUrl" TEXT,
    "priceTiers" JSONB,
    "priceNote" TEXT,
    "order" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Production_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestedRole" "RequestedRole" NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SEOSetting" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "defaultKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "siteTitleTemplate" TEXT,
    "siteDescription" TEXT,
    "organizationName" TEXT,
    "organizationUrl" TEXT,
    "organizationLogo" TEXT,
    "socialProfiles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "trackingScripts" TEXT,

    CONSTRAINT "SEOSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleDay" (
    "id" TEXT NOT NULL,
    "conventionId" TEXT NOT NULL,
    "dayOffset" INTEGER NOT NULL,
    "isOfficial" BOOLEAN NOT NULL,
    "label" TEXT,

    CONSTRAINT "ScheduleDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleEventBrandLink" (
    "id" TEXT NOT NULL,
    "scheduleItemId" TEXT NOT NULL,
    "brandProfileId" TEXT NOT NULL,

    CONSTRAINT "ScheduleEventBrandLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleEventFeeTier" (
    "id" TEXT NOT NULL,
    "scheduleItemId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "ScheduleEventFeeTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleEventTalentLink" (
    "id" TEXT NOT NULL,
    "scheduleItemId" TEXT NOT NULL,
    "talentProfileId" TEXT NOT NULL,
    "nameAsListed" TEXT,
    "order" INTEGER,
    "role" TEXT,

    CONSTRAINT "ScheduleEventTalentLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "State" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,

    CONSTRAINT "State_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TalentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "displayName" TEXT NOT NULL,
    "tagline" TEXT,
    "bio" TEXT,
    "profilePictureUrl" TEXT,
    "websiteUrl" TEXT,
    "contactEmail" TEXT,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "claimedAt" TIMESTAMP(3),
    "normalizedNames" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "TalentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TalentProfileMedia" (
    "id" TEXT NOT NULL,
    "talentProfileId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "caption" TEXT,
    "order" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TalentProfileMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Timezone" (
    "id" TEXT NOT NULL,
    "ianaId" TEXT NOT NULL,
    "value" TEXT,
    "abbr" TEXT,
    "offset" INTEGER,
    "isdst" BOOLEAN,
    "text" TEXT,
    "utcAliases" TEXT[],

    CONSTRAINT "Timezone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "hashedPassword" TEXT,
    "roles" "Role"[] DEFAULT ARRAY['USER']::"Role"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "bio" TEXT,
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),
    "timezoneId" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "stageName" TEXT,
    "useStageNamePublicly" BOOLEAN DEFAULT false,
    "homeCity" TEXT,
    "homeStateName" TEXT,
    "homeStateAbbreviation" TEXT,
    "homeCountry" TEXT,
    "homeLatitude" DOUBLE PRECISION,
    "homeLongitude" DOUBLE PRECISION,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

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
    "groupRateOrBookingCode" TEXT,
    "groupPrice" TEXT,
    "bookingLink" TEXT,
    "bookingCutoffDate" TIMESTAMP(3),

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
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "_ConventionTags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ConventionTags_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider" ASC, "providerAccountId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Brand_name_key" ON "Brand"("name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Convention_slug_key" ON "Convention"("slug" ASC);

-- CreateIndex
CREATE INDEX "ConventionDealerLink_conventionId_idx" ON "ConventionDealerLink"("conventionId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ConventionDealerLink_conventionId_profileType_linkedProfile_key" ON "ConventionDealerLink"("conventionId" ASC, "profileType" ASC, "linkedProfileId" ASC);

-- CreateIndex
CREATE INDEX "ConventionScheduleItem_productionId_idx" ON "ConventionScheduleItem"("productionId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ConventionSeries_slug_key" ON "ConventionSeries"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ConventionSetting_conventionId_key_key" ON "ConventionSetting"("conventionId" ASC, "key" ASC);

-- CreateIndex
CREATE INDEX "ConventionTalent_conventionId_idx" ON "ConventionTalent"("conventionId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ConventionTalent_conventionId_talentProfileId_key" ON "ConventionTalent"("conventionId" ASC, "talentProfileId" ASC);

-- CreateIndex
CREATE INDEX "ConventionTalent_talentProfileId_idx" ON "ConventionTalent"("talentProfileId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Country_alpha_2_key" ON "Country"("alpha_2" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Country_country_code_key" ON "Country"("country_code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Country_name_key" ON "Country"("name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Currency_ISOnum_key" ON "Currency"("ISOnum" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Currency_code_key" ON "Currency"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "PriceDiscount_conventionId_priceTierId_cutoffDate_channel_key" ON "PriceDiscount"("conventionId" ASC, "priceTierId" ASC, "cutoffDate" ASC, "channel" ASC);

-- CreateIndex
CREATE INDEX "Production_conventionId_idx" ON "Production"("conventionId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "RoleApplication_userId_requestedRole_key" ON "RoleApplication"("userId" ASC, "requestedRole" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleEventTalentLink_scheduleItemId_talentProfileId_key" ON "ScheduleEventTalentLink"("scheduleItemId" ASC, "talentProfileId" ASC);

-- CreateIndex
CREATE INDEX "ScheduleEventTalentLink_talentProfileId_idx" ON "ScheduleEventTalentLink"("talentProfileId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "SiteSetting_key_key" ON "SiteSetting"("key" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "State_abbreviation_key" ON "State"("abbreviation" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "State_name_key" ON "State"("name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "TalentProfile_userId_key" ON "TalentProfile"("userId" ASC);

-- CreateIndex
CREATE INDEX "TalentProfileMedia_talentProfileId_idx" ON "TalentProfileMedia"("talentProfileId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Timezone_ianaId_key" ON "Timezone"("ianaId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_resetToken_key" ON "User"("resetToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier" ASC, "token" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token" ASC);

-- CreateIndex
CREATE INDEX "_ConventionTags_B_index" ON "_ConventionTags"("B" ASC);

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandUser" ADD CONSTRAINT "BrandUser_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandUser" ADD CONSTRAINT "BrandUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Convention" ADD CONSTRAINT "Convention_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "ConventionSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Convention" ADD CONSTRAINT "Convention_timezoneId_fkey" FOREIGN KEY ("timezoneId") REFERENCES "Timezone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConventionDealerLink" ADD CONSTRAINT "ConventionDealerLink_conventionId_fkey" FOREIGN KEY ("conventionId") REFERENCES "Convention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConventionMedia" ADD CONSTRAINT "ConventionMedia_conventionId_fkey" FOREIGN KEY ("conventionId") REFERENCES "Convention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConventionScheduleItem" ADD CONSTRAINT "ConventionScheduleItem_conventionId_fkey" FOREIGN KEY ("conventionId") REFERENCES "Convention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConventionScheduleItem" ADD CONSTRAINT "ConventionScheduleItem_productionId_fkey" FOREIGN KEY ("productionId") REFERENCES "Production"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConventionScheduleItem" ADD CONSTRAINT "ConventionScheduleItem_scheduleDayId_fkey" FOREIGN KEY ("scheduleDayId") REFERENCES "ScheduleDay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConventionScheduleItem" ADD CONSTRAINT "ConventionScheduleItem_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConventionSeries" ADD CONSTRAINT "ConventionSeries_organizerUserId_fkey" FOREIGN KEY ("organizerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConventionSetting" ADD CONSTRAINT "ConventionSetting_conventionId_fkey" FOREIGN KEY ("conventionId") REFERENCES "Convention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConventionSetting" ADD CONSTRAINT "ConventionSetting_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConventionSetting" ADD CONSTRAINT "ConventionSetting_timezoneId_fkey" FOREIGN KEY ("timezoneId") REFERENCES "Timezone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConventionTalent" ADD CONSTRAINT "ConventionTalent_conventionId_fkey" FOREIGN KEY ("conventionId") REFERENCES "Convention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConventionTalent" ADD CONSTRAINT "ConventionTalent_talentProfileId_fkey" FOREIGN KEY ("talentProfileId") REFERENCES "TalentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hotel" ADD CONSTRAINT "Hotel_conventionId_fkey" FOREIGN KEY ("conventionId") REFERENCES "Convention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelPhoto" ADD CONSTRAINT "HotelPhoto_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceDiscount" ADD CONSTRAINT "PriceDiscount_conventionId_fkey" FOREIGN KEY ("conventionId") REFERENCES "Convention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceDiscount" ADD CONSTRAINT "PriceDiscount_priceTierId_fkey" FOREIGN KEY ("priceTierId") REFERENCES "PriceTier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceTier" ADD CONSTRAINT "PriceTier_conventionId_fkey" FOREIGN KEY ("conventionId") REFERENCES "Convention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Production" ADD CONSTRAINT "Production_conventionId_fkey" FOREIGN KEY ("conventionId") REFERENCES "Convention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleApplication" ADD CONSTRAINT "RoleApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleDay" ADD CONSTRAINT "ScheduleDay_conventionId_fkey" FOREIGN KEY ("conventionId") REFERENCES "Convention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleEventBrandLink" ADD CONSTRAINT "ScheduleEventBrandLink_scheduleItemId_fkey" FOREIGN KEY ("scheduleItemId") REFERENCES "ConventionScheduleItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleEventFeeTier" ADD CONSTRAINT "ScheduleEventFeeTier_scheduleItemId_fkey" FOREIGN KEY ("scheduleItemId") REFERENCES "ConventionScheduleItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleEventTalentLink" ADD CONSTRAINT "ScheduleEventTalentLink_scheduleItemId_fkey" FOREIGN KEY ("scheduleItemId") REFERENCES "ConventionScheduleItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleEventTalentLink" ADD CONSTRAINT "ScheduleEventTalentLink_talentProfileId_fkey" FOREIGN KEY ("talentProfileId") REFERENCES "TalentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentProfile" ADD CONSTRAINT "TalentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentProfileMedia" ADD CONSTRAINT "TalentProfileMedia_talentProfileId_fkey" FOREIGN KEY ("talentProfileId") REFERENCES "TalentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_timezoneId_fkey" FOREIGN KEY ("timezoneId") REFERENCES "Timezone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venue" ADD CONSTRAINT "Venue_conventionId_fkey" FOREIGN KEY ("conventionId") REFERENCES "Convention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenuePhoto" ADD CONSTRAINT "VenuePhoto_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ConventionTags" ADD CONSTRAINT "_ConventionTags_A_fkey" FOREIGN KEY ("A") REFERENCES "Convention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ConventionTags" ADD CONSTRAINT "_ConventionTags_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
