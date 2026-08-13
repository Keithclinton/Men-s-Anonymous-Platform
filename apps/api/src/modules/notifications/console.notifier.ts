import { Injectable, Logger } from '@nestjs/common';
import { NotificationPayload, Notifier } from './notifier.interface';

/**
 * Logs instead of sending. Handy for local dev when you don't want to run apps/worker —
 * swap it in via NotificationsModule in place of QueueNotifier. Production should use
 * QueueNotifier (or a direct SendGrid/Twilio/FCM implementation), not this one.
 */
@Injectable()
export class ConsoleNotifier implements Notifier {
  private readonly logger = new Logger(ConsoleNotifier.name);

  async send(payload: NotificationPayload): Promise<void> {
    this.logger.log(`[${payload.channel}] -> ${payload.to} :: ${payload.template}`);
  }
}
