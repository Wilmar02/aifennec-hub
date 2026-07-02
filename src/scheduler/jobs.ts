import cron from 'node-cron';
import { logger } from '../infra/logger.js';
import { env } from '../infra/env.js';
import { runCuotasResumenMensual, runCuotasRecordatorioDiario, runResumenDiario } from '../modules/gastos/cuotas-cron.js';
import { runCobranzaDraftsJob, runRemindersJob } from '../modules/cobranza-drafts/index.js';

// Bot solo-financiero: se registran los jobs de gastos + cobranza-drafts.
// El motor VIEJO `src/modules/cobranza/` (GHL, WhatsApp, dunning) y LinkedIn-ideas
// siguen desconectados a propósito (sus notificaciones de error iban a este mismo
// chat de Telegram). El job NUEVO `cobranza-drafts` (solo Gmail, solo borradores)
// sí se registra abajo.
export function startScheduler(): void {
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

  // Resumen diario de conciencia financiera (8 PM Bogotá)
  logger.info('scheduler: registering resumen-diario job (8 PM Bogotá)');
  cron.schedule(
    '0 20 * * *',
    () => {
      logger.info('scheduler: triggering resumen-diario');
      runResumenDiario().catch((err) => {
        logger.error({ err }, 'scheduler: resumen-diario crashed');
      });
    },
    { timezone: 'America/Bogota' }
  );

  // Cobranza-drafts: día 1 de cada mes deja los borradores en Gmail (nunca envía).
  logger.info({ cron: env.COBRANZA_DRAFTS_CRON }, 'scheduler: registering cobranza-drafts job');
  cron.schedule(
    env.COBRANZA_DRAFTS_CRON,
    () => {
      logger.info('scheduler: triggering cobranza-drafts');
      runCobranzaDraftsJob().catch((err) => {
        logger.error({ err }, 'scheduler: cobranza-drafts crashed');
      });
    },
    { timezone: env.COBRANZA_DRAFTS_TIMEZONE }
  );

  // Cobranza-recordatorios: cron diario que deja borradores de recordatorio de pago
  // (T-2 preventivo / T+3 mora) en Gmail para clientes con recordatorios: true.
  // Nunca envía; solo borradores.
  logger.info({ cron: env.COBRANZA_RECORDATORIOS_CRON }, 'scheduler: registering cobranza-recordatorios job');
  cron.schedule(
    env.COBRANZA_RECORDATORIOS_CRON,
    () => {
      logger.info('scheduler: triggering cobranza-recordatorios');
      runRemindersJob().catch((err) => {
        logger.error({ err }, 'scheduler: cobranza-recordatorios crashed');
      });
    },
    { timezone: env.COBRANZA_RECORDATORIOS_TIMEZONE }
  );
}
