// ============================================================
// embed-transactions.mjs — backfill embeddings de transacciones existentes.
// ============================================================
//
// Lee toda la tabla "base de ingresos", genera un texto natural por fila,
// embedea con text-embedding-3-small (1536 dims), y upsertea en
// transaction_embeddings.
//
// Idempotente: usa upsert por transaction_id. Re-correr es seguro y solo
// re-embedea las filas que cambiaron de contenido.
//
// Uso:
//   docker exec -e OPENAI_API_KEY=sk-... <bot-container> node /tmp/embed-transactions.mjs
//
// Costo: ~$0.0003 por 300 filas. text-embedding-3-small = $0.020/1M tokens.
// ============================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !OPENAI_KEY) {
  console.error('Faltan env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENAI_API_KEY');
  process.exit(1);
}

const TABLE_TX = encodeURIComponent('base de ingresos');
const TABLE_EMB = 'transaction_embeddings';
const MODEL = 'text-embedding-3-small';
const BATCH_SIZE = 100; // OpenAI permite hasta 2048 inputs/call, 100 es seguro

const TYPE_LABEL = {
  expense: 'gasto',
  income: 'ingreso',
  savings: 'ahorro',
  investment: 'inversión',
  debt_payment: 'pago de deuda',
};

function fmtMoney(n, moneda) {
  const symbol = moneda === 'USD' ? 'US$' : '$';
  return `${symbol}${Math.round(Number(n) || 0).toLocaleString('es-CO')}`;
}

/**
 * Construye el texto que se va a embedear. La idea: capturar todo lo
 * relevante para que queries en lenguaje natural matcheen.
 *
 * Formato:
 *   "2026-04-08 | Gastos Personales/Otros | Lavandería | $30.000 COP | gasto via bancolombia"
 */
function buildContent(row) {
  const date = (row.fecha ?? '').slice(0, 10);
  const cat = `${row.categoria ?? '?'}/${row.subcategoria ?? '?'}`;
  const desc = (row.descripcion ?? '').trim();
  const amount = fmtMoney(row.Valor, row.moneda);
  const moneda = row.moneda ?? 'COP';
  const tipoLabel = TYPE_LABEL[row.tipo_transaccion] ?? row.tipo_transaccion ?? '?';
  const cuenta = row.cuenta ?? 'manual';
  return `${date} | ${cat} | ${desc} | ${amount} ${moneda} | ${tipoLabel} via ${cuenta}`;
}

async function supabaseGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) throw new Error(`supabase GET ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

async function supabaseUpsert(path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`supabase UPSERT ${res.status}: ${(await res.text()).slice(0, 400)}`);
  }
}

async function embedBatch(inputs) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, input: inputs }),
  });
  if (!res.ok) throw new Error(`openai embeddings ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data.data.map(d => d.embedding);
}

async function loadExistingFingerprints() {
  // Map transaction_id → content (sirve para saber qué saltar).
  const rows = await supabaseGet(`${TABLE_EMB}?select=transaction_id,content&limit=10000`);
  const m = new Map();
  for (const r of rows) m.set(Number(r.transaction_id), r.content);
  return m;
}

async function main() {
  const t0 = Date.now();
  console.error(`[${new Date().toISOString()}] backfill embeddings start`);

  // 1. Pull todas las transacciones
  const txs = await supabaseGet(
    `${TABLE_TX}?select=id,user_id,fecha,descripcion,Valor,moneda,cuenta,categoria,subcategoria,tipo_transaccion&order=fecha.desc&limit=5000`
  );
  console.error(`pulled ${txs.length} transactions`);

  // 2. Load existing fingerprints to skip ones we already have
  const existing = await loadExistingFingerprints();
  console.error(`already embedded: ${existing.size}`);

  // 3. Build pending list (con cambio de contenido o nuevas)
  const pending = [];
  for (const t of txs) {
    if (!t.user_id) continue; // sin user_id no podemos almacenar
    const content = buildContent(t);
    if (existing.get(Number(t.id)) === content) continue; // ya está actualizado
    pending.push({ id: Number(t.id), user_id: t.user_id, content });
  }
  console.error(`pending: ${pending.length}`);

  if (pending.length === 0) {
    console.error('nada que embeduear, ya estamos al día.');
    return;
  }

  // 4. Embed en batches y upsert
  let done = 0;
  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const slice = pending.slice(i, i + BATCH_SIZE);
    const inputs = slice.map(p => p.content);
    const vecs = await embedBatch(inputs);
    const rows = slice.map((p, j) => ({
      transaction_id: p.id,
      user_id: p.user_id,
      content: p.content,
      embedding: vecs[j],
      model: MODEL,
    }));
    await supabaseUpsert(TABLE_EMB, rows);
    done += slice.length;
    console.error(`upserted ${done}/${pending.length}`);
  }

  console.error(`done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main().catch(e => {
  console.error('FATAL', e);
  process.exit(2);
});
