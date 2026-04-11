import { Bot } from 'grammy';
import { env } from '../infra/env.js';
import { logger } from '../infra/logger.js';

export const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

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
