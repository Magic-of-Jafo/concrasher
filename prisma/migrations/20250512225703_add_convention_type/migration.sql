-- CreateEnum
CREATE TYPE "ConventionType" AS ENUM ('GAMING', 'ANIME', 'COMIC', 'SCI_FI', 'FANTASY', 'HORROR', 'GENERAL', 'OTHER');

-- AlterTable
ALTER TABLE "Convention" ADD COLUMN     "type" "ConventionType" NOT NULL DEFAULT 'GENERAL';
