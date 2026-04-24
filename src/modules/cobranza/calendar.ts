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

/**
 * Cadena de escalamiento. El motor nunca salta pasos: respeta esta secuencia
 * y los mínimos de espera (días desde el envío anterior + días desde día de pago).
 *
 * Diseño: incluso si llega un cliente con 30 días de atraso de golpe, NO se le
 * manda T_PLUS_30 directo — se inicia con T_ZERO y se escala gradualmente con
 * 3-4 días entre cada touch para no quemar la relación.
 */
export const ESCALATION_CHAIN: Array<{
  template: TemplateId;
  /** mínimo de días desde el día de pago para que aplique este step */
  minDaysFromDue: number;
  /** mínimo de días desde el envío del step anterior */
  minDaysSincePrev: number;
  critical: boolean;
}> = [
  { template: 'T_MINUS_3', minDaysFromDue: -3, minDaysSincePrev: 0,  critical: false },
  { template: 'T_ZERO',    minDaysFromDue: 0,  minDaysSincePrev: 0,  critical: false },
  { template: 'T_PLUS_3',  minDaysFromDue: 3,  minDaysSincePrev: 3,  critical: false },
  { template: 'T_PLUS_7',  minDaysFromDue: 7,  minDaysSincePrev: 4,  critical: false },
  { template: 'T_PLUS_11', minDaysFromDue: 11, minDaysSincePrev: 4,  critical: true  },
  { template: 'T_PAUSA',   minDaysFromDue: 15, minDaysSincePrev: 4,  critical: true  },
  { template: 'T_PLUS_30', minDaysFromDue: 30, minDaysSincePrev: 15, critical: true  },
  { template: 'T_PLUS_45', minDaysFromDue: 45, minDaysSincePrev: 15, critical: true  },
];

/**
 * Decisión escalada con gating: solo permite enviar el siguiente template de la
 * cadena tras el último enviado, respetando minDaysSincePrev y minDaysFromDue.
 */
export function escalationDecide(
  daysFromDue: number,
  lastSent: { template: TemplateId; sentAt: Date } | null,
  today: Date
): DunningDecision | null {
  // Sin envíos previos en la ventana
  if (!lastSent) {
    // Demasiado temprano (más de 3 días antes del día de pago)
    if (daysFromDue < -3) return null;
    // Ventana de recordatorio previo: -3 a -1
    if (daysFromDue < 0) {
      return { template: 'T_MINUS_3', diasAlPago: daysFromDue, isCritical: false };
    }
    // En o después del día: T_ZERO (cubre cualquier atraso de primer contacto)
    return { template: 'T_ZERO', diasAlPago: daysFromDue, isCritical: false };
  }

  const idx = ESCALATION_CHAIN.findIndex((s) => s.template === lastSent.template);
  if (idx < 0) {
    // Template viejo no en cadena — fallback a primer contacto
    return { template: 'T_ZERO', diasAlPago: daysFromDue, isCritical: false };
  }
  if (idx === ESCALATION_CHAIN.length - 1) return null; // último step ya enviado

  const next = ESCALATION_CHAIN[idx + 1]!;
  const daysSinceLast = Math.floor((today.getTime() - lastSent.sentAt.getTime()) / 86_400_000);

  if (daysSinceLast < next.minDaysSincePrev) return null;
  if (daysFromDue < next.minDaysFromDue) return null;

  return {
    template: next.template,
    diasAlPago: daysFromDue,
    isCritical: next.critical,
  };
}

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
