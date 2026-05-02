import type { Bot } from 'grammy';
import type { ParsedTransaction } from '../types.js';
import { isAuthorized } from '../auth.js';
import { getPending, deletePending, setPending } from '../state/pending.js';
import { ACCOUNT_TIPO, USD_ACCOUNTS } from '../ui/keyboards.js';
import { sendConfirmation } from '../ui/confirmation.js';
import { persist } from './persist.js';

/**
 * Callback `cuenta:<account>` — disparado cuando el user elige cuenta del picker.
 * Actualiza la tx pendiente con la cuenta + tipo + (USD si aplica) y muestra confirmación final.
 */
export function registerAccountCallback(bot: Bot): void {
  bot.callbackQuery(/^cuenta:(.+)$/, async (ctx) => {
    if (!isAuthorized(ctx)) return;
    const tx = getPending(ctx);
    if (!tx) {
      await ctx.answerCallbackQuery('Expiró. Vuelve a enviar el mensaje.');
      return;
    }

    const account = ctx.match![1];
    const tipo = ACCOUNT_TIPO[account] ?? 'debito';
    const moneda = USD_ACCOUNTS.has(account) ? 'USD' : tx.moneda;

    const updated: ParsedTransaction = { ...tx, cuenta: account, cuenta_tipo: tipo, moneda };
    deletePending(ctx);

    await ctx.answerCallbackQuery(`Cuenta: ${account}`);
    try {
      await ctx.editMessageReplyMarkup({ reply_markup: undefined });
    } catch {
      // ya no se puede editar (mensaje antiguo) — seguimos
    }
    await sendConfirmation(ctx, updated);
  });
}

/** Callback `gasto:ok` — confirma y persiste la tx pendiente. */
export function registerConfirmCallback(bot: Bot): void {
  bot.callbackQuery('gasto:ok', async (ctx) => {
    if (!isAuthorized(ctx)) return;
    const tx = getPending(ctx);
    if (!tx) {
      await ctx.answerCallbackQuery('Expiró. Vuelve a enviar el mensaje.');
      return;
    }
    deletePending(ctx);
    await ctx.answerCallbackQuery('Guardando...');
    try {
      await ctx.editMessageReplyMarkup({ reply_markup: undefined });
    } catch {
      // ignora si ya no se puede editar
    }
    await persist(ctx, tx);
  });
}

/** Callback `gasto:cancel` — descarta la tx pendiente. */
export function registerCancelCallback(bot: Bot): void {
  bot.callbackQuery('gasto:cancel', async (ctx) => {
    if (!isAuthorized(ctx)) return;
    deletePending(ctx);
    await ctx.answerCallbackQuery('Cancelado');
    try {
      await ctx.editMessageText('❌ Cancelado.');
    } catch {
      // ignora
    }
  });
}
