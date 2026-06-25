import { Bot } from 'grammy';
import { env } from '../infra/env.js';
import { logger } from '../infra/logger.js';
import { registerGastosCommands } from '../modules/gastos/telegram-commands.js';

export const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

bot.catch((err) => {
  logger.error(
    {
      err: err.error,
      updateId: err.ctx.update.update_id,
      from: err.ctx.from?.id,
      handler: err.message,
    },
    'telegram: handler error (bot kept alive)'
  );
});

let commandsRegistered = false;

function ensureCommandsRegistered(): void {
  if (commandsRegistered) return;
  // Bot solo-financiero: solo se registran los comandos de gastos.
  // (Cobranza desconectada a propósito: sus comandos/errores iban a este mismo chat.)
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY) {
    registerGastosCommands(bot);
  } else {
    logger.warn('gastos: SUPABASE_URL/SUPABASE_SERVICE_KEY no configurados, handlers /gasto deshabilitados');
  }
  commandsRegistered = true;
}

/** Inicia el bot en modo long polling (bloquea). Usado en el bootstrap principal. */
export async function startBot(): Promise<void> {
  ensureCommandsRegistered();
  // Ignora updates acumulados al reiniciar
  await bot.start({
    drop_pending_updates: true,
    onStart: (info) => logger.info({ username: info.username }, 'telegram: bot started (long polling)'),
  });
}

export async function sendMessage(text: string): Promise<void> {
  try {
    await bot.api.sendMessage(env.TELEGRAM_DIGEST_CHAT_ID, text, {
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    });
  } catch (err) {
    logger.error({ err }, 'telegram: sendMessage failed');
    throw err;
  }
}
