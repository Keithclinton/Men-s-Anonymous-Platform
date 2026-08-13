import { Module } from '@nestjs/common';
import { IdentityVaultModule } from '../identity-vault/identity-vault.module';
import { NOTIFIER } from './notifier.interface';
import { NotificationsService } from './notifications.service';
import { QueueNotifier } from './queue.notifier';

@Module({
  imports: [IdentityVaultModule],
  providers: [
    NotificationsService,
    // Delivery happens in apps/worker (see processors/notifications.processor.ts).
    // Swap to ConsoleNotifier for local dev without running the worker/Redis.
    { provide: NOTIFIER, useClass: QueueNotifier },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
