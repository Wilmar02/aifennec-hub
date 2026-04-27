export type TransactionType = 'income' | 'expense' | 'savings' | 'investment' | 'debt_payment';
export type Currency = 'COP' | 'USD';
export type TransactionSource = 'manual' | 'mercury' | 'telegram';

export interface ParsedTransaction {
  descripcion: string;
  Valor: number;
  tipo_transaccion: TransactionType;
  categoria: string;
  subcategoria: string;
  cuenta: string;
  fecha: string;
  mes: string;
  moneda: Currency;
  fuente: TransactionSource;
  confidence: number;
}
