import { Module } from '@nestjs/common';
import { IdentityVaultModule } from '../identity-vault/identity-vault.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [IdentityVaultModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
