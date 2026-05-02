// ============================================================
// draft-reclassify.mjs — DRY-RUN. NO TOCA NADA.
// ============================================================
// History-aware classifier. Para cada fila candidata:
//
//  1) Busca filas pasadas con descripción similar (Jaccard sobre tokens)
//  2) Si las pasadas son consistentes → usa esa clasificación SIN llamar al LLM
//  3) Si no hay consenso → LLM con las top-5 similares como few-shot examples
//  4) Si no hay similares → LLM solo con la taxonomía
//
// El paso 1+2 elimina la mayoría del ruido "taste preference" (la IA propone
// mover Salidas a restaurante a Alimento/Restaurante porque no sabe que el
// usuario lo prefiere bajo Gastos Personales — ahora aprende del historial).
//
// Uso (dentro del container del bot):
//   docker exec -e OPENAI_API_KEY=sk-... -e RECLASSIFY_MODE=all-expense \\
//     <container> node /tmp/draft-reclassify.mjs > /tmp/draft.md
//
// Modos: huerfanos | all-income | all-expense
// ============================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const TABLE = encodeURIComponent('base de ingresos');
const MAX_ROWS = 300;

// Thresholds
const HISTORY_MIN_JACCARD = 0.40;       // similitud mínima para considerar match
const HISTORY_TOP_K = 5;                // cuántos similares analizamos
const HISTORY_CONSENSUS_MIN_COUNT = 3;  // mínimo de filas consistentes para usar history-only
const HISTORY_CONSENSUS_MIN_RATIO = 0.6; // mínimo % de los top-K que deben estar de acuerdo
const SPECIFIC_TOKEN_MIN_LEN = 5;       // los matches deben compartir ≥1 token de esta longitud
                                         // (filtra falsos positivos por palabras cortas comunes)

if (!SUPABASE_URL || !SUPABASE_KEY || !OPENAI_KEY) {
  console.error('Faltan env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENAI_API_KEY');
  process.exit(1);
}

// ============================================================
// Taxonomía válida — usada SOLO cuando llamamos al LLM.
// El history-match no la usa (acepta cualquier (cat,sub) que aparezca en el
// historial real del usuario, incluso si no está acá).
// ============================================================
const TAXONOMY = [
  { cat: 'Vivienda', sub: 'Arriendo', tipo: 'expense' },
  { cat: 'Vivienda', sub: 'Cuota apartamento', tipo: 'expense' },
  { cat: 'Vivienda', sub: 'Comida de perro', tipo: 'expense' },
  { cat: 'Vivienda', sub: 'Seguros', tipo: 'expense' },
  { cat: 'Vivienda', sub: 'Impuestos', tipo: 'expense' },
  { cat: 'Vivienda', sub: 'Luz', tipo: 'expense' },
  { cat: 'Vivienda', sub: 'Agua-10241005619', tipo: 'expense' },
  { cat: 'Vivienda', sub: 'Gas', tipo: 'expense' },
  { cat: 'Vivienda', sub: 'Internet 12054838774', tipo: 'expense' },
  { cat: 'Vivienda', sub: 'Mantenimiento / Arreglos', tipo: 'expense' },
  { cat: 'Vivienda', sub: 'Administracion', tipo: 'expense' },
  { cat: 'Alimento', sub: 'Mercado', tipo: 'expense' },
  { cat: 'Alimento', sub: 'Restaurante', tipo: 'expense' },
  { cat: 'Transporte', sub: 'Gasolina', tipo: 'expense' },
  { cat: 'Transporte', sub: 'Cuotas auto', tipo: 'expense' },
  { cat: 'Transporte', sub: 'Reparaciones', tipo: 'expense' },
  { cat: 'Transporte', sub: 'Seguros', tipo: 'expense' },
  { cat: 'Transporte', sub: 'Transporte público', tipo: 'expense' },
  { cat: 'Transporte', sub: 'Bicicleta', tipo: 'expense' },
  { cat: 'Transporte', sub: 'Licencia / Trámites', tipo: 'expense' },
  { cat: 'Transporte', sub: 'Cuota de manejo tarjeta', tipo: 'expense' },
  { cat: 'Seguros', sub: 'Medico', tipo: 'expense' },
  { cat: 'Seguros', sub: 'Ortodoncia', tipo: 'expense' },
  { cat: 'Seguros', sub: 'Seguridad social', tipo: 'expense' },
  { cat: 'Educación', sub: 'Universidad', tipo: 'expense' },
  { cat: 'Educación', sub: 'Cursos / Ingles', tipo: 'expense' },
  { cat: 'Educación', sub: 'Libros', tipo: 'expense' },
  { cat: 'Educación', sub: 'Materiales', tipo: 'expense' },
  { cat: 'Educación', sub: 'Gimnasio', tipo: 'expense' },
  { cat: 'Educación', sub: 'Matrícula Taekwondo', tipo: 'expense' },
  { cat: 'Viajes y Paseos', sub: 'Hospedaje', tipo: 'expense' },
  { cat: 'Viajes y Paseos', sub: 'Transporte', tipo: 'expense' },
  { cat: 'Viajes y Paseos', sub: 'Viajes', tipo: 'expense' },
  { cat: 'Gastos Personales', sub: 'Vestimenta', tipo: 'expense' },
  { cat: 'Gastos Personales', sub: 'Calzado', tipo: 'expense' },
  { cat: 'Gastos Personales', sub: 'Celular', tipo: 'expense' },
  { cat: 'Gastos Personales', sub: 'Salidas a restaurante', tipo: 'expense' },
  { cat: 'Gastos Personales', sub: 'Barbería / Estética', tipo: 'expense' },
  { cat: 'Gastos Personales', sub: 'Gastos Personales/cerveza', tipo: 'expense' },
  { cat: 'Gastos Personales', sub: 'Materiales', tipo: 'expense' },
  { cat: 'Ahorro', sub: 'Ahorro general', tipo: 'savings' },
  { cat: 'Ahorro', sub: 'Cajita Nu', tipo: 'savings' },
  { cat: 'Ahorro', sub: 'Hipoteca', tipo: 'savings' },
  { cat: 'Ahorro', sub: 'Inversión Lote', tipo: 'savings' },
  { cat: 'Ahorro', sub: 'Colchón financiero', tipo: 'savings' },
  { cat: 'Ahorro', sub: 'Viajes y disfrute', tipo: 'savings' },
  { cat: 'Inversiones', sub: 'Acciones', tipo: 'investment' },
  { cat: 'Inversiones', sub: 'Bonos', tipo: 'investment' },
  { cat: 'Inversiones', sub: 'Depósitos a Plazo Fijo', tipo: 'investment' },
  { cat: 'Inversiones', sub: 'Herramientas empresa', tipo: 'investment' },
  { cat: 'Inversiones', sub: 'Inversion Lote', tipo: 'investment' },
  { cat: 'Inversiones', sub: 'Pagos de Intereses', tipo: 'investment' },
  { cat: 'Inversiones', sub: 'Vehículo', tipo: 'investment' },
  { cat: 'Deudas', sub: 'Crédito Vehículo Davivienda', tipo: 'debt_payment' },
  { cat: 'Deudas', sub: 'Crédito Hipotecario Davivienda', tipo: 'debt_payment' },
  { cat: 'Deudas', sub: 'Tarjeta de Crédito Codensa', tipo: 'debt_payment' },
  { cat: 'Deudas', sub: 'Tarjeta de Crédito Nu', tipo: 'debt_payment' },
  { cat: 'Deudas', sub: 'Tarjeta de Crédito', tipo: 'debt_payment' },
  { cat: 'Deudas', sub: 'Préstamo', tipo: 'debt_payment' },
  { cat: 'Deudas', sub: 'Préstamo Ángela', tipo: 'debt_payment' },
  { cat: 'Deudas', sub: 'Abono a capital', tipo: 'debt_payment' },
  { cat: 'Salario', sub: 'Nómina', tipo: 'income' },
  { cat: 'Salario', sub: 'Prima', tipo: 'income' },
  { cat: 'Salario', sub: 'Vacaciones', tipo: 'income' },
  { cat: 'Salario', sub: 'Cesantías', tipo: 'income' },
  { cat: 'Salario', sub: 'Bonificaciones', tipo: 'income' },
  { cat: 'Salario', sub: 'Comisiones', tipo: 'income' },
  { cat: 'Salario', sub: 'Auxilio de transporte', tipo: 'income' },
  { cat: 'Salario', sub: 'Viáticos', tipo: 'income' },
  { cat: 'Otros Ingresos', sub: 'Cliente Blue Box', tipo: 'income' },
  { cat: 'Otros Ingresos', sub: 'Cliente Classic Metals', tipo: 'income' },
  { cat: 'Otros Ingresos', sub: 'Cliente Closer Luna', tipo: 'income' },
  { cat: 'Otros Ingresos', sub: 'Cliente Miami Viral', tipo: 'income' },
  { cat: 'Otros Ingresos', sub: 'Cliente Yenny', tipo: 'income' },
  { cat: 'Otros Ingresos', sub: 'Cliente Soluntec', tipo: 'income' },
  { cat: 'Otros Ingresos', sub: 'Freelance', tipo: 'income' },
  { cat: 'Otros Ingresos', sub: 'Ingresos Extra', tipo: 'income' },
  { cat: 'Otros Ingresos', sub: 'Reembolsos', tipo: 'income' },
  { cat: 'Rentas y Alquileres', sub: 'Renta', tipo: 'income' },
  { cat: 'Ingresos por Intereses', sub: 'Intereses', tipo: 'income' },
  { cat: 'Dividendos', sub: 'Dividendos', tipo: 'income' },
];

const CLIENT_ALIASES = [
  '"Cliente Yenny" = Yenny-Bio = agencia Bio. Si menciona Yenny, Bio, Bioshop → Cliente Yenny.',
  '"Cliente Blue Box" = agencia Blue Box (proyectos Constructora Jiménez). Si menciona Blue Box, Bluebox, José, Constructora Jiménez, Rodadero, Porto Sabbia, Coralina, Venecias, Marena, Salguero → Cliente Blue Box.',
  '"Cliente Classic Metals" = ingresos USD vía Mercury (cuenta=mercury). Si menciona Classic Metals, Arx, Bridge → Cliente Classic Metals.',
  '"Cliente Soluntec" = Soluntec SAS. Si menciona Soluntec, migrantes → Cliente Soluntec.',
  '"Cliente Miami Viral" = agencia Miami Viral.',
  '"Cliente Closer Luna" = Closer Luna.',
];

// ============================================================
// Helpers HTTP
// ============================================================
async function supabaseGet(path) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) throw new Error(`supabase ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

function validOptionsForTipo(tipo) {
  return TAXONOMY.filter(t => t.tipo === tipo).map(t => `${t.cat}/${t.sub}`);
}

// ============================================================
// History-aware similarity (Jaccard sobre tokens normalizados)
// ============================================================
function normalizeDesc(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\d+/g, ' ')   // ignorar números (montos sueltos en descripciones)
    .replace(/\s+/g, ' ')
    .trim();
}

// Stopwords expandidos: incluyen nombres de cuenta y palabras genéricas del bot,
// que estaban polucionando los matches de Jaccard ("dolar app" matcheando todo).
const STOPWORDS = new Set([
  // Articulos / preposiciones / conectores
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
  'de', 'del', 'al', 'a', 'en', 'por', 'para', 'con', 'sin', 'y', 'o',
  'que', 'es', 'son', 'fue', 'fui', 'mi', 'tu', 'su', 'sus',
  // Verbos genéricos del bot / descripción
  'pago', 'gasto', 'gaste', 'compra', 'compras', 'ingreso', 'ingresos',
  'transferencia', 'expense', 'income',
  // Nombres de cuenta (estructural, no semántico)
  'bancolombia', 'davivienda', 'nu', 'nequi', 'mercury', 'efectivo',
  'dolar', 'dolarrap', 'app', 'colombia', 'credito', 'debito',
  'tarjeta', 'cuenta',
  // Conectores comunes
  'hoy', 'ayer', 'mil', 'pesos', 'sin', 'mas',
]);

function tokenize(s) {
  return new Set(
    normalizeDesc(s)
      .split(' ')
      .filter(w => w.length >= 3 && !STOPWORDS.has(w))
  );
}

/** ¿Hay al menos un token "específico" (largo) en común? Filtra matches débiles. */
function hasSpecificOverlap(a, b, minLen = SPECIFIC_TOKEN_MIN_LEN) {
  for (const w of a) {
    if (w.length >= minLen && b.has(w)) return true;
  }
  return false;
}

function jaccard(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let intersect = 0;
  for (const w of a) if (b.has(w)) intersect++;
  const union = a.size + b.size - intersect;
  return union > 0 ? intersect / union : 0;
}

/**
 * Encuentra rows similares en el historial, mismo tipo, excluyendo la fila target.
 * Devuelve top-K ordenados por Jaccard descendente.
 */
function findSimilar(target, history, topK = HISTORY_TOP_K) {
  const targetTokens = tokenize(target.descripcion);
  if (targetTokens.size === 0) return [];

  const scored = [];
  for (const h of history) {
    if (h.id === target.id) continue;
    if (h.tipo_transaccion !== target.tipo_transaccion) continue;
    // Requerir al menos un token específico (≥5 chars) en común — filtra
    // falsos positivos donde solo coinciden tokens cortos genéricos
    if (!hasSpecificOverlap(targetTokens, h._tokens)) continue;
    const score = jaccard(targetTokens, h._tokens);
    if (score >= HISTORY_MIN_JACCARD) {
      scored.push({ ...h, score });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

/**
 * Si hay consenso fuerte en el top-K (≥ HISTORY_CONSENSUS_MIN_COUNT filas con
 * la misma cat/sub), usar esa clasificación SIN llamar al LLM.
 */
function classifyByHistoryConsensus(similars) {
  if (similars.length === 0) return null;

  const tally = new Map();
  for (const s of similars) {
    const key = `${s.categoria}/${s.subcategoria}`;
    const cur = tally.get(key) ?? { count: 0, totalScore: 0, examples: [] };
    cur.count++;
    cur.totalScore += s.score;
    cur.examples.push(s.descripcion);
    tally.set(key, cur);
  }

  const sorted = [...tally].sort((a, b) => b[1].totalScore - a[1].totalScore);
  const [pick, stats] = sorted[0];
  const ratio = stats.count / similars.length;

  if (stats.count >= HISTORY_CONSENSUS_MIN_COUNT && ratio >= HISTORY_CONSENSUS_MIN_RATIO) {
    return {
      pick,
      confianza: Math.min(0.95, 0.65 + ratio * 0.3),
      razon: `Histórico: ${stats.count}/${similars.length} similares en "${pick}"`,
      via: 'history',
    };
  }
  return null;
}

// ============================================================
// LLM con few-shot (RAG-lite)
// ============================================================
async function classifyByLLM(row, similars) {
  const tipo = row.tipo_transaccion;
  const options = validOptionsForTipo(tipo);
  if (options.length === 0) return { pick: 'NO_MATCH', confianza: 0, razon: 'tipo desconocido', via: 'llm' };

  const fewShot = similars.slice(0, 5).map(s =>
    `- "${s.descripcion}" (cuenta: ${s.cuenta ?? '-'}) → ${s.categoria}/${s.subcategoria}`
  ).join('\n');

  const system = [
    'Sos un clasificador financiero conservador.',
    'Te dan filas pasadas del MISMO usuario ya correctamente clasificadas; usalas como guía de su preferencia (esa es la fuente de verdad).',
    'Elegí la mejor (categoria, subcategoria) de la lista cerrada.',
    'NUNCA inventes categorías que no estén en la lista. Si no encontrás clara, devolvé "NO_MATCH".',
    'Si las pasadas similares apuntan a una clasificación, RESPETÁLA aunque tu instinto diga otra cosa.',
    'Respondé SOLO en JSON: {"pick": "Categoria/Subcategoria", "confianza": 0.0-1.0, "razon": "<corta>"}',
  ].join(' ');

  const user = [
    `Tipo: ${tipo}`,
    `Descripción: "${row.descripcion ?? ''}"`,
    `Cuenta: ${row.cuenta ?? '-'}`,
    `Monto: ${row.Valor} ${row.moneda ?? 'COP'}`,
    `Fecha: ${row.fecha}`,
    '',
    fewShot ? 'FILAS PASADAS SIMILARES (tu fuente de verdad):' : 'No hay filas similares pasadas — usá la taxonomía y los aliases.',
    fewShot,
    '',
    'CONTEXTO de aliases:',
    ...CLIENT_ALIASES.map(a => '- ' + a),
    '',
    `Opciones válidas (${options.length}):`,
    options.join(' | '),
  ].filter(Boolean).join('\n');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.1,
      max_tokens: 120,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    return { pick: 'ERROR', confianza: 0, razon: `openai ${res.status}`, via: 'llm' };
  }

  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content ?? '{}';
  try {
    const parsed = JSON.parse(raw);
    return { ...parsed, via: similars.length > 0 ? 'llm-fewshot' : 'llm-zeroshot' };
  } catch {
    return { pick: 'PARSE_ERROR', confianza: 0, razon: raw.slice(0, 100), via: 'llm' };
  }
}

// ============================================================
// Pipeline: history-first, LLM fallback
// ============================================================
async function classifyOne(row, history) {
  const similars = findSimilar(row, history);
  const fromHistory = classifyByHistoryConsensus(similars);
  if (fromHistory) return fromHistory;
  return classifyByLLM(row, similars);
}

// ============================================================
// Main
// ============================================================
const MODE = process.env.RECLASSIFY_MODE ?? 'huerfanos';

function buildFilterPath() {
  const select = 'id,fecha,descripcion,Valor,moneda,cuenta,categoria,subcategoria,tipo_transaccion,user_id,fuente';
  if (MODE === 'all-income') return `${TABLE}?tipo_transaccion=eq.income&order=fecha.desc&limit=${MAX_ROWS}&select=${select}`;
  if (MODE === 'all-expense') return `${TABLE}?tipo_transaccion=eq.expense&order=fecha.desc&limit=${MAX_ROWS}&select=${select}`;
  const HUERF = [
    `and(categoria.eq.Otros%20Ingresos,subcategoria.eq.Otros)`,
    `and(categoria.eq.Gastos%20Personales,subcategoria.eq.Otros)`,
  ];
  return `${TABLE}?or=(${HUERF.join(',')})&order=fecha.desc&limit=${MAX_ROWS}&select=${select}`;
}

async function main() {
  const t0 = Date.now();
  process.stderr.write(`[${new Date().toISOString()}] mode=${MODE}\n`);

  // Pull candidatos
  const candidates = await supabaseGet(buildFilterPath());
  process.stderr.write(`candidates: ${candidates.length}\n`);

  // Pull historial completo (todos los rows del user, sin tope) para usar como ground truth
  const HISTORY_LIMIT = 2000;
  const historyPath = `${TABLE}?order=fecha.desc&limit=${HISTORY_LIMIT}&select=id,descripcion,Valor,cuenta,categoria,subcategoria,tipo_transaccion`;
  const history = await supabaseGet(historyPath);
  // Pre-tokenizar para búsqueda rápida
  for (const h of history) h._tokens = tokenize(h.descripcion);
  process.stderr.write(`history: ${history.length}\n`);

  console.log('# Borrador de reclasificación · ' + new Date().toISOString().slice(0, 10));
  console.log('');
  console.log(`Modo: **${MODE}** · Candidatos: **${candidates.length}** · Historial: **${history.length}**`);
  console.log('');
  console.log(`History-aware: si ≥${HISTORY_CONSENSUS_MIN_COUNT}/${HISTORY_TOP_K} filas similares (Jaccard ≥ ${HISTORY_MIN_JACCARD}) coinciden, usamos esa clasificación SIN LLM.`);
  console.log('Modelo fallback: gpt-4o-mini · few-shot con similares · temp 0.1');
  console.log('');
  console.log('---');
  console.log('');

  const byTipo = new Map();
  for (const r of candidates) {
    if (!byTipo.has(r.tipo_transaccion)) byTipo.set(r.tipo_transaccion, []);
    byTipo.get(r.tipo_transaccion).push(r);
  }

  let stats = { kept: 0, changed: 0, no_match: 0, error: 0, low_conf: 0, via_history: 0, via_fewshot: 0, via_zeroshot: 0 };

  for (const [tipo, rows] of byTipo) {
    console.log(`## ${tipo} (${rows.length})`);
    console.log('');
    console.log('| ID | Fecha | Descripción | Cuenta | Monto | Actual | Propuesto | Conf. | Vía | Razón |');
    console.log('|---|---|---|---|---|---|---|---|---|---|');
    for (const r of rows) {
      let pick;
      try {
        pick = await classifyOne(r, history);
      } catch (e) {
        pick = { pick: 'ERROR', confianza: 0, razon: String(e).slice(0, 80), via: 'llm' };
      }
      const propuesta = pick?.pick ?? 'NO_MATCH';
      const conf = typeof pick?.confianza === 'number' ? pick.confianza : 0;
      const razon = (pick?.razon ?? '').replace(/\|/g, '/').slice(0, 100);
      const via = pick?.via ?? '?';
      const actual = `${r.categoria}/${r.subcategoria}`;
      const desc = (r.descripcion ?? '').replace(/\|/g, '/').slice(0, 50);

      if (propuesta === 'NO_MATCH') stats.no_match++;
      else if (propuesta === 'ERROR' || propuesta === 'PARSE_ERROR') stats.error++;
      else if (propuesta === actual) stats.kept++;
      else if (conf < 0.6) stats.low_conf++;
      else stats.changed++;

      if (via === 'history') stats.via_history++;
      else if (via === 'llm-fewshot') stats.via_fewshot++;
      else if (via === 'llm-zeroshot') stats.via_zeroshot++;

      console.log(`| ${r.id} | ${r.fecha?.slice(0, 10) ?? '?'} | ${desc} | ${r.cuenta ?? '-'} | ${r.Valor} | ${actual} | **${propuesta}** | ${conf.toFixed(2)} | ${via} | ${razon} |`);
    }
    console.log('');
  }

  console.log('---');
  console.log('');
  console.log('## Resumen');
  console.log('');
  console.log(`- 🔄 Cambiarían (alta conf ≥ 0.6): **${stats.changed}**`);
  console.log(`- ⚠️ Cambiarían (baja conf < 0.6): **${stats.low_conf}**`);
  console.log(`- ✓ Igual al actual: **${stats.kept}**`);
  console.log(`- ❌ Sin match en taxonomía: **${stats.no_match}**`);
  console.log(`- 💥 Errores: **${stats.error}**`);
  console.log('');
  console.log(`### Distribución de fuente`);
  console.log(`- 🟢 history-only (sin LLM, gratis): **${stats.via_history}**`);
  console.log(`- 🔵 LLM con few-shot: **${stats.via_fewshot}**`);
  console.log(`- 🟡 LLM zero-shot (sin similares): **${stats.via_zeroshot}**`);
  console.log('');
  console.log(`Tiempo: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main().catch(e => {
  console.error(e);
  process.exit(2);
});
