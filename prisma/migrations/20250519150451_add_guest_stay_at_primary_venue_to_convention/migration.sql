-- DropForeignKey
ALTER TABLE "Convention" DROP CONSTRAINT "Convention_seriesId_fkey";

-- AlterTable
ALTER TABLE "Convention" ALTER COLUMN "city" DROP NOT NULL,
ALTER COLUMN "country" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'DRAFT',
ALTER COLUMN "galleryImageUrls" DROP DEFAULT,
ALTER COLUMN "seriesId" DROP NOT NULL,
ALTER COLUMN "guestsStayAtPrimaryVenue" SET DEFAULT false;

-- AddForeignKey
ALTER TABLE "Convention" ADD CONSTRAINT "Convention_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "ConventionSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
