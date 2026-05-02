import type { Bot, Context } from 'grammy';
import { logger } from '../../../infra/logger.js';
import { parseMessage, getBogotaDate } from '../parser.js';
import {
  recentTransactions,
  monthAggregateByType,
  monthAggregateByCategoria,
  fetchPresupuestos,
  fetchCreditos,
  resolveUserId,
} from '../supabase.js';
import type { TransactionType } from '../types.js';
import { isAuthorized } from '../auth.js';
import {
  TYPE_EMOJI,
  TYPE_LABEL,
  CAT_ORDER,
  esc,
  formatMoney,
  compactMoney,
} from '../ui/formatters.js';
import { offerToUser } from '../ui/confirmation.js';
import { RECENT_TX_LIMIT } from '../config.js';

// ============================================================
// /gasto <texto>
// ============================================================

export function registerGastoCommand(bot: Bot): void {
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
    await offerToUser(ctx, parsed);
  });
}

// ============================================================
// /gastos — últimos N movimientos
// ============================================================

export function registerGastosCommand(bot: Bot): void {
  bot.command('gastos', async (ctx) => {
    if (!isAuthorized(ctx)) return;
    const userId = await resolveUserIdFromCtx(ctx);
    if (!userId) {
      await ctx.reply('Sin perfil vinculado.');
      return;
    }
    try {
      const rows = await recentTransactions(userId, RECENT_TX_LIMIT);
      if (rows.length === 0) {
        await ctx.reply('Sin movimientos registrados aún.');
        return;
      }
      const lines = rows.map((r) => {
        const e = TYPE_EMOJI[(r.tipo_transaccion as TransactionType) ?? 'expense'] ?? '•';
        return `${e} ${esc(r.fecha)} · ${formatMoney(Number(r.Valor))} ${esc(r.moneda)} · ${esc(r.categoria)} · <i>${esc(r.descripcion)}</i>`;
      });
      await ctx.reply([`<b>Últimos ${RECENT_TX_LIMIT} movimientos:</b>`, '', ...lines].join('\n'), {
        parse_mode: 'HTML',
      });
    } catch (err) {
      logger.error({ err }, 'gastos: /gastos failed');
      await ctx.reply('❌ Error leyendo movimientos.');
    }
  });
}

// ============================================================
// /balance — neto del mes por tipo
// ============================================================

export function registerBalanceCommand(bot: Bot): void {
  bot.command('balance', async (ctx) => {
    if (!isAuthorized(ctx)) return;
    const userId = await resolveUserIdFromCtx(ctx);
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
          `<b>📊 Balance ${esc(mes)} (Supabase)</b>`,
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
}

// ============================================================
// /presupuesto — gastado vs presupuesto por categoría
// ============================================================

export function registerPresupuestoCommand(bot: Bot): void {
  bot.command('presupuesto', async (ctx) => {
    if (!isAuthorized(ctx)) return;
    const userId = await resolveUserIdFromCtx(ctx);
    if (!userId) {
      await ctx.reply('Sin perfil vinculado.');
      return;
    }
    try {
      const { fecha, mes } = getBogotaDate();
      const yyyymm = fecha.slice(0, 7);
      const [gastos, presus] = await Promise.all([
        monthAggregateByCategoria(userId, yyyymm),
        fetchPresupuestos(userId),
      ]);

      const map = new Map<string, { presu: number; gastado: number }>();
      for (const p of presus) map.set(p.categoria, { presu: p.presupuesto, gastado: 0 });
      for (const g of gastos) {
        if (g.tipo_transaccion === 'income') continue;
        const cur = map.get(g.categoria) ?? { presu: 0, gastado: 0 };
        cur.gastado += g.total;
        map.set(g.categoria, cur);
      }

      const orderIdx = (c: string) => {
        const i = CAT_ORDER.indexOf(c);
        return i === -1 ? 999 : i;
      };
      const rows = [...map.entries()].sort((a, b) => orderIdx(a[0]) - orderIdx(b[0]));

      let totPresu = 0;
      let totGasto = 0;
      const lines: string[] = [`<b>📊 Presupuesto ${esc(mes)} ${yyyymm.slice(0, 4)}</b>`, ''];
      for (const [cat, v] of rows) {
        totPresu += v.presu;
        totGasto += v.gastado;
        const pct = v.presu > 0 ? Math.round((v.gastado / v.presu) * 100) : v.gastado > 0 ? 999 : 0;
        const pctTxt = v.presu === 0 && v.gastado === 0 ? '—' : pct === 999 ? 'sin presu' : `${pct}%`;
        lines.push(`${esc(cat)}  ${pctTxt} · ${compactMoney(v.gastado)} de ${compactMoney(v.presu)}`);
      }

      const totDisp = totPresu - totGasto;
      const totPct = totPresu > 0 ? Math.round((totGasto / totPresu) * 100) : 0;
      lines.push('');
      lines.push('━━━━━━━━━━━━━━━━━━━━');
      lines.push(`💰 <b>TOTAL:</b> ${compactMoney(totGasto)} de ${compactMoney(totPresu)} (${totPct}%)`);
      lines.push(`✅ Disponible: <b>${compactMoney(totDisp)}</b>`);

      await ctx.reply(lines.join('\n'), { parse_mode: 'HTML' });
    } catch (err) {
      logger.error({ err }, 'gastos: /presupuesto failed');
      await ctx.reply('❌ Error calculando presupuesto.');
    }
  });
}

// ============================================================
// /deudas — saldo vivo de créditos
// ============================================================

export function registerDeudasCommand(bot: Bot): void {
  bot.command('deudas', async (ctx) => {
    if (!isAuthorized(ctx)) return;
    const userId = await resolveUserIdFromCtx(ctx);
    if (!userId) {
      await ctx.reply('Sin perfil vinculado.');
      return;
    }
    try {
      const creditos = await fetchCreditos(userId);
      if (creditos.length === 0) {
        await ctx.reply(
          'Sin créditos registrados. Para activar este reporte, creá la tabla <code>creditos</code> en Supabase.',
          { parse_mode: 'HTML' }
        );
        return;
      }

      const lines: string[] = ['<b>💳 Tus créditos vivos</b>', ''];
      let totalSaldo = 0;
      let totalCuota = 0;
      for (const c of creditos) {
        totalSaldo += Number(c.saldo_actual);
        totalCuota += Number(c.cuota_mensual ?? 0);
        const pctPagado = c.monto_inicial > 0
          ? Math.round(((c.monto_inicial - c.saldo_actual) / c.monto_inicial) * 100)
          : 0;
        const cuotasRestantes = c.cuotas_totales != null && c.cuotas_pagadas != null
          ? c.cuotas_totales - c.cuotas_pagadas
          : null;

        lines.push(`<b>${esc(c.nombre)}</b>`);
        lines.push(`Saldo: <b>${formatMoney(c.saldo_actual)}</b> de ${formatMoney(c.monto_inicial)}  (${pctPagado}% pagado)`);
        if (c.cuota_mensual) {
          const cuotaTxt = cuotasRestantes != null
            ? `${formatMoney(c.cuota_mensual)}/mes · ${cuotasRestantes} cuotas restantes`
            : `${formatMoney(c.cuota_mensual)}/mes`;
          lines.push(`Cuota: ${cuotaTxt}`);
        }
        if (c.tasa_anual) lines.push(`Tasa: ${c.tasa_anual}% E.A.`);
        lines.push('');
      }

      lines.push('━━━━━━━━━━━━━━━━━━━━');
      lines.push(`💰 <b>Total deuda:</b> ${formatMoney(totalSaldo)}`);
      lines.push(`📅 <b>Cuotas/mes:</b> ${formatMoney(totalCuota)}`);

      await ctx.reply(lines.join('\n'), { parse_mode: 'HTML' });
    } catch (err) {
      logger.error({ err }, 'gastos: /deudas failed');
      await ctx.reply('❌ Error consultando créditos.');
    }
  });
}

// ============================================================
// Mensajes naturales sin slash — si tienen monto, propone confirmación
// ============================================================

export function registerNaturalMessageHandler(bot: Bot): void {
  bot.on('message:text', async (ctx) => {
    if (!isAuthorized(ctx)) return;
    const text = ctx.message.text;
    if (text.startsWith('/')) return;
    const parsed = parseMessage(text);
    if (!parsed) return; // silencio si no parece transacción
    await offerToUser(ctx, parsed);
  });
}

// ============================================================
// Helpers compartidos
// ============================================================

async function resolveUserIdFromCtx(ctx: Context): Promise<string | null> {
  const tgId = ctx.from?.id;
  if (!tgId) return null;
  return resolveUserId(tgId);
}
