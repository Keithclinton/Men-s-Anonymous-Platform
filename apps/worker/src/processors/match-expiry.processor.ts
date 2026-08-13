import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import axios from 'axios';

/** Must match apps/api/src/modules/matching/match-expiry.queue.ts's MATCH_EXPIRY_QUEUE. */
const QUEUE_NAME = 'match-expiry';

export interface MatchExpiryConfig {
  apiBaseUrl: string;
  internalSecret: string;
}

interface MatchExpiryJob {
  bookingId: string;
}

/**
 * One delayed job per queued match request (see ARCHITECTURE.md §10b's 15-minute
 * accept/decline window). Fires once, checks in with apps/api, which owns the actual
 * reassignment logic and DB access — this just triggers it on schedule.
 */
export function startMatchExpiryWorker(
  connection: IORedis,
  config: MatchExpiryConfig,
): Worker<MatchExpiryJob> {
  const worker = new Worker<MatchExpiryJob>(
    QUEUE_NAME,
    async (job) => {
      const { data } = await axios.post(
        `${config.apiBaseUrl}/matching/internal/expire`,
        { bookingId: job.data.bookingId },
        { headers: { 'x-internal-secret': config.internalSecret } },
      );
      if (data.reassigned) {
        console.log(`[match-expiry] booking ${job.data.bookingId} reassigned/cancelled`);
      }
    },
    { connection },
  );

  worker.on('failed', (job, err) => {
    console.error(`[match-expiry] job ${job?.id} failed: ${err.message}`);
  });

  return worker;
}
