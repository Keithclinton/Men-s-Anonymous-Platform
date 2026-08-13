import { Worker } from 'bullmq';
import IORedis from 'ioredis';

/** Must match apps/api/src/modules/notifications/queue.notifier.ts's NOTIFICATIONS_QUEUE. */
const QUEUE_NAME = 'notifications';

interface NotificationJob {
  to: string;
  channel: 'email' | 'sms' | 'push';
  template: string;
  data?: Record<string, unknown>;
}

/**
 * Actually delivers what NotificationsService (apps/api) enqueued. Deliberately has no
 * database/vault access — the payload already carries a resolved address and a generic
 * template name, nothing that requires looking anything up. See ARCHITECTURE.md §4/§6.
 *
 * TODO: swap the console.log for real SendGrid/Twilio/FCM calls, branching on channel.
 */
export function startNotificationsWorker(connection: IORedis): Worker<NotificationJob> {
  const worker = new Worker<NotificationJob>(
    QUEUE_NAME,
    async (job) => {
      console.log(`[notifications] [${job.data.channel}] -> ${job.data.to} :: ${job.data.template}`);
    },
    { connection },
  );

  worker.on('failed', (job, err) => {
    console.error(`[notifications] job ${job?.id} failed: ${err.message}`);
  });

  return worker;
}
