import { Inject, Injectable } from '@nestjs/common';
import { IdentityVaultService } from '../identity-vault/identity-vault.service';
import { NOTIFIER, Notifier } from './notifier.interface';

/**
 * Content stays deliberately generic ("You have a new session reminder," never "your
 * therapy session") — delivery itself can leak sensitive context to a shared inbox or
 * lock screen. See ARCHITECTURE.md §4 and §10c.
 */
@Injectable()
export class NotificationsService {
  constructor(
    private readonly vault: IdentityVaultService,
    @Inject(NOTIFIER) private readonly notifier: Notifier,
  ) {}

  async notifyNewSessionRequest(providerId: string): Promise<void> {
    const contact = await this.vault.getContact(providerId, {
      actorPseudonym: 'system',
      reason: 'new_session_request_notification',
    });
    if (!contact.email) return;
    await this.notifier.send({
      to: contact.email,
      channel: 'email',
      template: 'new-session-request',
    });
  }
}
