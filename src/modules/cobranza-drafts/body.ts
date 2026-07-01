import type { Cliente, Item, Emisor } from './types.js';
import { formatMoney, formatDate, MESES } from './format.js';

export function buildSubject(numero: string, hoy: Date, fechaVencimiento: Date): string {
  const periodo = `${MESES[hoy.getMonth()]} ${hoy.getFullYear()}`;
  return `Cuenta de Cobro N°${numero} — Servicios ${periodo} | Vence el ${formatDate(fechaVencimiento)}`;
}

export function buildBody(args: {
  cliente: Cliente; items: Item[]; total: number; fechaVencimiento: Date;
  emisor: Emisor; moneda: string; remitenteNombre: string;
}): string {
  const { cliente, items, total, fechaVencimiento, emisor, moneda, remitenteNombre } = args;
  const lineas = items.map((it) => `  • ${it.concepto}: ${formatMoney(it.monto, moneda)}`).join('\n');
  const nota = cliente.notaCorreo ? `\n${cliente.notaCorreo}\n` : '';
  return [
    `Hola, ¡feliz inicio de mes!`,
    ``,
    `Te comparto la cuenta de cobro correspondiente a los servicios de este período. ` +
      `Adjunto el PDF con el detalle.`,
    ``,
    `Resumen:`,
    lineas,
    `  Total a pagar: ${formatMoney(total, moneda)}`,
    ``,
    `Fecha de pago: ${formatDate(fechaVencimiento)}`,
    ``,
    `Datos para el pago:`,
    `  Banco: ${emisor.banco}`,
    `  ${emisor.tipoCuenta} N° ${emisor.numeroCuenta}`,
    `  A nombre de: ${emisor.nombre} — C.C. ${emisor.cedula}`,
    nota,
    `Para tener todo en orden, ¿me confirmas por este medio que recibiste la cuenta y la ` +
      `fecha en que realizarás el pago? Así evitamos que se pase por alto.`,
    ``,
    `Un abrazo,`,
    remitenteNombre,
  ].join('\n');
}
