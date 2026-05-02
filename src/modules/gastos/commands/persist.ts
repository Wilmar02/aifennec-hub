import type { Context } from 'grammy';
import type { ParsedTransaction } from '../types.js';
import { logger } from '../../../infra/logger.js';
import { insertTransaction, resolveUserId, applyPaymentToCredito } from '../supabase.js';
import { TYPE_EMOJI, esc, formatMoney } from '../ui/formatters.js';

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

  await ctx.reply(lines.join('\n'), { parse_mode: 'HTML' });
}
