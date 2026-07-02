import type { Cliente, Emisor } from './types.js';
import { formatMoney, formatDate, MESES } from './format.js';
import type { RecordatorioTipo } from './reminders.js';

export function buildReminderSubject(
  cliente: Cliente,
  tipo: RecordatorioTipo,
  hoy: Date,
): string {
  const mes = MESES[hoy.getMonth()];
  if (tipo === 'preventivo') {
    return `Recordatorio: se acerca el pago de tu cuenta de ${mes}`;
  }
  return `Tu cuenta de ${mes} quedó pendiente`;
}

export function buildReminderBody(args: {
  cliente: Cliente; tipo: RecordatorioTipo; total: number;
  fechaPago: Date; emisor: Emisor; moneda: string;
}): string {
  const { tipo, total, fechaPago, emisor, moneda } = args;
  const mes = MESES[fechaPago.getMonth()];
  const monto = formatMoney(total, moneda);

  const intro = tipo === 'preventivo'
    ? `Hola, te escribo porque se acerca la fecha de pago de tu cuenta de ${mes} por ${monto}.`
    : `Hola, tu cuenta de ${mes} por ${monto} quedó pendiente de pago.`;

  const cierre = tipo === 'preventivo'
    ? `Cualquier novedad con el pago me cuentas, así lo dejamos al día sin contratiempos.`
    : `Si ya realizaste el pago, ignora este mensaje; si no, te agradezco confirmarme para dejarlo al día.`;

  return [
    intro,
    ``,
    `Fecha de pago: ${formatDate(fechaPago)}`,
    ``,
    `Datos para el pago:`,
    `  Banco: ${emisor.banco}`,
    `  ${emisor.tipoCuenta} N° ${emisor.numeroCuenta}`,
    `  A nombre de: ${emisor.nombre} — C.C. ${emisor.cedula}`,
    ``,
    cierre,
    ``,
    `Un abrazo,`,
    emisor.nombre,
  ].join('\n');
}
