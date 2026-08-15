import { Injectable, Logger } from '@nestjs/common';
import { NotificationPayload, Notifier } from './notifier.interface';

/**
 * Logs instead of sending, called synchronously from NotificationsService — no queue or
 * persistent worker (this API runs on Vercel serverless functions, which have neither).
 * Swap for a real SendGrid/Twilio/FCM implementation behind the same Notifier interface
 * once a provider's chosen; NotificationsService doesn't need to change either way.
 */
@Injectable()
export class ConsoleNotifier implements Notifier {
  private readonly logger = new Logger(ConsoleNotifier.name);

  async send(payload: NotificationPayload): Promise<void> {
    this.logger.log(`[${payload.channel}] -> ${payload.to} :: ${payload.template}`);
  }
}
