import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

export interface StoredMessage {
  id: string;
  bookingId: string;
  sessionId: string;
  senderId: string;
  senderHandle: string;
  body: string;
  createdAt: string;
}

/**
 * REST message relay for the chat room screen (apps/web polls this — see
 * docs/backend-realtime-api.md). Deliberately Redis-only: message *content* never touches
 * Postgres, same rule modules/chat's Socket.IO gateway follows. Keyed by Session.id, not
 * bookingId, so a stale key can never outlive the session it belongs to.
 */
@Injectable()
export class SessionMessagesService implements OnModuleDestroy {
  private readonly logger = new Logger(SessionMessagesService.name);
  private readonly redis: Redis;

  constructor(config: ConfigService) {
    this.redis = new Redis(config.getOrThrow<string>('REDIS_URL'), { maxRetriesPerRequest: null });
    this.redis.on('error', (err) => this.logger.error(`Redis error: ${err.message}`));
  }

  onModuleDestroy() {
    this.redis.disconnect();
  }

  private key(sessionId: string): string {
    return `session-messages:${sessionId}`;
  }

  async list(sessionId: string, after?: string): Promise<StoredMessage[]> {
    const raw = await this.redis.lrange(this.key(sessionId), 0, -1);
    const rows = raw.map((row) => JSON.parse(row) as StoredMessage);
    const filtered = after ? rows.filter((row) => row.createdAt > after) : rows;
    filtered.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return filtered;
  }

  async append(message: StoredMessage, ttlSeconds: number): Promise<void> {
    const key = this.key(message.sessionId);
    await this.redis.rpush(key, JSON.stringify(message));
    await this.redis.expire(key, ttlSeconds);
  }

  async clear(sessionId: string): Promise<void> {
    await this.redis.del(this.key(sessionId));
  }
}
