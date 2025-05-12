-- CreateEnum
CREATE TYPE "ConventionStatus" AS ENUM ('DRAFT', 'UPCOMING', 'ACTIVE', 'PAST', 'CANCELLED');

-- CreateTable
CREATE TABLE "Convention" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "venueName" TEXT,
    "description" TEXT,
    "websiteUrl" TEXT,
    "organizerUserId" TEXT NOT NULL,
    "conventionSeriesId" TEXT,
    "status" "ConventionStatus" NOT NULL,
    "bannerImageUrl" TEXT,
    "galleryImageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Convention_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Convention_slug_key" ON "Convention"("slug");

-- AddForeignKey
ALTER TABLE "Convention" ADD CONSTRAINT "Convention_organizerUserId_fkey" FOREIGN KEY ("organizerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
