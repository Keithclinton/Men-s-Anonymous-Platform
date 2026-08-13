import { Injectable } from '@nestjs/common';
import { CorePrismaService } from '../../common/prisma/core-prisma.service';
import { Prisma } from '../../generated/prisma-core';

export interface RecordAuditParams {
  actorPseudonym: string;
  action: string;
  target: string;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Every admin action that touches a user record — suspend, refund, vault access — writes
 * here, no exceptions. See ARCHITECTURE.md §9. Vault access itself is additionally logged
 * in its own database by IdentityVaultService, so that trail survives independently.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: CorePrismaService) {}

  async record(params: RecordAuditParams): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorPseudonym: params.actorPseudonym,
        action: params.action,
        target: params.target,
        metadata: params.metadata ?? Prisma.JsonNull,
      },
    });
  }
}
