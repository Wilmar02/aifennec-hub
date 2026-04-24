import { logger } from './infra/logger.js';
import { startScheduler } from './scheduler/jobs.js';
import { startBot } from './channels/telegram.js';

async function main(): Promise<void> {
  logger.info('aifennec-hub: starting');
  startScheduler();
  logger.info('aifennec-hub: scheduler running');
  // Bot en paralelo (long polling bloquea, lo lanzamos sin await)
  startBot().catch((err) => logger.error({ err }, 'telegram: bot crashed'));
  logger.info('aifennec-hub: bot started, waiting for commands + cron triggers');
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
