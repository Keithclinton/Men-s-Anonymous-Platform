import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma-vault';

/**
 * Identity vault database: real PII only, isolated from the app core.
 *
 * Deliberately not exported for direct injection into feature modules — go through
 * IdentityVaultService (modules/identity-vault) instead, which audit-logs every access.
 * See ARCHITECTURE.md §3.
 */
@Injectable()
export class VaultPrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(VaultPrismaService.name);

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Connected to identity vault database');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
