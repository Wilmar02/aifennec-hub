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
  registerEditCategoriaCallback,
} from './commands/callbacks.js';
import {
  registerStartCommand,
  registerWizardCallbacks,
} from './commands/wizard.js';

/**
 * Entry point del módulo gastos.
 * Registra todos los handlers (commands + callbacks) en el bot grammy.
 *
 * El módulo está organizado en:
 * - commands/    → handlers de slash commands + mensaje natural + wizard
 * - ui/          → builders de respuestas (formatters, keyboards, confirmation)
 * - state/       → estado en memoria (pending Map + wizard Map)
 * - parser.ts    → extracción de monto/cuenta/categoría desde texto libre
 * - categorias.ts → diccionario keyword → (cat, sub, tipo)
 * - supabase.ts  → repository de Supabase (CRUD + RPC créditos)
 * - cuotas-cron.ts → jobs scheduler (resumen mensual + recordatorio diario)
 * - auth.ts      → isAuthorized (por from.id)
 * - config.ts    → constantes (TTL, timeouts, crons)
 */
export function registerGastosCommands(bot: Bot): void {
  // /start + /menu (wizard guiado)
  registerStartCommand(bot);

  // Slash commands clásicos
  registerGastoCommand(bot);
  registerGastosCommand(bot);
  registerBalanceCommand(bot);
  registerPresupuestoCommand(bot);
  registerDeudasCommand(bot);

  // Callbacks del wizard (prefix wiz:*)
  registerWizardCallbacks(bot);

  // Callbacks del flow natural (prefix cuenta:*, gasto:ok|cancel|editcat|setcat)
  registerAccountCallback(bot);
  registerConfirmCallback(bot);
  registerEditCategoriaCallback(bot);
  registerCancelCallback(bot);

  // Mensajes naturales (catch-all sin slash) — al final.
  // Internamente coordina con el wizard activo si lo hay.
  registerNaturalMessageHandler(bot);
}
