import { env } from '../../infra/env.js';

const TABLE = 'base de ingresos';

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

let cachedOwnerId: string | null = null;

/** Resuelve user_id en `perfiles` por telegram_id. Cae a OWNER_TELEGRAM_ID si no encuentra. */
export async function resolveUserId(telegramId: number): Promise<string | null> {
  const direct = await fetch(
    url(`perfiles?telegram_id=eq.${encodeURIComponent(String(telegramId))}&select=id&limit=1`),
    { headers: headers() }
  );
  if (direct.ok) {
    const rows = (await direct.json()) as { id: string }[];
    if (rows[0]?.id) return rows[0].id;
  }
  if (cachedOwnerId) return cachedOwnerId;
  const ownerTgId = env.TELEGRAM_DIGEST_CHAT_ID;
  const owner = await fetch(
    url(`perfiles?telegram_id=eq.${encodeURIComponent(ownerTgId)}&select=id&limit=1`),
    { headers: headers() }
  );
  if (owner.ok) {
    const rows = (await owner.json()) as { id: string }[];
    cachedOwnerId = rows[0]?.id ?? null;
  }
  return cachedOwnerId;
}

export async function insertTransaction(row: Record<string, unknown>): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch(url(encodeURIComponent(TABLE)), {
    method: 'POST',
    headers: headers({ Prefer: 'return=minimal' }),
    body: JSON.stringify([row]),
  });
  if (!res.ok) return { ok: false, error: `${res.status} ${(await res.text()).slice(0, 200)}` };
  return { ok: true };
}

export interface TxRow {
  id: number;
  fecha: string;
  descripcion: string;
  Valor: number;
  tipo_transaccion: string;
  categoria: string;
  cuenta: string;
  moneda: string;
}

/** Últimos N movimientos del usuario (gastos + ingresos + savings + investment + debt). */
export async function recentTransactions(userId: string, limit = 10): Promise<TxRow[]> {
  const sel = 'id,fecha,descripcion,Valor,tipo_transaccion,categoria,cuenta,moneda';
  const path = `${encodeURIComponent(TABLE)}?user_id=eq.${userId}&select=${sel}&order=fecha.desc,id.desc&limit=${limit}`;
  const res = await fetch(url(path), { headers: headers() });
  if (!res.ok) throw new Error(`supabase recent: ${res.status} ${await res.text()}`);
  return (await res.json()) as TxRow[];
}

export interface MonthAgg {
  tipo_transaccion: string;
  total: number;
}

/** Suma del mes (yyyy-MM) por tipo_transaccion. */
export async function monthAggregateByType(userId: string, yyyymm: string): Promise<MonthAgg[]> {
  const start = `${yyyymm}-01`;
  const [y, m] = yyyymm.split('-').map(Number) as [number, number];
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${yyyymm}-${String(lastDay).padStart(2, '0')}`;
  const sel = 'tipo_transaccion,Valor';
  const path = `${encodeURIComponent(TABLE)}?user_id=eq.${userId}&fecha=gte.${start}&fecha=lte.${end}&select=${sel}`;
  const res = await fetch(url(path), { headers: headers() });
  if (!res.ok) throw new Error(`supabase aggregate: ${res.status} ${await res.text()}`);
  const rows = (await res.json()) as { tipo_transaccion: string; Valor: number }[];
  const grouped = new Map<string, number>();
  for (const r of rows) grouped.set(r.tipo_transaccion, (grouped.get(r.tipo_transaccion) ?? 0) + Number(r.Valor));
  return Array.from(grouped, ([tipo_transaccion, total]) => ({ tipo_transaccion, total }));
}
