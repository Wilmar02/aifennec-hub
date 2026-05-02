import type { Context } from 'grammy';
import { env } from '../../infra/env.js';

/**
 * Lista de Telegram user IDs autorizados, parseada una sola vez al cargar el módulo.
 * Si `ALLOWED_TELEGRAM_IDS` está vacío, fallback al `TELEGRAM_DIGEST_CHAT_ID` (solo el owner).
 */
const ALLOWED_IDS: ReadonlySet<string> = (() => {
  const list = env.ALLOWED_TELEGRAM_IDS.split(',').map(s => s.trim()).filter(Boolean);
  return new Set(list.length > 0 ? list : [env.TELEGRAM_DIGEST_CHAT_ID]);
})();

/**
 * Autoriza por `from.id` (NO por `chat.id`). Esto evita que en grupos cualquier
 * miembro pueda usar el bot solo porque el chat está en allowlist.
 *
 * @returns true si el usuario que envió el mensaje/callback está en la allowlist.
 */
export function isAuthorized(ctx: Context): boolean {
  const fromId = ctx.from?.id;
  return fromId !== undefined && ALLOWED_IDS.has(String(fromId));
}
