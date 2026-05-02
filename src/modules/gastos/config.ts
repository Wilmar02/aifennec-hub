/**
 * Constantes de configuración del módulo gastos.
 * Si necesitás cambiar timeouts/TTLs/límites, hacelo acá. Cero magic numbers en el código.
 */

/** Tiempo que un mensaje pendiente de confirmación queda vivo en memoria (ms). */
export const PENDING_TTL_MS = 10 * 60 * 1000; // 10 min

/** Frecuencia con la que el cleaner barre `pending` (ms). */
export const PENDING_CLEANUP_INTERVAL_MS = 60 * 1000; // 1 min

/** Cuántos movimientos devuelve `/gastos` por defecto. */
export const RECENT_TX_LIMIT = 10;

/** Días antes del vencimiento que dispara el recordatorio de cuota. */
export const REMINDER_DAYS_AHEAD = 3;

/** Cron del resumen mensual de cuotas (día 1 de cada mes 8 AM Bogotá). */
export const CRON_CUOTAS_RESUMEN = '0 8 1 * *';

/** Cron del recordatorio diario de cuotas (8 AM Bogotá). */
export const CRON_CUOTAS_RECORDATORIO = '0 8 * * *';

/** Timezone canónica del usuario. */
export const TIMEZONE = 'America/Bogota';
