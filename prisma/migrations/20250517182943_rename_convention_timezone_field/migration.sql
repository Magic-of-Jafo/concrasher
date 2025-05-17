/*
  Warnings:

  - You are about to drop the column `eventTimezone` on the `Convention` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Convention" DROP COLUMN "eventTimezone",
ADD COLUMN     "timezone" TEXT;
