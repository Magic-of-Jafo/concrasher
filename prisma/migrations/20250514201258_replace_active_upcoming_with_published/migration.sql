/*
  Warnings:

  - The values [UPCOMING,ACTIVE] on the enum `ConventionStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ConventionStatus_new" AS ENUM ('DRAFT', 'PUBLISHED', 'PAST', 'CANCELLED');
ALTER TABLE "Convention" ALTER COLUMN "status" TYPE "ConventionStatus_new" USING ("status"::text::"ConventionStatus_new");
ALTER TYPE "ConventionStatus" RENAME TO "ConventionStatus_old";
ALTER TYPE "ConventionStatus_new" RENAME TO "ConventionStatus";
DROP TYPE "ConventionStatus_old";
COMMIT;
