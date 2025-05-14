/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `ConventionSeries` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `ConventionSeries` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ConventionSeries" ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "slug" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ConventionSeries_slug_key" ON "ConventionSeries"("slug");
