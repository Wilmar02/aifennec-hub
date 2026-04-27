import type { Bot, Context } from 'grammy';
import { InlineKeyboard } from 'grammy';
import { env } from '../../infra/env.js';
import { logger } from '../../infra/logger.js';
import { parseMessage, getBogotaDate } from './parser.js';
import { insertTransaction, resolveUserId, recentTransactions, monthAggregateByType } from './supabase.js';
import type { ParsedTransaction, TransactionType } from './types.js';

const TYPE_EMOJI: Record<TransactionType, string> = {
  income: '💚',
  expense: '🔴',
  savings: '💙',
  investment: '💜',
  debt_payment: '🟠',
};

const TYPE_LABEL: Record<TransactionType, string> = {
  income: 'Ingreso',
  expense: 'Gasto',
  savings: 'Ahorro',
  investment: 'Inversión',
  debt_payment: 'Pago deuda',
};

function isAuthorized(ctx: Context): boolean {
  const list = env.ALLOWED_TELEGRAM_IDS.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const allowed = list.length > 0 ? list : [env.TELEGRAM_DIGEST_CHAT_ID];
  const id = String(ctx.chat?.id ?? '');
  return allowed.includes(id);
}

function formatMoney(n: number): string {
  return `$${new Intl.NumberFormat('es-CO').format(Math.round(n))}`;
}

const pending = new Map<number, ParsedTransaction & { _expires: number }>();
const TTL = 10 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of pending) if (now > v._expires) pending.delete(k);
}, 60_000);

async function sendConfirmation(ctx: Context, tx: ParsedTransaction): Promise<void> {
  const chatId = ctx.chat!.id;
  pending.set(chatId, { ...tx, _expires: Date.now() + TTL });
  const emoji = TYPE_EMOJI[tx.tipo_transaccion];
  const lines = [
    `${emoji} <b>${TYPE_LABEL[tx.tipo_transaccion]}: ${formatMoney(tx.Valor)} ${tx.moneda}</b>`,
    `📝 ${tx.descripcion}`,
    `🏷️ ${tx.categoria} → ${tx.subcategoria}`,
    `💳 ${tx.cuenta}`,
    `📅 ${tx.fecha}`,
    `🎯 confianza: ${(tx.confidence * 100).toFixed(0)}%`,
  ];
  const kb = new InlineKeyboard().text('✅ Confirmar', 'gasto:ok').text('❌ Cancelar', 'gasto:cancel');
  await ctx.reply(lines.join('\n'), { parse_mode: 'HTML', reply_markup: kb });
}

async function persist(ctx: Context, tx: ParsedTransaction): Promise<void> {
  const tgId = ctx.from?.id;
  if (!tgId) {
    await ctx.reply('No identifiqué tu user_id de Telegram.');
    return;
  }
  const userId = await resolveUserId(tgId);
  if (!userId) {
    await ctx.reply('Tu telegram_id no está vinculado a un perfil en Supabase. Configúralo en el dashboard.');
    return;
  }
  const result = await insertTransaction({
    user_id: userId,
    fecha: tx.fecha,
    mes: tx.mes,
    descripcion: tx.descripcion,
    Valor: tx.Valor,
    tipo_transaccion: tx.tipo_transaccion,
    categoria: tx.categoria,
    subcategoria: tx.subcategoria,
    cuenta: tx.cuenta,
    moneda: tx.moneda,
    fuente: 'telegram',
  });
  if (!result.ok) {
    logger.error({ err: result.error }, 'gastos: insert failed');
    await ctx.reply(`❌ Error guardando: ${result.error}`);
    return;
  }
  const emoji = TYPE_EMOJI[tx.tipo_transaccion];
  await ctx.reply(
    `${emoji} Registrado: <b>${formatMoney(tx.Valor)} ${tx.moneda}</b>\n${tx.categoria} → ${tx.subcategoria}`,
    { parse_mode: 'HTML' }
  );
}

export function registerGastosCommands(bot: Bot): void {
  bot.command('gasto', async (ctx) => {
    if (!isAuthorized(ctx)) return;
    const text = (ctx.match ?? '').toString().trim();
    if (!text) {
      await ctx.reply(
        [
          'Uso: <code>/gasto &lt;descripción y monto&gt;</code>',
          'Ejemplos:',
          '<code>/gasto Almuerzo 45k nequi</code>',
          '<code>/gasto Mercado D1 120.000 bancolombia</code>',
          '<code>/gasto Gasolina 80k</code>',
          '',
          'También puedes escribir el mensaje directamente sin /gasto.',
        ].join('\n'),
        { parse_mode: 'HTML' }
      );
      return;
    }
    const parsed = parseMessage(text);
    if (!parsed) {
      await ctx.reply('No detecté un monto. Ejemplo: <code>Almuerzo 45k nequi</code>', { parse_mode: 'HTML' });
      return;
    }
    await sendConfirmation(ctx, parsed);
  });

  bot.command('gastos', async (ctx) => {
    if (!isAuthorized(ctx)) return;
    const tgId = ctx.from?.id;
    if (!tgId) return;
    const userId = await resolveUserId(tgId);
    if (!userId) {
      await ctx.reply('Sin perfil vinculado.');
      return;
    }
    try {
      const rows = await recentTransactions(userId, 10);
      if (rows.length === 0) {
        await ctx.reply('Sin movimientos registrados aún.');
        return;
      }
      const lines = rows.map((r) => {
        const e = TYPE_EMOJI[(r.tipo_transaccion as TransactionType) ?? 'expense'] ?? '•';
        return `${e} ${r.fecha} · ${formatMoney(Number(r.Valor))} ${r.moneda} · ${r.categoria} · <i>${r.descripcion}</i>`;
      });
      await ctx.reply(['<b>Últimos 10 movimientos:</b>', '', ...lines].join('\n'), { parse_mode: 'HTML' });
    } catch (err) {
      logger.error({ err }, 'gastos: /gastos failed');
      await ctx.reply('❌ Error leyendo movimientos.');
    }
  });

  bot.command('balance', async (ctx) => {
    if (!isAuthorized(ctx)) return;
    const tgId = ctx.from?.id;
    if (!tgId) return;
    const userId = await resolveUserId(tgId);
    if (!userId) {
      await ctx.reply('Sin perfil vinculado.');
      return;
    }
    try {
      const { fecha, mes } = getBogotaDate();
      const yyyymm = fecha.slice(0, 7);
      const agg = await monthAggregateByType(userId, yyyymm);
      const get = (t: string): number => agg.find((a) => a.tipo_transaccion === t)?.total ?? 0;
      const ingresos = get('income');
      const gastos = get('expense');
      const ahorros = get('savings');
      const inversion = get('investment');
      const deuda = get('debt_payment');
      const neto = ingresos - gastos - ahorros - inversion - deuda;
      await ctx.reply(
        [
          `<b>📊 Balance ${mes} (Supabase)</b>`,
          '',
          `💚 Ingresos:   ${formatMoney(ingresos)}`,
          `🔴 Gastos:     ${formatMoney(gastos)}`,
          `💙 Ahorros:    ${formatMoney(ahorros)}`,
          `💜 Inversión:  ${formatMoney(inversion)}`,
          `🟠 Deuda:      ${formatMoney(deuda)}`,
          '',
          `<b>Neto:</b> ${formatMoney(neto)} COP`,
        ].join('\n'),
        { parse_mode: 'HTML' }
      );
    } catch (err) {
      logger.error({ err }, 'gastos: /balance failed');
      await ctx.reply('❌ Error calculando balance.');
    }
  });

  bot.callbackQuery('gasto:ok', async (ctx) => {
    if (!isAuthorized(ctx)) return;
    const chatId = ctx.chat?.id;
    if (!chatId) return;
    const tx = pending.get(chatId);
    if (!tx) {
      await ctx.answerCallbackQuery('Expiró. Vuelve a enviar el mensaje.');
      return;
    }
    pending.delete(chatId);
    await ctx.answerCallbackQuery('Guardando...');
    try {
      await ctx.editMessageReplyMarkup({ reply_markup: undefined });
    } catch {
      // ignora si ya no se puede editar
    }
    await persist(ctx, tx);
  });

  bot.callbackQuery('gasto:cancel', async (ctx) => {
    if (!isAuthorized(ctx)) return;
    const chatId = ctx.chat?.id;
    if (chatId) pending.delete(chatId);
    await ctx.answerCallbackQuery('Cancelado');
    try {
      await ctx.editMessageText('❌ Cancelado.');
    } catch {
      // ignora
    }
  });

  // Mensajes naturales sin slash. Si tienen monto, propone confirmación; si no, ignora.
  bot.on('message:text', async (ctx) => {
    if (!isAuthorized(ctx)) return;
    const text = ctx.message.text;
    if (text.startsWith('/')) return;
    const parsed = parseMessage(text);
    if (!parsed) return; // silencio si no parece transacción
    await sendConfirmation(ctx, parsed);
  });
}
