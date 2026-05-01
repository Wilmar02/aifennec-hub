import cron from 'node-cron';
import { env } from '../infra/env.js';
import { logger } from '../infra/logger.js';
import { runLinkedinIdeasJob } from '../modules/linkedin-ideas/index.js';
import { runCobranzaJob } from '../modules/cobranza/index.js';
import { runCuotasResumenMensual, runCuotasRecordatorioDiario } from '../modules/gastos/cuotas-cron.js';

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

  if (env.GHL_TOKEN) {
    logger.info(
      { cron: env.COBRANZA_CRON, tz: env.COBRANZA_TIMEZONE, dryRun: env.COBRANZA_DRY_RUN },
      'scheduler: registering cobranza job'
    );
    cron.schedule(
      env.COBRANZA_CRON,
      () => {
        logger.info('scheduler: triggering cobranza');
        runCobranzaJob().catch((err) => {
          logger.error({ err }, 'scheduler: cobranza crashed');
        });
      },
      { timezone: env.COBRANZA_TIMEZONE }
    );
  } else {
    logger.warn('scheduler: GHL_TOKEN not set, cobranza job disabled');
  }

  // Resumen mensual de cuotas: día 1 de cada mes a las 8 AM Bogotá
  logger.info('scheduler: registering cuotas-resumen-mensual job (1 de mes 8 AM)');
  cron.schedule(
    '0 8 1 * *',
    () => {
      logger.info('scheduler: triggering cuotas-resumen-mensual');
      runCuotasResumenMensual().catch((err) => {
        logger.error({ err }, 'scheduler: cuotas-resumen crashed');
      });
    },
    { timezone: 'America/Bogota' }
  );

  // Recordatorio diario: si alguna cuota vence en exactamente 3 días, avisa
  logger.info('scheduler: registering cuotas-recordatorio-diario job (8 AM Bogotá)');
  cron.schedule(
    '0 8 * * *',
    () => {
      logger.info('scheduler: triggering cuotas-recordatorio-diario');
      runCuotasRecordatorioDiario().catch((err) => {
        logger.error({ err }, 'scheduler: cuotas-recordatorio crashed');
      });
    },
    { timezone: 'America/Bogota' }
  );
}
