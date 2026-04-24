import type { DunningDecision, TemplateId } from './types.js';

const LEVELS: Array<{ threshold: number; template: TemplateId; critical: boolean }> = [
  { threshold: -3, template: 'T_MINUS_3', critical: false },
  { threshold: 0,  template: 'T_ZERO',    critical: false },
  { threshold: 3,  template: 'T_PLUS_3',  critical: false },
  { threshold: 7,  template: 'T_PLUS_7',  critical: false },
  { threshold: 11, template: 'T_PLUS_11', critical: true },
  { threshold: 15, template: 'T_PAUSA',   critical: true },
  { threshold: 30, template: 'T_PLUS_30', critical: true },
  { threshold: 45, template: 'T_PLUS_45', critical: true },
];

/** Día del mes (1-31) efectivo: el último día si la fecha se pasa del rango. */
function clampDay(year: number, month: number, day: number): Date {
  const lastDay = new Date(year, month, 0).getDate();
  const d = Math.min(Math.max(day, 1), lastDay);
  return new Date(year, month - 1, d);
}

/**
 * Calcula días relativos al día de pago (negativo = faltan, positivo = atraso).
 * today en timezone America/Bogota.
 */
export function daysRelativeToDueDay(today: Date, dueDay: number): number {
  const y = today.getFullYear();
  const m = today.getMonth() + 1;
  const dueThisMonth = clampDay(y, m, dueDay);
  const MS = 86400000;
  const normalizedToday = new Date(y, today.getMonth(), today.getDate());
  return Math.round((normalizedToday.getTime() - dueThisMonth.getTime()) / MS);
}

/**
 * Decide qué template corresponde hoy según days offset.
 * Regla: máximo threshold <= days. Si days < -3 no aplica.
 * Retorna null si no corresponde envío hoy.
 */
export function pickTemplate(days: number): DunningDecision | null {
  let picked: (typeof LEVELS)[number] | null = null;
  for (const lvl of LEVELS) {
    if (days >= lvl.threshold) picked = lvl;
  }
  if (!picked) return null;
  return { template: picked.template, diasAlPago: days, isCritical: picked.critical };
}

/**
 * Versión high-level: dado dia_pago y today, retorna la decisión (o null).
 */
export function computeDecision(today: Date, dueDay: number): DunningDecision | null {
  if (!dueDay || dueDay < 1 || dueDay > 31) return null;
  const days = daysRelativeToDueDay(today, dueDay);
  return pickTemplate(days);
}
