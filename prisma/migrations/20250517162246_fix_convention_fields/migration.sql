/*
  Warnings:

  - You are about to drop the column `bannerImageUrl` on the `Convention` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Convention` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Convention` table. All the data in the column will be lost.
  - You are about to drop the `RoleRequest` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "RoleRequest" DROP CONSTRAINT "RoleRequest_userId_fkey";

-- AlterTable
ALTER TABLE "Convention" DROP COLUMN "bannerImageUrl",
DROP COLUMN "description",
DROP COLUMN "type",
ADD COLUMN     "coverImageUrl" TEXT,
ADD COLUMN     "descriptionMain" TEXT,
ADD COLUMN     "descriptionShort" TEXT,
ADD COLUMN     "isOneDayEvent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isTBD" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "profileImageUrl" TEXT,
ALTER COLUMN "startDate" DROP NOT NULL,
ALTER COLUMN "endDate" DROP NOT NULL;

-- DropTable
DROP TABLE "RoleRequest";

-- DropEnum
DROP TYPE "ConventionType";

-- DropEnum
DROP TYPE "RequestStatus";

-- CreateTable
CREATE TABLE "PriceTier" (
    "id" TEXT NOT NULL,
    "conventionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceTier_pkey" PRIMARY KEY ("id")
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

    CONSTRAINT "PriceDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PriceDiscount_conventionId_priceTierId_cutoffDate_key" ON "PriceDiscount"("conventionId", "priceTierId", "cutoffDate");

-- AddForeignKey
ALTER TABLE "PriceTier" ADD CONSTRAINT "PriceTier_conventionId_fkey" FOREIGN KEY ("conventionId") REFERENCES "Convention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceDiscount" ADD CONSTRAINT "PriceDiscount_conventionId_fkey" FOREIGN KEY ("conventionId") REFERENCES "Convention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceDiscount" ADD CONSTRAINT "PriceDiscount_priceTierId_fkey" FOREIGN KEY ("priceTierId") REFERENCES "PriceTier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
