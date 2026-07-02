import type { Cliente } from './types.js';

export type RecordatorioTipo = 'preventivo' | 'mora';

export interface RecordatorioDue {
  cliente: Cliente;
  tipo: RecordatorioTipo;
  fechaPago: Date;
}

function sameYmd(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

export function dueReminders(clientes: Cliente[], hoy: Date): RecordatorioDue[] {
  const due: RecordatorioDue[] = [];

  for (const cliente of clientes) {
    if (!cliente.activo || !cliente.recordatorios) continue;

    const fechaPago = new Date(hoy.getFullYear(), hoy.getMonth(), cliente.diaPago);
    const preventivo = addDays(fechaPago, -2);
    const mora = addDays(fechaPago, 3);

    if (sameYmd(hoy, preventivo)) {
      due.push({ cliente, tipo: 'preventivo', fechaPago });
    } else if (sameYmd(hoy, mora)) {
      due.push({ cliente, tipo: 'mora', fechaPago });
    }
  }

  return due;
}
