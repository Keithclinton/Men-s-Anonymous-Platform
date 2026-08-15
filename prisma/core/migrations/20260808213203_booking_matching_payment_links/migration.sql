-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "declinedProviderIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "specialty" TEXT;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "bookingId" TEXT;

-- CreateIndex
CREATE INDEX "payments_bookingId_idx" ON "payments"("bookingId");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
