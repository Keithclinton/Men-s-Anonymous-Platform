import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

/** Must match the queue name apps/worker/src/processors/match-expiry.processor.ts listens on. */
export const MATCH_EXPIRY_QUEUE = 'match-expiry';

/** Accept/decline window before a queued request gets reassigned. See ARCHITECTURE.md §10b. */
export const MATCH_EXPIRY_DELAY_MS = 15 * 60_000;

@Injectable()
export class MatchExpiryQueue implements OnModuleDestroy {
  private readonly connection: IORedis;
  private readonly queue: Queue<{ bookingId: string }>;

  constructor(config: ConfigService) {
    this.connection = new IORedis(config.getOrThrow<string>('REDIS_URL'), {
      maxRetriesPerRequest: null,
    });
    this.queue = new Queue(MATCH_EXPIRY_QUEUE, { connection: this.connection });
  }

  async schedule(bookingId: string): Promise<void> {
    await this.queue.add(
      'expire',
      { bookingId },
      { delay: MATCH_EXPIRY_DELAY_MS, removeOnComplete: true, removeOnFail: true },
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
    this.connection.disconnect();
  }
}
