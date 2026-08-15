import { Module } from '@nestjs/common';
import { IdentityVaultModule } from '../identity-vault/identity-vault.module';
import { ConsoleNotifier } from './console.notifier';
import { NOTIFIER } from './notifier.interface';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [IdentityVaultModule],
  providers: [NotificationsService, { provide: NOTIFIER, useClass: ConsoleNotifier }],
  exports: [NotificationsService],
})
export class NotificationsModule {}
