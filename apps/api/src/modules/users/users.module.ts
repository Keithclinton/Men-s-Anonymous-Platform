import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { IdentityVaultModule } from '../identity-vault/identity-vault.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [AuditModule, IdentityVaultModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}