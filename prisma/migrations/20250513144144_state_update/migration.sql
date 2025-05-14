/*
  Warnings:

  - You are about to drop the column `state` on the `Convention` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Convention" DROP COLUMN "state",
ADD COLUMN     "stateAbbreviation" TEXT,
ADD COLUMN     "stateName" TEXT;
