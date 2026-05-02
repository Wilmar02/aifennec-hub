import type { Bot } from 'grammy';
import {
  registerGastoCommand,
  registerGastosCommand,
  registerBalanceCommand,
  registerPresupuestoCommand,
  registerDeudasCommand,
  registerNaturalMessageHandler,
} from './commands/index.js';
import {
  registerAccountCallback,
  registerConfirmCallback,
  registerCancelCallback,
} from './commands/callbacks.js';

/**
 * Entry point del módulo gastos.
 * Registra todos los handlers (commands + callbacks) en el bot grammy.
 *
 * El módulo está organizado en:
 * - commands/    → handlers de slash commands + mensaje natural
 * - ui/          → builders de respuestas (formatters, keyboards, confirmation)
 * - state/       → estado en memoria (pending Map)
 * - parser.ts    → extracción de monto/cuenta/categoría desde texto libre
 * - categorias.ts → diccionario keyword → (cat, sub, tipo)
 * - supabase.ts  → repository de Supabase (CRUD + RPC créditos)
 * - cuotas-cron.ts → jobs scheduler (resumen mensual + recordatorio diario)
 * - auth.ts      → isAuthorized (por from.id)
 * - config.ts    → constantes (TTL, timeouts, crons)
 */
export function registerGastosCommands(bot: Bot): void {
  // Commands
  registerGastoCommand(bot);
  registerGastosCommand(bot);
  registerBalanceCommand(bot);
  registerPresupuestoCommand(bot);
  registerDeudasCommand(bot);

  // Callbacks (en orden: específicos antes que generales)
  registerAccountCallback(bot);
  registerConfirmCallback(bot);
  registerCancelCallback(bot);

  // Mensajes naturales (catch-all sin slash) — al final
  registerNaturalMessageHandler(bot);
}
