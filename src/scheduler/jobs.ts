import cron from 'node-cron';
import { env } from '../infra/env.js';
import { logger } from '../infra/logger.js';
import { runLinkedinIdeasJob } from '../modules/linkedin-ideas/index.js';

export function startScheduler(): void {
  logger.info(
    { cron: env.LINKEDIN_IDEAS_CRON, tz: env.LINKEDIN_IDEAS_TIMEZONE },
    'scheduler: registering linkedin-ideas job'
  );

  cron.schedule(
    env.LINKEDIN_IDEAS_CRON,
    () => {
      logger.info('scheduler: triggering linkedin-ideas');
      runLinkedinIdeasJob().catch((err) => {
        logger.error({ err }, 'scheduler: linkedin-ideas crashed');
      });
    },
    { timezone: env.LINKEDIN_IDEAS_TIMEZONE }
  );
}
