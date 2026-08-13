import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { NotificationPayload, Notifier } from './notifier.interface';

/** Must match the queue name apps/worker/src/processors/notifications.processor.ts listens on. */
export const NOTIFICATIONS_QUEUE = 'notifications';

/**
 * Hands delivery off to apps/worker instead of sending inline — gets retries/backoff for
 * free and keeps the request/response cycle from waiting on an email/SMS provider.
 */
@Injectable()
export class QueueNotifier implements Notifier, OnModuleDestroy {
  private readonly connection: IORedis;
  private readonly queue: Queue<NotificationPayload>;

  constructor(config: ConfigService) {
    this.connection = new IORedis(config.getOrThrow<string>('REDIS_URL'), {
      maxRetriesPerRequest: null,
    });
    this.queue = new Queue(NOTIFICATIONS_QUEUE, { connection: this.connection });
  }

  async send(payload: NotificationPayload): Promise<void> {
    await this.queue.add('send', payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
    this.connection.disconnect();
  }
}
