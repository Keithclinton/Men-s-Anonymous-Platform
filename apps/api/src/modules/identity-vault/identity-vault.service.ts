import { Injectable, Logger } from '@nestjs/common';
import { EncryptionService } from '../../common/encryption/encryption.service';
import { VaultPrismaService } from '../../common/prisma/vault-prisma.service';
import { Prisma } from '../../generated/prisma-vault';

export interface VaultAccessContext {
  /** pseudonym_id of whoever/whatever is making this request — a user, or 'system'. */
  actorPseudonym: string;
  reason: string;
}

export interface CreateIdentityInput {
  pseudonymId: string;
  name?: string;
  email?: string;
  phone?: string;
}

export interface ContactInfo {
  email: string | null;
  phone: string | null;
}

export interface SubmitVerificationInput {
  pseudonymId: string;
  licenseNumber: string;
  documentRefs: Prisma.InputJsonValue;
  verifyingBody?: string;
  expiryDate?: Date;
}

export interface PendingVerificationSummary {
  id: string;
  pseudonymId: string;
  verifyingBody: string | null;
  expiryDate: Date | null;
  createdAt: Date;
}

export interface VerificationDetail extends PendingVerificationSummary {
  licenseNumber: string;
  documentRefs: unknown;
  decision: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export type VerificationDecision = 'APPROVED' | 'REJECTED';

/**
 * The ONLY module allowed to touch VaultPrismaService (enforced by VaultPrismaModule not
 * being global — see common/prisma/vault-prisma.module.ts). Every method here writes to
 * VaultAuditLog before returning, no exceptions. See ARCHITECTURE.md §3.
 */
@Injectable()
export class IdentityVaultService {
  private readonly logger = new Logger(IdentityVaultService.name);

  constructor(
    private readonly vault: VaultPrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async createIdentity(input: CreateIdentityInput, ctx: VaultAccessContext): Promise<void> {
    await this.vault.identityRecord.create({
      data: {
        pseudonymId: input.pseudonymId,
        encryptedName: this.encryption.encryptOrNull(input.name),
        encryptedEmail: this.encryption.encryptOrNull(input.email),
        encryptedPhone: this.encryption.encryptOrNull(input.phone),
        emailHash: input.email ? this.encryption.hashForLookup(input.email) : null,
        phoneHash: input.phone ? this.encryption.hashForLookup(input.phone) : null,
      },
    });
    await this.logAccess('CREATE_IDENTITY', input.pseudonymId, ctx);
  }

  /**
   * Account recovery / "is this email already in use" — the one legitimate way to go
   * email -> pseudonym. Uses the deterministic hash index, never decrypts anything to search.
   */
  async findPseudonymByEmail(email: string, ctx: VaultAccessContext): Promise<string | null> {
    const record = await this.vault.identityRecord.findUnique({
      where: { emailHash: this.encryption.hashForLookup(email) },
      select: { pseudonymId: true },
    });
    await this.logAccess('LOOKUP_BY_EMAIL', record?.pseudonymId ?? 'not_found', ctx);
    return record?.pseudonymId ?? null;
  }

  async findPseudonymByPhone(phone: string, ctx: VaultAccessContext): Promise<string | null> {
    const record = await this.vault.identityRecord.findUnique({
      where: { phoneHash: this.encryption.hashForLookup(phone) },
      select: { pseudonymId: true },
    });
    await this.logAccess('LOOKUP_BY_PHONE', record?.pseudonymId ?? 'not_found', ctx);
    return record?.pseudonymId ?? null;
  }

  /** For actually delivering something (email/SMS) — content must stay generic, see §4/notifications. */
  async getContact(pseudonymId: string, ctx: VaultAccessContext): Promise<ContactInfo> {
    const record = await this.vault.identityRecord.findUnique({ where: { pseudonymId } });
    await this.logAccess('READ_CONTACT', pseudonymId, ctx);
    return {
      email: this.encryption.decryptOrNull(record?.encryptedEmail),
      phone: this.encryption.decryptOrNull(record?.encryptedPhone),
    };
  }

  /** Break-glass path for admin/compliance — every call here should be rare and justified. */
  async getFullRecordForCompliance(pseudonymId: string, ctx: VaultAccessContext) {
    const record = await this.vault.identityRecord.findUnique({ where: { pseudonymId } });
    await this.logAccess('BREAK_GLASS_READ', pseudonymId, ctx);
    if (!record) return null;
    return {
      pseudonymId: record.pseudonymId,
      name: this.encryption.decryptOrNull(record.encryptedName),
      email: this.encryption.decryptOrNull(record.encryptedEmail),
      phone: this.encryption.decryptOrNull(record.encryptedPhone),
      verificationStatus: record.verificationStatus,
    };
  }

  /** Lightweight check for routine gating (e.g. "can this provider publish a profile") — distinct from the break-glass full read below. */
  async isVerified(pseudonymId: string, ctx: VaultAccessContext): Promise<boolean> {
    const record = await this.vault.identityRecord.findUnique({
      where: { pseudonymId },
      select: { verificationStatus: true },
    });
    await this.logAccess('CHECK_VERIFICATION_STATUS', pseudonymId, ctx);
    return record?.verificationStatus === 'VERIFIED';
  }

  /** Provider onboarding step 2 — see ARCHITECTURE.md §10a. Encrypted, admin-only to read. */
  async submitProviderVerification(
    input: SubmitVerificationInput,
    ctx: VaultAccessContext,
  ): Promise<{ id: string }> {
    const record = await this.vault.providerVerification.create({
      data: {
        pseudonymId: input.pseudonymId,
        encryptedLicenseNumber: this.encryption.encrypt(input.licenseNumber),
        documentRefs: input.documentRefs,
        verifyingBody: input.verifyingBody,
        expiryDate: input.expiryDate,
      },
    });
    await this.logAccess('SUBMIT_PROVIDER_VERIFICATION', input.pseudonymId, ctx);
    return { id: record.id };
  }

  /** Admin/compliance review queue — never decrypts the license number, just what's needed to triage. */
  async listPendingVerifications(ctx: VaultAccessContext): Promise<PendingVerificationSummary[]> {
    const records = await this.vault.providerVerification.findMany({
      where: { decision: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });
    await this.logAccess('LIST_PENDING_VERIFICATIONS', 'multiple', ctx);
    return records.map((r) => ({
      id: r.id,
      pseudonymId: r.pseudonymId,
      verifyingBody: r.verifyingBody,
      expiryDate: r.expiryDate,
      createdAt: r.createdAt,
    }));
  }

  /** Full detail, license number decrypted — a reviewer actually confirming credentials. */
  async getVerificationDetail(id: string, ctx: VaultAccessContext): Promise<VerificationDetail | null> {
    const record = await this.vault.providerVerification.findUnique({ where: { id } });
    if (!record) return null;
    await this.logAccess('READ_VERIFICATION_DETAIL', record.pseudonymId, ctx);
    return {
      id: record.id,
      pseudonymId: record.pseudonymId,
      licenseNumber: this.encryption.decrypt(record.encryptedLicenseNumber),
      documentRefs: record.documentRefs,
      verifyingBody: record.verifyingBody,
      expiryDate: record.expiryDate,
      decision: record.decision,
      createdAt: record.createdAt,
    };
  }

  async decideVerification(
    id: string,
    decision: VerificationDecision,
    ctx: VaultAccessContext,
  ): Promise<{ pseudonymId: string }> {
    const record = await this.vault.providerVerification.update({
      where: { id },
      data: { decision, decisionAt: new Date(), reviewerPseudonym: ctx.actorPseudonym },
    });

    await this.vault.identityRecord.upsert({
      where: { pseudonymId: record.pseudonymId },
      create: {
        pseudonymId: record.pseudonymId,
        verificationStatus: decision === 'APPROVED' ? 'VERIFIED' : 'REJECTED',
      },
      update: { verificationStatus: decision === 'APPROVED' ? 'VERIFIED' : 'REJECTED' },
    });

    await this.logAccess(`DECIDE_VERIFICATION_${decision}`, record.pseudonymId, ctx);
    return { pseudonymId: record.pseudonymId };
  }

  private async logAccess(
    action: string,
    targetPseudonym: string,
    ctx: VaultAccessContext,
  ): Promise<void> {
    await this.vault.vaultAuditLog.create({
      data: {
        actorPseudonym: ctx.actorPseudonym,
        action,
        targetPseudonym,
        reason: ctx.reason,
      },
    });
    this.logger.log(`${ctx.actorPseudonym} :: ${action} :: ${targetPseudonym}`);
  }
}
