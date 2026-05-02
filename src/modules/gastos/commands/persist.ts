import type { Context } from 'grammy';
import type { ParsedTransaction } from '../types.js';
import { logger } from '../../../infra/logger.js';
import { insertTransaction, resolveUserId, applyPaymentToCredito } from '../supabase.js';
import { TYPE_EMOJI, esc, formatMoney } from '../ui/formatters.js';
import { getCategoryStatus, TIER_EMOJI, currentYearMonth, type CategoryStatus } from '../budget-status.js';
import { fireAlertOnce } from '../alerts.js';

/**
 * Persiste una transacción confirmada en Supabase.
 * Si es debt_payment, descuenta automáticamente del saldo del crédito matcheando por subcategoría.
 *
 * NOTA: el descuento del crédito y la inserción NO son transaccionales.
 * El insert ocurre primero. Si el descuento falla, queda warning en logs y la tx persistida.
 * Para atomicidad fuerte: mover ambos a un RPC Postgres (futuro).
 */
export async function persist(ctx: Context, tx: ParsedTransaction): Promise<void> {
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

  const lines = [
    `${TYPE_EMOJI[tx.tipo_transaccion]} Registrado: <b>${formatMoney(tx.Valor)} ${esc(tx.moneda)}</b>`,
    `${esc(tx.categoria)} → ${esc(tx.subcategoria)}`,
  ];

  // Side effect: descontar del crédito vivo si aplica
  if (tx.tipo_transaccion === 'debt_payment' && tx.subcategoria) {
    try {
      const upd = await applyPaymentToCredito(userId, tx.subcategoria, tx.Valor);
      if (upd) {
        lines.push('');
        lines.push(`💳 ${esc(upd.nombre)}`);
        lines.push(`Saldo nuevo: <b>${formatMoney(upd.newSaldo)}</b>`);
        if (upd.newSaldo === 0) lines.push('🎉 ¡Crédito cancelado!');
      }
    } catch (err) {
      logger.warn({ err, sub: tx.subcategoria }, 'gastos: no se pudo actualizar crédito');
    }
  }

  // Conciencia: contexto de presupuesto + alertas (solo gastos contra presupuesto)
  let status: CategoryStatus | null = null;
  if (tx.tipo_transaccion === 'expense' || tx.tipo_transaccion === 'debt_payment') {
    try {
      status = await getCategoryStatus(userId, tx.categoria);
      if (status && status.budget > 0) {
        lines.push('');
        lines.push(`${TIER_EMOJI[status.tier]} <b>${esc(status.categoria)}</b> · ${formatMoney(status.spent)} de ${formatMoney(status.budget)} (${Math.round(status.pct)}%)`);
        if (status.remaining > 0) {
          lines.push(`Quedan ${formatMoney(status.remaining)} para ${status.daysRemaining} día${status.daysRemaining === 1 ? '' : 's'} = ${formatMoney(status.dailySustainable)}/día`);
        } else {
          lines.push(`Excedido por ${formatMoney(Math.abs(status.remaining))}.`);
        }
      }
    } catch (err) {
      logger.warn({ err, cat: tx.categoria }, 'gastos: no se pudo calcular budget-status');
    }
  }

  await ctx.reply(lines.join('\n'), { parse_mode: 'HTML' });

  // Alertas threshold (asíncrono — no bloquea la respuesta principal)
  if (status && status.budget > 0) {
    void maybeFireThresholdAlerts(ctx, userId, status);
  }
}

const THRESHOLDS = [70, 85, 100] as const;

/**
 * Si la categoría cruzó algún umbral (70/85/100%) y aún no avisamos en este mes,
 * mandamos un mensaje de alerta separado al mismo chat.
 */
async function maybeFireThresholdAlerts(ctx: Context, userId: string, st: CategoryStatus): Promise<void> {
  const yyyymm = currentYearMonth();
  const scope = `budget:${st.categoria}:${yyyymm}`;
  // Solo nos importa el umbral más alto cruzado. Los inferiores quedan implícitos
  // (si cruza 100, ya pasó por 70 y 85 — el state queda igual).
  const crossed = [...THRESHOLDS].reverse().find(t => st.pct >= t);
  if (!crossed) return;
  try {
    const fresh = await fireAlertOnce(userId, scope, crossed);
    if (!fresh) return;
    const tierEmoji = crossed === 100 ? '🔴' : crossed === 85 ? '🟡' : '🟢';
    const lines = [
      `${tierEmoji} <b>Alerta · ${esc(st.categoria)}</b>`,
      `Cruzaste el ${crossed}% del presupuesto (${formatMoney(st.spent)} de ${formatMoney(st.budget)}).`,
    ];
    if (st.remaining > 0) {
      lines.push(`Quedan ${formatMoney(st.remaining)} para ${st.daysRemaining} día${st.daysRemaining === 1 ? '' : 's'}.`);
      lines.push(`Sostenible: ${formatMoney(st.dailySustainable)}/día.`);
    } else {
      lines.push(`Excedido por ${formatMoney(Math.abs(st.remaining))}. ${st.daysRemaining} día${st.daysRemaining === 1 ? '' : 's'} hasta fin de mes.`);
    }
    await ctx.reply(lines.join('\n'), { parse_mode: 'HTML' });
  } catch (err) {
    logger.warn({ err, scope, threshold: crossed }, 'gastos: alerta threshold falló');
  }
}
