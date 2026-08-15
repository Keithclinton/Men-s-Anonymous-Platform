-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "matchExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "bookings_status_matchExpiresAt_idx" ON "bookings"("status", "matchExpiresAt");
