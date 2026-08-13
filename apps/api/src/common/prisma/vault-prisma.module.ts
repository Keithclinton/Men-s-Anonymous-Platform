import { Module } from '@nestjs/common';
import { VaultPrismaService } from './vault-prisma.service';

/**
 * Deliberately NOT @Global(). Only IdentityVaultModule should import this — that's what
 * keeps "only a narrow internal service can query the vault" true in code, not just in docs.
 */
@Module({
  providers: [VaultPrismaService],
  exports: [VaultPrismaService],
})
export class VaultPrismaModule {}
