import cron from 'node-cron';
import { logger } from '../infra/logger.js';
import { runCuotasResumenMensual, runCuotasRecordatorioDiario, runResumenDiario } from '../modules/gastos/cuotas-cron.js';

// Bot solo-financiero: solo se registran los jobs de gastos.
// Cobranza y LinkedIn-ideas viven en el repo pero están desconectados a propósito
// (sus notificaciones de error iban a este mismo chat de Telegram).
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
}
