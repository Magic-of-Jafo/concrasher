-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Convention" ADD COLUMN     "seriesId" TEXT;

-- CreateTable
CREATE TABLE "ConventionSeries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizerUserId" TEXT NOT NULL,

    CONSTRAINT "ConventionSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestedRole" "Role" NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoleRequest_userId_requestedRole_key" ON "RoleRequest"("userId", "requestedRole");

-- AddForeignKey
ALTER TABLE "ConventionSeries" ADD CONSTRAINT "ConventionSeries_organizerUserId_fkey" FOREIGN KEY ("organizerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Convention" ADD CONSTRAINT "Convention_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "ConventionSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleRequest" ADD CONSTRAINT "RoleRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create default series for existing conventions
INSERT INTO "ConventionSeries" ("id", "name", "organizerUserId", "createdAt", "updatedAt")
SELECT
  substr(md5(random()::text), 1, 24),
  'Legacy Series for ' || u."name",
  u."id",
  NOW(),
  NOW()
FROM "User" u
WHERE EXISTS (
  SELECT 1 FROM "Convention" c WHERE c."organizerUserId" = u."id"
);

-- Update existing conventions to point to their series
UPDATE "Convention" c
SET "seriesId" = (
  SELECT cs."id"
  FROM "ConventionSeries" cs
  WHERE cs."organizerUserId" = c."organizerUserId"
  ORDER BY cs."createdAt" ASC
  LIMIT 1
)
WHERE c."seriesId" IS NULL;

-- Make seriesId required
ALTER TABLE "Convention" ALTER COLUMN "seriesId" SET NOT NULL;