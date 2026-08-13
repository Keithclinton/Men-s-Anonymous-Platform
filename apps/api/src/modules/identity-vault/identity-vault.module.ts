import { Module } from '@nestjs/common';
import { VaultPrismaModule } from '../../common/prisma/vault-prisma.module';
import { IdentityVaultService } from './identity-vault.service';

@Module({
  imports: [VaultPrismaModule],
  providers: [IdentityVaultService],
  exports: [IdentityVaultService],
})
export class IdentityVaultModule {}
