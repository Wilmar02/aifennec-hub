import type { Context } from 'grammy';
import type { TransactionType, CuentaTipo, Currency } from '../types.js';
import { PENDING_TTL_MS, PENDING_CLEANUP_INTERVAL_MS } from '../config.js';

/**
 * State machine para el flow guiado (botones).
 * Distinto del `pending` (que guarda una tx parseada esperando confirmación):
 * acá guardamos un estado parcial mientras el usuario navega los botones.
 *
 * Steps:
 *   tipo → categoria → subcategoria → cuenta → monto → descripcion → confirmar
 *
 * Key compuesta `chatId:fromId` igual que pending.
 */
export type WizardStep =
  | 'tipo'
  | 'categoria'
  | 'subcategoria'
  | 'cuenta'
  | 'monto'
  | 'descripcion'
  | 'confirmar';

export interface WizardState {
  step: WizardStep;
  tipo?: TransactionType;
  categoria?: string;
  subcategoria?: string;
  cuenta?: string;
  cuenta_tipo?: CuentaTipo;
  moneda?: Currency;
  Valor?: number;
  descripcion?: string;
  /** ID del mensaje del bot para editarlo en lugar de spammear. */
  messageId?: number;
  _expires: number;
}

const wizards = new Map<string, WizardState>();

function key(ctx: Context): string {
  return `${ctx.chat?.id ?? 'nochat'}:${ctx.from?.id ?? 'nofrom'}`;
}

export function startWizard(ctx: Context): WizardState {
  const w: WizardState = { step: 'tipo', _expires: Date.now() + PENDING_TTL_MS };
  wizards.set(key(ctx), w);
  return w;
}

export function getWizard(ctx: Context): WizardState | null {
  const w = wizards.get(key(ctx));
  if (!w) return null;
  if (Date.now() > w._expires) {
    wizards.delete(key(ctx));
    return null;
  }
  return w;
}

export function updateWizard(ctx: Context, patch: Partial<WizardState>): WizardState | null {
  const w = getWizard(ctx);
  if (!w) return null;
  const updated: WizardState = { ...w, ...patch, _expires: Date.now() + PENDING_TTL_MS };
  wizards.set(key(ctx), updated);
  return updated;
}

export function clearWizard(ctx: Context): void {
  wizards.delete(key(ctx));
}

export function hasActiveWizard(ctx: Context): boolean {
  return getWizard(ctx) !== null;
}

setInterval(() => {
  const now = Date.now();
  for (const [k, w] of wizards) {
    if (now > w._expires) wizards.delete(k);
  }
}, PENDING_CLEANUP_INTERVAL_MS);

// Solo para tests
export function _wizardSize(): number {
  return wizards.size;
}
