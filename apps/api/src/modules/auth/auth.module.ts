import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { IdentityVaultModule } from '../identity-vault/identity-vault.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  // Secrets/TTLs are passed per-call in AuthService (access vs refresh differ), so this
  // registers JwtService without a fixed global config.
  imports: [PassportModule, JwtModule.register({}), IdentityVaultModule],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
