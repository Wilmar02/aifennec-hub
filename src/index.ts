import { logger } from './infra/logger.js';
import { startScheduler } from './scheduler/jobs.js';

async function main(): Promise<void> {
  logger.info('aifennec-hub: starting');
  startScheduler();
  logger.info('aifennec-hub: scheduler running, waiting for cron triggers');
}

main().catch((err) => {
  logger.error({ err }, 'aifennec-hub: bootstrap failed');
  process.exit(1);
});

process.on('SIGTERM', () => {
  logger.info('aifennec-hub: SIGTERM received, exiting');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('aifennec-hub: SIGINT received, exiting');
  process.exit(0);
});
