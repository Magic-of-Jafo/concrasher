BEGIN;

-- Add the talent-controlled promotional media type.
ALTER TYPE "MediaType" ADD VALUE IF NOT EXISTS 'PROMO_IMAGE';

-- Add organizer-controlled convention talent-card presentation fields.
ALTER TABLE "ConventionTalent"
  ADD COLUMN IF NOT EXISTS "order" INTEGER,
  ADD COLUMN IF NOT EXISTS "isVisible" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "isHeadliner" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

COMMIT;
