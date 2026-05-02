// ============================================================
// alerts — dedup de avisos de presupuesto (table alert_state)
// ============================================================
//
// Una categoría que cruza 70/85/100% debe disparar UN solo aviso por umbral
// por mes. Esta capa persiste el "ya avisé" en Supabase para que sobreviva
// reinicios del contenedor y no spamee al usuario.
// ============================================================

import { env } from '../../infra/env.js';
import { logger } from '../../infra/logger.js';

const TABLE = 'alert_state';

function url(path: string): string {
  return `${env.SUPABASE_URL}/rest/v1/${path}`;
}

function headers(extra: Record<string, string> = {}): Record<string, string> {
  return {
    apikey: env.SUPABASE_SERVICE_KEY ?? '',
    Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY ?? ''}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

const FETCH_TIMEOUT_MS = 8_000;

async function fetchTo(input: string, init: RequestInit = {}): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

/**
 * Marca un aviso como disparado e indica si era la primera vez.
 * Devuelve TRUE si el aviso es nuevo (caller debería enviar el mensaje).
 * Devuelve FALSE si ya existía (caller no envía nada).
 *
 * Implementación: usa upsert con `Prefer: return=representation` para distinguir
 * inserts nuevos de filas pre-existentes. Si Supabase devuelve la fila con
 * fired_at distinto de "ahora", ya existía.
 *
 * Más simple: hacer SELECT antes; si no existe, INSERT y retornar true.
 * Acepto la doble query — el costo es despreciable y elimina ambigüedad.
 */
export async function fireAlertOnce(userId: string, scope: string, threshold: number): Promise<boolean> {
  const params = `user_id=eq.${userId}&scope=eq.${encodeURIComponent(scope)}&threshold=eq.${threshold}&select=user_id&limit=1`;
  const check = await fetchTo(url(`${TABLE}?${params}`), { headers: headers() });
  if (check.ok) {
    const rows = (await check.json()) as Array<unknown>;
    if (rows.length > 0) return false;
  }

  const ins = await fetchTo(url(TABLE), {
    method: 'POST',
    headers: headers({ Prefer: 'return=minimal' }),
    body: JSON.stringify([{ user_id: userId, scope, threshold }]),
  });
  if (!ins.ok) {
    // Si falla por unique_violation (race con otro insert simultáneo) → ya alguien avisó, no duplicamos
    if (ins.status === 409) return false;
    const txt = await ins.text();
    logger.warn({ status: ins.status, body: txt.slice(0, 200) }, 'alerts: insert alert_state falló');
    return false; // mejor no spamear si la persistencia falla
  }
  return true;
}
