export const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
] as const;

export function formatMoney(monto: number, moneda: string): string {
  const n = new Intl.NumberFormat('es-CO').format(Math.round(monto));
  return `$${n} ${moneda}`;
}

export function formatDate(d: Date): string {
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}
