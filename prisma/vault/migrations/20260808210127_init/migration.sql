-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ProviderVerificationDecision" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "identity_records" (
    "pseudonymId" TEXT NOT NULL,
    "encryptedName" TEXT,
    "encryptedEmail" TEXT,
    "encryptedPhone" TEXT,
    "encryptedPaymentRef" TEXT,
    "emailHash" TEXT,
    "phoneHash" TEXT,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "identity_records_pkey" PRIMARY KEY ("pseudonymId")
);

-- CreateTable
CREATE TABLE "provider_verifications" (
    "id" TEXT NOT NULL,
    "pseudonymId" TEXT NOT NULL,
    "encryptedLicenseNumber" TEXT NOT NULL,
    "documentRefs" JSONB NOT NULL,
    "verifyingBody" TEXT,
    "expiryDate" TIMESTAMP(3),
    "reviewerPseudonym" TEXT,
    "decision" "ProviderVerificationDecision" NOT NULL DEFAULT 'PENDING',
    "decisionAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vault_audit_logs" (
    "id" TEXT NOT NULL,
    "actorPseudonym" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetPseudonym" TEXT NOT NULL,
    "reason" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vault_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "identity_records_emailHash_key" ON "identity_records"("emailHash");

-- CreateIndex
CREATE UNIQUE INDEX "identity_records_phoneHash_key" ON "identity_records"("phoneHash");

-- CreateIndex
CREATE INDEX "provider_verifications_pseudonymId_idx" ON "provider_verifications"("pseudonymId");

-- CreateIndex
CREATE INDEX "vault_audit_logs_actorPseudonym_idx" ON "vault_audit_logs"("actorPseudonym");

-- CreateIndex
CREATE INDEX "vault_audit_logs_targetPseudonym_idx" ON "vault_audit_logs"("targetPseudonym");

-- CreateIndex
CREATE INDEX "vault_audit_logs_timestamp_idx" ON "vault_audit_logs"("timestamp");
