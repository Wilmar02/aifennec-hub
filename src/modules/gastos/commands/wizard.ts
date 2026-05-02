import type { Bot, Context } from 'grammy';
import { InlineKeyboard } from 'grammy';
import { logger } from '../../../infra/logger.js';
import { isAuthorized } from '../auth.js';
import {
  startWizard,
  getWizard,
  updateWizard,
  clearWizard,
  hasActiveWizard,
} from '../state/wizard.js';
import {
  buildMainMenu,
  buildCategoriaKeyboard,
  buildSubcategoriaKeyboard,
  buildBackCancelKeyboard,
  buildConfirmKeyboard,
  CATEGORIAS_POR_TIPO,
  SUBCATEGORIAS_POR_CAT,
  TIPO_LABEL,
} from '../ui/wizard-keyboards.js';
import { ACCOUNT_OPTIONS, ACCOUNT_TIPO, USD_ACCOUNTS } from '../ui/keyboards.js';
import { TYPE_EMOJI, esc, formatMoney } from '../ui/formatters.js';
import { extractAmount, getBogotaDate } from '../parser.js';
import { persist } from './persist.js';
import type { TransactionType, ParsedTransaction } from '../types.js';

// ============================================================
// /start — menú principal con botones
// ============================================================

export function registerStartCommand(bot: Bot): void {
  bot.command('start', async (ctx) => {
    if (!isAuthorized(ctx)) return;
    clearWizard(ctx);
    await ctx.reply(
      [
        '👋 <b>Hola, listo para registrar tus finanzas.</b>',
        '',
        'Elegí qué hacer 👇',
        '',
        '<i>Tip: también podés escribir directo, ej.</i> <code>almuerzo 45k nequi</code>',
      ].join('\n'),
      { parse_mode: 'HTML', reply_markup: buildMainMenu() }
    );
  });

  bot.command('menu', async (ctx) => {
    if (!isAuthorized(ctx)) return;
    clearWizard(ctx);
    await ctx.reply('Menú principal:', { reply_markup: buildMainMenu() });
  });
}

// ============================================================
// Callbacks del wizard
// ============================================================

export function registerWizardCallbacks(bot: Bot): void {
  // ───────────────────────────────────────────────────
  // wiz:start:<tipo> — arranca un nuevo wizard del tipo elegido
  // ───────────────────────────────────────────────────
  bot.callbackQuery(/^wiz:start:(.+)$/, async (ctx) => {
    if (!isAuthorized(ctx)) return;
    const tipo = ctx.match![1] as TransactionType;
    if (!CATEGORIAS_POR_TIPO[tipo]) {
      await ctx.answerCallbackQuery('Tipo no válido');
      return;
    }
    startWizard(ctx);
    updateWizard(ctx, { tipo, step: 'categoria' });
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      `${TIPO_LABEL[tipo]}\n\n¿En qué categoría?`,
      { reply_markup: buildCategoriaKeyboard(tipo) }
    );
  });

  // ───────────────────────────────────────────────────
  // wiz:cat:<categoria> — guarda categoría, muestra subcategorías
  // ───────────────────────────────────────────────────
  bot.callbackQuery(/^wiz:cat:(.+)$/, async (ctx) => {
    if (!isAuthorized(ctx)) return;
    const w = getWizard(ctx);
    if (!w?.tipo) {
      await ctx.answerCallbackQuery('Sesión expirada, /start');
      return;
    }
    const cat = ctx.match![1];

    if (cat === '__other__') {
      updateWizard(ctx, { step: 'categoria' });
      await ctx.answerCallbackQuery();
      await ctx.editMessageText(
        `${TIPO_LABEL[w.tipo]}\n\nEscribí el nombre de la categoría:`,
        { reply_markup: buildBackCancelKeyboard('tipo') }
      );
      // Marcamos que esperamos texto libre para categoría
      updateWizard(ctx, { step: 'categoria', categoria: '__awaiting_text__' });
      return;
    }

    if (!CATEGORIAS_POR_TIPO[w.tipo].includes(cat)) {
      await ctx.answerCallbackQuery('Categoría no válida');
      return;
    }
    updateWizard(ctx, { categoria: cat, step: 'subcategoria' });
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      `${TIPO_LABEL[w.tipo]} · ${cat}\n\n¿Subcategoría?`,
      { reply_markup: buildSubcategoriaKeyboard(cat) }
    );
  });

  // ───────────────────────────────────────────────────
  // wiz:sub:<idx|other> — guarda subcategoría
  // ───────────────────────────────────────────────────
  bot.callbackQuery(/^wiz:sub:(.+)$/, async (ctx) => {
    if (!isAuthorized(ctx)) return;
    const w = getWizard(ctx);
    if (!w?.categoria || !w.tipo) {
      await ctx.answerCallbackQuery('Sesión expirada, /start');
      return;
    }
    const arg = ctx.match![1];

    if (arg === 'other') {
      updateWizard(ctx, { subcategoria: '__awaiting_text__', step: 'subcategoria' });
      await ctx.answerCallbackQuery();
      await ctx.editMessageText(
        `${TIPO_LABEL[w.tipo]} · ${w.categoria}\n\nEscribí la subcategoría:`,
        { reply_markup: buildBackCancelKeyboard('cat') }
      );
      return;
    }

    const subs = SUBCATEGORIAS_POR_CAT[w.categoria] ?? [];
    const idx = parseInt(arg, 10);
    const sub = subs[idx];
    if (!sub) {
      await ctx.answerCallbackQuery('Subcategoría no válida');
      return;
    }
    updateWizard(ctx, { subcategoria: sub, step: 'cuenta' });
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      `${TIPO_LABEL[w.tipo]} · ${w.categoria} → ${sub}\n\n¿De qué cuenta?`,
      { reply_markup: buildAccountKeyboardForWizard() }
    );
  });

  // ───────────────────────────────────────────────────
  // wiz:cuenta:<account> — guarda cuenta, pide monto
  // ───────────────────────────────────────────────────
  bot.callbackQuery(/^wiz:cuenta:(.+)$/, async (ctx) => {
    if (!isAuthorized(ctx)) return;
    const w = getWizard(ctx);
    if (!w?.subcategoria || !w.tipo) {
      await ctx.answerCallbackQuery('Sesión expirada, /start');
      return;
    }
    const account = ctx.match![1];
    if (!ACCOUNT_TIPO[account]) {
      await ctx.answerCallbackQuery('Cuenta no válida');
      return;
    }
    const moneda = USD_ACCOUNTS.has(account) ? 'USD' : 'COP';
    updateWizard(ctx, { cuenta: account, cuenta_tipo: ACCOUNT_TIPO[account], moneda, step: 'monto' });
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      [
        `${TIPO_LABEL[w.tipo]} · ${w.categoria} → ${w.subcategoria}`,
        `💳 ${account}`,
        '',
        `💵 Escribí el monto en ${moneda}:`,
        '<i>Ejemplos: <code>45000</code>, <code>45k</code>, <code>1.5m</code>, <code>120.000</code></i>',
      ].join('\n'),
      { parse_mode: 'HTML', reply_markup: buildBackCancelKeyboard('sub') }
    );
  });

  // ───────────────────────────────────────────────────
  // wiz:back:<step> — volver atrás
  // ───────────────────────────────────────────────────
  bot.callbackQuery(/^wiz:back:(.+)$/, async (ctx) => {
    if (!isAuthorized(ctx)) return;
    const w = getWizard(ctx);
    if (!w?.tipo) {
      await ctx.answerCallbackQuery('Sesión expirada, /start');
      return;
    }
    const target = ctx.match![1];
    await ctx.answerCallbackQuery();
    if (target === 'tipo') {
      updateWizard(ctx, { categoria: undefined, subcategoria: undefined, cuenta: undefined, step: 'categoria' });
      await ctx.editMessageText(
        `${TIPO_LABEL[w.tipo]}\n\n¿En qué categoría?`,
        { reply_markup: buildCategoriaKeyboard(w.tipo) }
      );
    } else if (target === 'cat') {
      updateWizard(ctx, { subcategoria: undefined, cuenta: undefined, step: 'subcategoria' });
      await ctx.editMessageText(
        `${TIPO_LABEL[w.tipo]} · ${w.categoria}\n\n¿Subcategoría?`,
        { reply_markup: buildSubcategoriaKeyboard(w.categoria!) }
      );
    } else if (target === 'sub') {
      updateWizard(ctx, { cuenta: undefined, step: 'cuenta' });
      await ctx.editMessageText(
        `${TIPO_LABEL[w.tipo]} · ${w.categoria} → ${w.subcategoria}\n\n¿De qué cuenta?`,
        { reply_markup: buildAccountKeyboardForWizard() }
      );
    } else if (target === 'monto') {
      updateWizard(ctx, { Valor: undefined, descripcion: undefined, step: 'monto' });
      await ctx.editMessageText(
        `Escribí el monto en ${w.moneda}:`,
        { reply_markup: buildBackCancelKeyboard('sub') }
      );
    }
  });

  // ───────────────────────────────────────────────────
  // wiz:save — persiste la transacción
  // ───────────────────────────────────────────────────
  bot.callbackQuery('wiz:save', async (ctx) => {
    if (!isAuthorized(ctx)) return;
    const w = getWizard(ctx);
    if (!w || w.step !== 'confirmar' || !isComplete(w)) {
      await ctx.answerCallbackQuery('Faltan datos. /start para reintentar.');
      return;
    }
    const tx = wizardToTransaction(w);
    clearWizard(ctx);
    await ctx.answerCallbackQuery('Guardando...');
    try {
      await ctx.editMessageReplyMarkup({ reply_markup: undefined });
    } catch { /* ignore */ }
    await persist(ctx, tx);
  });

  // ───────────────────────────────────────────────────
  // wiz:cancel — descarta
  // ───────────────────────────────────────────────────
  bot.callbackQuery('wiz:cancel', async (ctx) => {
    if (!isAuthorized(ctx)) return;
    clearWizard(ctx);
    await ctx.answerCallbackQuery('Cancelado');
    try {
      await ctx.editMessageText('❌ Cancelado.');
    } catch { /* ignore */ }
  });

  // ───────────────────────────────────────────────────
  // wiz:report:<balance|deudas|gastos> — atajos a comandos existentes
  // ───────────────────────────────────────────────────
  bot.callbackQuery(/^wiz:report:(balance|deudas|gastos)$/, async (ctx) => {
    if (!isAuthorized(ctx)) return;
    const which = ctx.match![1];
    await ctx.answerCallbackQuery();
    await ctx.reply(`Usá el comando: /${which}`);
  });
}

// ============================================================
// Handler de texto libre cuando hay wizard esperando input
// ============================================================

/**
 * Si hay wizard activo esperando un texto (categoria custom, subcategoria custom,
 * monto o descripción), lo procesa. Devuelve true si consumió el mensaje.
 */
export async function handleWizardTextInput(ctx: Context): Promise<boolean> {
  const w = getWizard(ctx);
  if (!w) return false;
  const text = (ctx.message?.text ?? '').trim();
  if (!text || text.startsWith('/')) return false;

  // Categoría custom
  if (w.step === 'categoria' && w.categoria === '__awaiting_text__') {
    const cat = text.slice(0, 80);
    updateWizard(ctx, { categoria: cat, step: 'subcategoria' });
    await ctx.reply(
      `${TIPO_LABEL[w.tipo!]} · ${esc(cat)}\n\nEscribí la subcategoría:`,
      { parse_mode: 'HTML', reply_markup: buildBackCancelKeyboard('cat') }
    );
    updateWizard(ctx, { subcategoria: '__awaiting_text__' });
    return true;
  }

  // Subcategoría custom
  if (w.step === 'subcategoria' && w.subcategoria === '__awaiting_text__') {
    const sub = text.slice(0, 80);
    updateWizard(ctx, { subcategoria: sub, step: 'cuenta' });
    await ctx.reply(
      `${TIPO_LABEL[w.tipo!]} · ${esc(w.categoria!)} → ${esc(sub)}\n\n¿De qué cuenta?`,
      { parse_mode: 'HTML', reply_markup: buildAccountKeyboardForWizard() }
    );
    return true;
  }

  // Monto
  if (w.step === 'monto') {
    const monto = extractAmount(text);
    if (!monto || monto <= 0) {
      await ctx.reply('No detecté un monto válido. Probá: <code>45000</code>, <code>45k</code>, <code>$1.5m</code>', { parse_mode: 'HTML' });
      return true;
    }
    updateWizard(ctx, { Valor: monto, step: 'descripcion' });
    await ctx.reply(
      [
        `💵 Monto: <b>${formatMoney(monto)} ${w.moneda}</b>`,
        '',
        '📝 ¿Una descripción corta? <i>(opcional, mandá "-" para saltar)</i>',
      ].join('\n'),
      { parse_mode: 'HTML', reply_markup: buildBackCancelKeyboard('monto') }
    );
    return true;
  }

  // Descripción
  if (w.step === 'descripcion') {
    const desc = text === '-' ? (w.subcategoria ?? '') : text.slice(0, 200);
    updateWizard(ctx, { descripcion: desc, step: 'confirmar' });
    const w2 = getWizard(ctx)!;
    await ctx.reply(buildConfirmText(w2), {
      parse_mode: 'HTML',
      reply_markup: buildConfirmKeyboard(),
    });
    return true;
  }

  return false;
}

// ============================================================
// Helpers
// ============================================================

function buildAccountKeyboardForWizard() {
  // Reusamos ACCOUNT_OPTIONS pero con prefix wiz:cuenta:
  const kb = new InlineKeyboard();
  ACCOUNT_OPTIONS.forEach((o, i) => {
    kb.text(o.label, `wiz:cuenta:${o.value}`);
    if (i % 2 === 1 || i === ACCOUNT_OPTIONS.length - 1) kb.row();
  });
  kb.text('⬅️ Atrás', 'wiz:back:cat').text('❌ Cancelar', 'wiz:cancel');
  return kb;
}

function isComplete(w: ReturnType<typeof getWizard> & object): boolean {
  return !!(w.tipo && w.categoria && w.subcategoria && w.cuenta && w.Valor && w.moneda);
}

function wizardToTransaction(w: NonNullable<ReturnType<typeof getWizard>>): ParsedTransaction {
  const { fecha, mes } = getBogotaDate();
  return {
    descripcion: w.descripcion || w.subcategoria || w.categoria || '',
    Valor: w.Valor!,
    tipo_transaccion: w.tipo!,
    categoria: w.categoria!,
    subcategoria: w.subcategoria!,
    cuenta: w.cuenta!,
    cuenta_tipo: w.cuenta_tipo,
    fecha,
    mes,
    moneda: w.moneda!,
    fuente: 'telegram',
    confidence: 1,
  };
}

function buildConfirmText(w: NonNullable<ReturnType<typeof getWizard>>): string {
  const emoji = TYPE_EMOJI[w.tipo!];
  return [
    `${emoji} <b>${TIPO_LABEL[w.tipo!]}</b>`,
    '',
    `💵 Monto:        <b>${formatMoney(w.Valor!)} ${w.moneda}</b>`,
    `🏷️ Categoría:    ${esc(w.categoria!)} → ${esc(w.subcategoria!)}`,
    `💳 Cuenta:       ${esc(w.cuenta!)}`,
    `📝 Descripción:  ${esc(w.descripcion || w.subcategoria!)}`,
    '',
    '¿Confirmás?',
  ].join('\n');
}

// Re-export para coordinar con natural handler
export { hasActiveWizard };
