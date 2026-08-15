-- AlterEnum
CREATE TYPE "RevealLevel" AS ENUM ('ANONYMOUS', 'FIRST_NAME', 'FULL_NAME', 'NAME_PHOTO');

-- CreateTable
CREATE TABLE "identity_reveal_grants" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "bookingId" TEXT,
    "level" "RevealLevel" NOT NULL DEFAULT 'ANONYMOUS',
    "firstName" TEXT,
    "fullName" TEXT,
    "photoUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "identity_reveal_grants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "identity_reveal_grants_clientId_idx" ON "identity_reveal_grants"("clientId");

-- CreateIndex
CREATE INDEX "identity_reveal_grants_providerId_idx" ON "identity_reveal_grants"("providerId");

-- CreateIndex
CREATE INDEX "identity_reveal_grants_bookingId_idx" ON "identity_reveal_grants"("bookingId");

-- AddForeignKey
ALTER TABLE "identity_reveal_grants" ADD CONSTRAINT "identity_reveal_grants_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_reveal_grants" ADD CONSTRAINT "identity_reveal_grants_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
