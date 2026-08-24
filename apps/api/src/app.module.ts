import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { LoggerModule } from 'nestjs-pino';
import { validateEnv } from './common/config/env.validation';
import { pinoConfig } from './common/logger/pino.config';
import { CorePrismaModule } from './common/prisma/core-prisma.module';
import { EncryptionModule } from './common/encryption/encryption.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { StaffRolesGuard } from './common/guards/staff-roles.guard';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { HealthController } from './health.controller';

import { AuditModule } from './modules/audit/audit.module';
import { AuditInterceptor } from './modules/audit/audit.interceptor';
import { IdentityVaultModule } from './modules/identity-vault/identity-vault.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { MatchingModule } from './modules/matching/matching.module';
import { BookingModule } from './modules/booking/booking.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { BillingModule } from './modules/billing/billing.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SupportGroupsModule } from './modules/support-groups/support-groups.module';
import { ResourcesModule } from './modules/resources/resources.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    LoggerModule.forRoot(pinoConfig),
    // Global default: 100 req/min per IP. Auth routes set a tighter @Throttle() override —
    // see modules/auth/auth.controller.ts. Redis-backed storage is required, not optional,
    // here: this runs as Vercel serverless functions, so in-memory counters wouldn't
    // persist (or agree with each other) across invocations/instances.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [{ name: 'default', ttl: 60_000, limit: 100 }],
        storage: new ThrottlerStorageRedisService(config.getOrThrow<string>('REDIS_URL')),
      }),
    }),

    // Cross-cutting (global)
    CorePrismaModule,
    EncryptionModule,
    AuditModule,

    // Feature modules
    IdentityVaultModule,
    AuthModule,
    UsersModule,
    ProvidersModule,
    MatchingModule,
    BookingModule,
    SessionsModule,
    BillingModule,
    NotificationsModule,
    SupportGroupsModule,
    ResourcesModule,
    FeedbackModule,
    AdminModule,
  ],
  controllers: [HealthController],
  providers: [
    // Order matters: rate-limit first (cheapest check), then auth, then role checks.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Authenticated by default; routes opt out with @Public(). See common/guards.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: StaffRolesGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
