import { Injectable } from '@nestjs/common';
import { CorePrismaService } from '../../common/prisma/core-prisma.service';
import { AuditService } from '../audit/audit.service';
import { IdentityVaultService } from '../identity-vault/identity-vault.service';

/**
 * Backs the separate admin frontend from ARCHITECTURE.md §9: provider verification queue,
 * user/booking oversight, break-glass vault access, aggregate-only analytics.
 *
 * The schema only has a single ADMIN role today — §9a's sub-role split (support agent /
 * moderator / compliance officer / super admin) needs its own role dimension to enforce
 * properly and is a deliberate follow-up, not done here. Every method below still writes
 * its own audit trail so that split can be retrofitted without losing history.
 */
@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: CorePrismaService,
    private readonly vault: IdentityVaultService,
    private readonly audit: AuditService,
  ) {}

  async listPendingVerifications(adminId: string) {
    return this.vault.listPendingVerifications({
      actorPseudonym: adminId,
      reason: 'admin_review_queue',
    });
  }

  async getVerificationDetail(id: string, adminId: string) {
    return this.vault.getVerificationDetail(id, {
      actorPseudonym: adminId,
      reason: 'admin_review_detail',
    });
  }

  async decideVerification(id: string, decision: 'APPROVED' | 'REJECTED', adminId: string) {
    const result = await this.vault.decideVerification(id, decision, {
      actorPseudonym: adminId,
      reason: `admin_decision_${decision.toLowerCase()}`,
    });
    await this.audit.record({
      actorPseudonym: adminId,
      action: `PROVIDER_VERIFICATION_${decision}`,
      target: result.pseudonymId,
    });
    return result;
  }

  async suspendUser(userId: string, adminId: string) {
    const user = await this.prisma.user.update({ where: { id: userId }, data: { status: 'SUSPENDED' } });
    await this.audit.record({ actorPseudonym: adminId, action: 'SUSPEND_USER', target: userId });
    return user;
  }

  async reinstateUser(userId: string, adminId: string) {
    const user = await this.prisma.user.update({ where: { id: userId }, data: { status: 'ACTIVE' } });
    await this.audit.record({ actorPseudonym: adminId, action: 'REINSTATE_USER', target: userId });
    return user;
  }

  async listAuditLogs(limit = 100) {
    return this.prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: Math.min(limit, 500),
    });
  }

  /** Time-boxed only in the sense that it's logged with a mandatory reason — real
   * time-boxing (auto-expiring access, dual-control) is a §9 follow-up, not built here. */
  async breakGlassIdentity(pseudonymId: string, adminId: string, reason: string) {
    const record = await this.vault.getFullRecordForCompliance(pseudonymId, {
      actorPseudonym: adminId,
      reason,
    });
    await this.audit.record({
      actorPseudonym: adminId,
      action: 'BREAK_GLASS_VAULT_ACCESS',
      target: pseudonymId,
      metadata: { reason },
    });
    return record;
  }
}
