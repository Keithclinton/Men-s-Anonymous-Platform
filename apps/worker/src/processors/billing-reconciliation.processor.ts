import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import axios from 'axios';

const QUEUE_NAME = 'billing-reconciliation';
const SWEEP_INTERVAL_MS = 5 * 60_000;

export interface ReconciliationConfig {
  apiBaseUrl: string;
  internalSecret: string;
}

/**
 * Callbacks from M-Pesa occasionally never arrive (network drop, user closes the prompt).
 * This repeatable job sweeps every 5 minutes and asks the api process to reconcile any
 * payment still PENDING past the grace period. See ARCHITECTURE.md §11b.
 *
 * The actual DB/gateway access stays in apps/api's BillingService — this just triggers it
 * over an internal, secret-guarded endpoint, so business logic has one home.
 */
export async function startBillingReconciliation(
  connection: IORedis,
  config: ReconciliationConfig,
): Promise<{ queue: Queue; worker: Worker }> {
  const queue = new Queue(QUEUE_NAME, { connection });
  await queue.add(
    'sweep',
    {},
    {
      repeat: { every: SWEEP_INTERVAL_MS },
      removeOnComplete: true,
      removeOnFail: 50,
    },
  );

  const worker = new Worker(
    QUEUE_NAME,
    async () => {
      const { data } = await axios.post(
        `${config.apiBaseUrl}/billing/internal/reconcile`,
        {},
        { headers: { 'x-internal-secret': config.internalSecret } },
      );
      if (data.resolved > 0) {
        console.log(`[billing-reconciliation] resolved ${data.resolved} stuck payment(s)`);
      }
    },
    { connection },
  );

  worker.on('failed', (job, err) => {
    console.error(`[billing-reconciliation] sweep failed: ${err.message}`);
  });

  return { queue, worker };
}
