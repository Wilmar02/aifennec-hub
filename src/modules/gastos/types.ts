export type TransactionType = 'income' | 'expense' | 'savings' | 'investment' | 'debt_payment';
export type Currency = 'COP' | 'USD';
export type TransactionSource = 'manual' | 'mercury' | 'telegram';
export type CuentaTipo = 'debito' | 'credito' | 'efectivo' | 'ambiguo' | 'desconocido';

export interface ParsedTransaction {
  descripcion: string;
  Valor: number;
  tipo_transaccion: TransactionType;
  categoria: string;
  subcategoria: string;
  cuenta: string;
  cuenta_tipo?: CuentaTipo;
  fecha: string;
  mes: string;
  moneda: Currency;
  fuente: TransactionSource;
  confidence: number;
}
