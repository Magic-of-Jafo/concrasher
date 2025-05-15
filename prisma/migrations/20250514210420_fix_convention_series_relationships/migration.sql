/*
  Warnings:

  - You are about to drop the column `conventionSeriesId` on the `Convention` table. All the data in the column will be lost.
  - You are about to drop the column `organizerUserId` on the `Convention` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Convention" DROP CONSTRAINT "Convention_organizerUserId_fkey";

-- AlterTable
ALTER TABLE "Convention" DROP COLUMN "conventionSeriesId",
DROP COLUMN "organizerUserId";
