import { Module } from '@nestjs/common';
import { IdentityVaultModule } from '../identity-vault/identity-vault.module';
import { UsersModule } from '../users/users.module';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';

@Module({
  imports: [IdentityVaultModule, UsersModule],
  controllers: [ProvidersController],
  providers: [ProvidersService],
  exports: [ProvidersService],
})
export class ProvidersModule {}
