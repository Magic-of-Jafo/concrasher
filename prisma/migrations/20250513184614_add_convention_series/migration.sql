-- DropForeignKey
ALTER TABLE "Convention" DROP CONSTRAINT "Convention_seriesId_fkey";

-- AddForeignKey
ALTER TABLE "Convention" ADD CONSTRAINT "Convention_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "ConventionSeries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
