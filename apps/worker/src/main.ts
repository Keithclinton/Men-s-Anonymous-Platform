import 'dotenv/config';
import IORedis from 'ioredis';
import { startBillingReconciliation } from './processors/billing-reconciliation.processor';
import { startMatchExpiryWorker } from './processors/match-expiry.processor';
import { startNotificationsWorker } from './processors/notifications.processor';

async function bootstrap() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error('REDIS_URL is required');
  }
  const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
  const internalApiConfig = {
    apiBaseUrl: process.env.API_INTERNAL_URL ?? 'http://localhost:3000',
    internalSecret: process.env.INTERNAL_API_SECRET ?? '',
  };

  startNotificationsWorker(connection);
  startMatchExpiryWorker(connection, internalApiConfig);
  await startBillingReconciliation(connection, internalApiConfig);

  console.log('Worker started — consuming: notifications, billing-reconciliation, match-expiry');
}

bootstrap().catch((err) => {
  console.error('Worker failed to start:', err);
  process.exit(1);
});
