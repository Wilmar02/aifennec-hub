import type { Context } from 'grammy';
import type { ParsedTransaction } from '../types.js';
import { PENDING_TTL_MS, PENDING_CLEANUP_INTERVAL_MS } from '../config.js';

/**
 * Map en memoria de transacciones esperando confirmación del usuario.
 * Key compuesta `chatId:fromId` para que en grupos los flujos de distintos users no se pisen.
 */
type PendingEntry = ParsedTransaction & { _expires: number };
const pending = new Map<string, PendingEntry>();

/** Genera la key del Map combinando chat + user. */
export function pendingKey(ctx: Context): string {
  return `${ctx.chat?.id ?? 'nochat'}:${ctx.from?.id ?? 'nofrom'}`;
}

export function setPending(ctx: Context, tx: ParsedTransaction): void {
  pending.set(pendingKey(ctx), { ...tx, _expires: Date.now() + PENDING_TTL_MS });
}

export function getPending(ctx: Context): ParsedTransaction | null {
  const entry = pending.get(pendingKey(ctx));
  if (!entry) return null;
  if (Date.now() > entry._expires) {
    pending.delete(pendingKey(ctx));
    return null;
  }
  // Devolvemos la tx sin el campo interno _expires
  const { _expires, ...tx } = entry;
  return tx;
}

export function deletePending(ctx: Context): void {
  pending.delete(pendingKey(ctx));
}

// Cleanup periódico de entradas expiradas (evita memory leak si users abandonan flujos)
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of pending) {
    if (now > v._expires) pending.delete(k);
  }
}, PENDING_CLEANUP_INTERVAL_MS);

// Solo para tests — exporta size del Map para verificar cleanup
export function _pendingSize(): number {
  return pending.size;
}
