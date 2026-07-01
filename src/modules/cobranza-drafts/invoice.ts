import type { Item } from './types.js';
import { MESES } from './format.js';

export function computeTotal(items: Item[]): number {
  return items.reduce((acc, it) => acc + it.monto, 0);
}

export function computeFechas(diaPago: number, hoy: Date): { fechaEmision: Date; fechaVencimiento: Date } {
  const fechaEmision = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  let venc = new Date(hoy.getFullYear(), hoy.getMonth(), diaPago);
  if (venc.getTime() < fechaEmision.getTime()) {
    venc = new Date(hoy.getFullYear(), hoy.getMonth() + 1, diaPago);
  }
  return { fechaEmision, fechaVencimiento: venc };
}

export function buildConcepto(periodo: string, hoy: Date): string {
  return `${periodo} — ${MESES[hoy.getMonth()]} ${hoy.getFullYear()}`;
}
