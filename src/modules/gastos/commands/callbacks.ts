import type { Bot } from 'grammy';
import type { ParsedTransaction } from '../types.js';
import { isAuthorized } from '../auth.js';
import { getPending, deletePending, setPending } from '../state/pending.js';
import { ACCOUNT_TIPO, USD_ACCOUNTS, buildEditCategoriaKeyboard } from '../ui/keyboards.js';
import { sendConfirmation } from '../ui/confirmation.js';
import { CATEGORIAS_POR_TIPO, SUBCATEGORIAS_POR_CAT } from '../ui/wizard-keyboards.js';
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

/**
 * Callback `gasto:editcat` — abre picker de categorías para cambiar la del parser.
 * Reusa el set curado de wizard-keyboards filtrado por tipo de la tx.
 */
export function registerEditCategoriaCallback(bot: Bot): void {
  bot.callbackQuery('gasto:editcat', async (ctx) => {
    if (!isAuthorized(ctx)) return;
    const tx = getPending(ctx);
    if (!tx) {
      await ctx.answerCallbackQuery('Expiró. Vuelve a enviar el mensaje.');
      return;
    }
    const cats = CATEGORIAS_POR_TIPO[tx.tipo_transaccion] ?? [];
    await ctx.answerCallbackQuery();
    try {
      await ctx.editMessageReplyMarkup({ reply_markup: buildEditCategoriaKeyboard(cats) });
    } catch { /* ignore */ }
  });

  bot.callbackQuery(/^gasto:setcat:(.+)$/, async (ctx) => {
    if (!isAuthorized(ctx)) return;
    const tx = getPending(ctx);
    if (!tx) {
      await ctx.answerCallbackQuery('Expiró. Vuelve a enviar el mensaje.');
      return;
    }
    const newCat = ctx.match![1];
    // Sub: si la nueva cat tiene subcategorías curadas, usamos la primera; sino dejamos vacío
    const subs = SUBCATEGORIAS_POR_CAT[newCat] ?? [];
    const newSub = subs[0] ?? newCat;
    const updated: ParsedTransaction = { ...tx, categoria: newCat, subcategoria: newSub, confidence: 1 };
    setPending(ctx, updated);
    await ctx.answerCallbackQuery(`Categoría: ${newCat}`);
    try {
      await ctx.deleteMessage();
    } catch { /* ignore */ }
    await sendConfirmation(ctx, updated);
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
