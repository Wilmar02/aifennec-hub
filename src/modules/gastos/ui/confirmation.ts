import type { Context } from 'grammy';
import type { ParsedTransaction, CuentaTipo } from '../types.js';
import { setPending } from '../state/pending.js';
import { TYPE_EMOJI, TYPE_LABEL, esc, formatMoney } from './formatters.js';
import {
  ACCOUNT_OPTIONS,
  ambiguousResolverOptions,
  buildAccountKeyboard,
  buildConfirmCancelKeyboard,
} from './keyboards.js';

/**
 * Muestra picker de cuenta cuando el parser no detectó una clara.
 * Si la cuenta es ambigua (e.g. 'bancolombia'), pregunta solo débito/crédito.
 */
export async function sendAccountPicker(ctx: Context, tx: ParsedTransaction): Promise<void> {
  setPending(ctx, tx);
  const emoji = TYPE_EMOJI[tx.tipo_transaccion];
  const ambiguous = tx.cuenta_tipo === 'ambiguo';
  const opts = ambiguous ? ambiguousResolverOptions(tx.cuenta) : ACCOUNT_OPTIONS;
  const titulo = ambiguous
    ? `¿Es <b>${esc(tx.cuenta)}</b> débito o crédito?`
    : `¿A qué cuenta ${tx.tipo_transaccion === 'income' ? 'llegó' : 'salió'}?`;

  const lines = [
    `${emoji} <b>${TYPE_LABEL[tx.tipo_transaccion]}: ${formatMoney(tx.Valor)} ${esc(tx.moneda)}</b>`,
    `📝 ${esc(tx.descripcion)}`,
    `🏷️ ${esc(tx.categoria)} → ${esc(tx.subcategoria)}`,
    '',
    titulo,
  ];

  await ctx.reply(lines.join('\n'), {
    parse_mode: 'HTML',
    reply_markup: buildAccountKeyboard(opts),
  });
}

/** Muestra confirmación final con botón ✅ Confirmar / ❌ Cancelar. */
export async function sendConfirmation(ctx: Context, tx: ParsedTransaction): Promise<void> {
  setPending(ctx, tx);
  const emoji = TYPE_EMOJI[tx.tipo_transaccion];
  const tipoLabel = formatTipoLabel(tx.cuenta_tipo);

  const lines = [
    `${emoji} <b>${TYPE_LABEL[tx.tipo_transaccion]}: ${formatMoney(tx.Valor)} ${esc(tx.moneda)}</b>`,
    `📝 ${esc(tx.descripcion)}`,
    `🏷️ ${esc(tx.categoria)} → ${esc(tx.subcategoria)}`,
    `💳 ${esc(tx.cuenta)}${tipoLabel}`,
    `📅 ${esc(tx.fecha)}`,
    `🎯 confianza: ${(tx.confidence * 100).toFixed(0)}%`,
  ];

  await ctx.reply(lines.join('\n'), {
    parse_mode: 'HTML',
    reply_markup: buildConfirmCancelKeyboard(),
  });
}

/** Decide automáticamente entre picker o confirmación según si la cuenta está clara. */
export async function offerToUser(ctx: Context, tx: ParsedTransaction): Promise<void> {
  if (tx.cuenta_tipo === 'desconocido' || tx.cuenta_tipo === 'ambiguo') {
    await sendAccountPicker(ctx, tx);
  } else {
    await sendConfirmation(ctx, tx);
  }
}

function formatTipoLabel(tipo: CuentaTipo | undefined): string {
  if (tipo === 'credito') return ' (crédito)';
  if (tipo === 'debito') return ' (débito)';
  return '';
}
