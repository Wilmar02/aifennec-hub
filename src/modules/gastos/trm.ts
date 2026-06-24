// ============================================================
// TRM — conversión USD→COP para agregados del bot
// ============================================================
// El balance suma transacciones en COP y USD. Sin convertir, los ingresos
// USD (clientes USA) se cuentan a 1:1 y el neto sale falsamente en rojo.
// Esta utilidad convierte todo a COP usando la TRM del Banco de la República.

/** TRM de respaldo si la red falla y no hay nada cacheado. */
export const TRM_FALLBACK = 4100;

const TRM_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const TRM_ENDPOINT =
  'https://www.datos.gov.co/resource/32sa-8pi3.json?$order=vigenciadesde%20DESC&$limit=1';

let cache: { trm: number; at: number } | null = null;

/** Solo para tests: limpia el caché en memoria. */
export function __resetTrmCache(): void {
  cache = null;
}

async function defaultFetcher(): Promise<unknown> {
  const res = await fetch(TRM_ENDPOINT);
  if (!res.ok) throw new Error(`trm http ${res.status}`);
  return res.json();
}

/**
 * TRM USD→COP vigente, cacheada 24h en memoria. Si el fetch falla o trae basura,
 * cae a la última TRM cacheada o, en su defecto, a TRM_FALLBACK — así el balance
 * nunca se rompe por un problema de red.
 */
export async function getTrm(
  fetcher: () => Promise<unknown> = defaultFetcher,
  now: number = Date.now()
): Promise<number> {
  if (cache && now - cache.at < TRM_TTL_MS) return cache.trm;
  try {
    const trm = parseTrmResponse(await fetcher());
    if (trm != null) {
      cache = { trm, at: now };
      return trm;
    }
  } catch {
    // ignora: cae al fallback de abajo
  }
  return cache?.trm ?? TRM_FALLBACK;
}

/** Convierte un valor a COP. Si la moneda ya es COP, lo deja igual. */
export function convertToCop(valor: number, moneda: string, trm: number): number {
  return moneda === 'USD' ? valor * trm : valor;
}

/**
 * Extrae la TRM del payload de datos.gov.co (Banco de la República).
 * Forma esperada: [{ valor: "3950.00", vigenciadesde: "..." }, ...].
 * Devuelve null si el payload no es usable (vacío, malformado, no numérico).
 */
export function parseTrmResponse(payload: unknown): number | null {
  if (!Array.isArray(payload) || payload.length === 0) return null;
  const v = Number((payload[0] as { valor?: unknown })?.valor);
  return Number.isFinite(v) && v > 0 ? v : null;
}

export interface TypeAgg {
  tipo_transaccion: string;
  total: number;
}

/**
 * Suma filas por tipo_transaccion convirtiendo cada una a COP con la TRM dada.
 * Cualquier moneda distinta de 'USD' se trata como COP (no infla por dato sucio).
 */
export function aggregateByTypeCop(
  rows: { tipo_transaccion: string; Valor: number; moneda: string }[],
  trm: number
): TypeAgg[] {
  const grouped = new Map<string, number>();
  for (const r of rows) {
    const cop = convertToCop(Number(r.Valor), r.moneda, trm);
    grouped.set(r.tipo_transaccion, (grouped.get(r.tipo_transaccion) ?? 0) + cop);
  }
  return Array.from(grouped, ([tipo_transaccion, total]) => ({ tipo_transaccion, total }));
}
