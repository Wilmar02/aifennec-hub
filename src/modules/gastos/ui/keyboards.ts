import { InlineKeyboard } from 'grammy';

// ============================================================
// CATÁLOGO DE CUENTAS — para inline keyboards
// ============================================================

export interface AccountOption {
  label: string;
  value: string;
}

/** Cuentas que el usuario realmente usa. Si agregás una, también agregala al parser y al tipoMap. */
export const ACCOUNT_OPTIONS: readonly AccountOption[] = [
  { label: '🏦 Bancolombia débito', value: 'bancolombia debito' },
  { label: '💳 Bancolombia crédito', value: 'bancolombia credito' },
  { label: '🏦 Davivienda débito', value: 'davivienda debito' },
  { label: '💳 Davivienda crédito', value: 'davivienda credito' },
  { label: '💳 Nu Colombia', value: 'nu colombia' },
  { label: '💲 Dólar App', value: 'dolar app' },
  { label: '🇺🇸 Mercury (USD)', value: 'mercury' },
  { label: '💵 Efectivo', value: 'efectivo' },
] as const;

/** Cuentas que operan en USD por default (auto-set moneda al elegirlas). */
export const USD_ACCOUNTS = new Set(['mercury', 'dolar app']);

/** Mapa cuenta → tipo (débito/crédito/efectivo) para metadata persistida. */
export const ACCOUNT_TIPO: Record<string, 'debito' | 'credito' | 'efectivo'> = {
  'bancolombia debito': 'debito',
  'bancolombia credito': 'credito',
  'davivienda debito': 'debito',
  'davivienda credito': 'credito',
  'nu colombia': 'credito',
  'dolar app': 'debito',
  mercury: 'debito',
  efectivo: 'efectivo',
};

/**
 * Subset débito/crédito para resolver ambigüedad de bancos que tienen ambas modalidades.
 * Usado cuando el parser detecta `bancolombia` o `davivienda` sin sufijo.
 */
export function ambiguousResolverOptions(baseAccount: string): AccountOption[] {
  if (baseAccount === 'bancolombia') {
    return [
      { label: '🏦 Débito', value: 'bancolombia debito' },
      { label: '💳 Crédito', value: 'bancolombia credito' },
    ];
  }
  if (baseAccount === 'davivienda') {
    return [
      { label: '🏦 Débito', value: 'davivienda debito' },
      { label: '💳 Crédito', value: 'davivienda credito' },
    ];
  }
  return [];
}

/**
 * Construye un InlineKeyboard con los options dados, 2 botones por fila,
 * y un botón final de cancelar (callback data: gasto:cancel).
 */
export function buildAccountKeyboard(options: readonly AccountOption[]): InlineKeyboard {
  const kb = new InlineKeyboard();
  options.forEach((o, i) => {
    kb.text(o.label, `cuenta:${o.value}`);
    if (i % 2 === 1 || i === options.length - 1) kb.row();
  });
  kb.text('❌ Cancelar', 'gasto:cancel');
  return kb;
}

/** InlineKeyboard simple confirmar/cancelar para confirmación final. */
export function buildConfirmCancelKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text('✅ Confirmar', 'gasto:ok').text('❌ Cancelar', 'gasto:cancel');
}
