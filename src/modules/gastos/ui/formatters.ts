import type { TransactionType } from '../types.js';

// ============================================================
// FORMATTERS — money, html escape, type labels
// ============================================================

export const TYPE_EMOJI: Record<TransactionType, string> = {
  income: '💚',
  expense: '🔴',
  savings: '💙',
  investment: '💜',
  debt_payment: '🟠',
};

export const TYPE_LABEL: Record<TransactionType, string> = {
  income: 'Ingreso',
  expense: 'Gasto',
  savings: 'Ahorro',
  investment: 'Inversión',
  debt_payment: 'Pago deuda',
};

export const CAT_EMOJI: Record<string, string> = {
  Vivienda: '🏠',
  Alimento: '🍎',
  Transporte: '🚗',
  Seguros: '🏥',
  Educación: '📚',
  Ahorro: '🏦',
  'Viajes y Paseos': '✈️',
  'Gastos Personales': '👤',
  Inversiones: '📈',
  Deudas: '💳',
  Salario: '💼',
  'Otros Ingresos': '💵',
  'Rentas y Alquileres': '🏘️',
  'Ingresos por Intereses': '📊',
  Dividendos: '💎',
};

export const CAT_ORDER = [
  'Vivienda', 'Alimento', 'Transporte', 'Seguros', 'Educación',
  'Ahorro', 'Viajes y Paseos', 'Gastos Personales', 'Inversiones', 'Deudas',
];

/** Formatea pesos con separador de miles colombiano (punto). */
export function formatMoney(n: number): string {
  return `$${new Intl.NumberFormat('es-CO').format(Math.round(n))}`;
}

/** Versión compacta: 1.5M, 350k, $0. Útil para listas densas. */
export function compactMoney(n: number): string {
  if (n === 0) return '$0';
  if (Math.abs(n) >= 1_000_000) {
    const v = n / 1_000_000;
    return '$' + v.toFixed(v >= 10 ? 1 : 2).replace(/\.?0+$/, '') + 'M';
  }
  if (Math.abs(n) >= 1_000) return '$' + Math.round(n / 1000) + 'k';
  return '$' + n;
}

/**
 * Escapa caracteres reservados de Telegram HTML (`& < >`).
 * SIEMPRE usar antes de interpolar input de usuario en respuestas con `parse_mode: 'HTML'`.
 */
export function esc(s: string | number | null | undefined): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
