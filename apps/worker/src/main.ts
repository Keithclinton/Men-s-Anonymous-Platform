import { Worker } from 'bullmq';
import IORedis from 'ioredis';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

async function main() {
  const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

  // Placeholder worker — billing reconciliation / notifications / matching land here.
  const worker = new Worker(
    'map-jobs',
    async (job) => {
      console.log(`processed job ${job.name}#${job.id}`);
    },
    { connection },
  );

  worker.on('ready', () => console.log('Worker ready (queue: map-jobs)'));
  worker.on('failed', (job, err) =>
    console.error(`job ${job?.id} failed:`, err.message),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
