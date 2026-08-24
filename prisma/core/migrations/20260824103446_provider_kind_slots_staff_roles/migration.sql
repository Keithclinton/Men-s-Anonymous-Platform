-- CreateEnum
CREATE TYPE "ProviderKind" AS ENUM ('COUNSELOR', 'MODERATOR');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('SUPPORT_AGENT', 'STAFF_MODERATOR', 'COMPLIANCE_OFFICER', 'SUPER_ADMIN');

-- AlterTable
ALTER TABLE "provider_profiles" ADD COLUMN     "kind" "ProviderKind" NOT NULL DEFAULT 'COUNSELOR';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "staffRole" "StaffRole";

-- CreateTable
CREATE TABLE "availability_slots" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "bookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "availability_slots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "availability_slots_bookingId_key" ON "availability_slots"("bookingId");

-- CreateIndex
CREATE INDEX "availability_slots_providerId_idx" ON "availability_slots"("providerId");

-- AddForeignKey
ALTER TABLE "availability_slots" ADD CONSTRAINT "availability_slots_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_slots" ADD CONSTRAINT "availability_slots_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
