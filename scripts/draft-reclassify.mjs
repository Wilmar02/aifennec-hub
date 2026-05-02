// ============================================================
// draft-reclassify.mjs — DRY-RUN. NO TOCA NADA.
// ============================================================
// Saca de Supabase los rows que cayeron en catch-all
// (Otros Ingresos/Otros + Gastos Personales/Otros) y le pregunta a
// gpt-4o-mini si los reclasificaría usando la descripción + cuenta + monto.
//
// Salida: markdown report con cada propuesta + razonamiento.
// El usuario revisa, decide cuáles aplicar, y entonces (en otro paso) se
// escribe el script de UPDATE.
//
// Uso:
//   node draft-reclassify.mjs > /tmp/draft.md
//
// Env requerido:
//   SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENAI_API_KEY
// ============================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const TABLE = encodeURIComponent('base de ingresos');
const MAX_ROWS = 300; // tope defensivo

if (!SUPABASE_URL || !SUPABASE_KEY || !OPENAI_KEY) {
  console.error('Faltan env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENAI_API_KEY');
  process.exit(1);
}

// ============================================================
// Taxonomía válida — extraída de categorias.ts
// ============================================================
const TAXONOMY = [
  // VIVIENDA
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
  // ALIMENTO
  { cat: 'Alimento', sub: 'Mercado', tipo: 'expense' },
  { cat: 'Alimento', sub: 'Restaurante', tipo: 'expense' },
  // TRANSPORTE
  { cat: 'Transporte', sub: 'Gasolina', tipo: 'expense' },
  { cat: 'Transporte', sub: 'Cuotas auto', tipo: 'expense' },
  { cat: 'Transporte', sub: 'Reparaciones', tipo: 'expense' },
  { cat: 'Transporte', sub: 'Seguros', tipo: 'expense' },
  { cat: 'Transporte', sub: 'Transporte público', tipo: 'expense' },
  { cat: 'Transporte', sub: 'Bicicleta', tipo: 'expense' },
  { cat: 'Transporte', sub: 'Licencia / Trámites', tipo: 'expense' },
  { cat: 'Transporte', sub: 'Cuota de manejo tarjeta', tipo: 'expense' },
  // SEGUROS
  { cat: 'Seguros', sub: 'Medico', tipo: 'expense' },
  { cat: 'Seguros', sub: 'Ortodoncia', tipo: 'expense' },
  { cat: 'Seguros', sub: 'Seguridad social', tipo: 'expense' },
  // EDUCACION
  { cat: 'Educación', sub: 'Universidad', tipo: 'expense' },
  { cat: 'Educación', sub: 'Cursos / Ingles', tipo: 'expense' },
  { cat: 'Educación', sub: 'Libros', tipo: 'expense' },
  { cat: 'Educación', sub: 'Materiales', tipo: 'expense' },
  { cat: 'Educación', sub: 'Gimnasio', tipo: 'expense' },
  { cat: 'Educación', sub: 'Matrícula Taekwondo', tipo: 'expense' },
  // VIAJES
  { cat: 'Viajes y Paseos', sub: 'Hospedaje', tipo: 'expense' },
  { cat: 'Viajes y Paseos', sub: 'Transporte', tipo: 'expense' },
  { cat: 'Viajes y Paseos', sub: 'Viajes', tipo: 'expense' },
  // GASTOS PERSONALES
  { cat: 'Gastos Personales', sub: 'Vestimenta', tipo: 'expense' },
  { cat: 'Gastos Personales', sub: 'Calzado', tipo: 'expense' },
  { cat: 'Gastos Personales', sub: 'Celular', tipo: 'expense' },
  { cat: 'Gastos Personales', sub: 'Salidas a restaurante', tipo: 'expense' },
  { cat: 'Gastos Personales', sub: 'Barbería / Estética', tipo: 'expense' },
  { cat: 'Gastos Personales', sub: 'Gastos Personales/cerveza', tipo: 'expense' },
  { cat: 'Gastos Personales', sub: 'Materiales', tipo: 'expense' },
  // AHORRO
  { cat: 'Ahorro', sub: 'Ahorro general', tipo: 'savings' },
  { cat: 'Ahorro', sub: 'Cajita Nu', tipo: 'savings' },
  { cat: 'Ahorro', sub: 'Hipoteca', tipo: 'savings' },
  { cat: 'Ahorro', sub: 'Inversión Lote', tipo: 'savings' },
  { cat: 'Ahorro', sub: 'Colchón financiero', tipo: 'savings' },
  { cat: 'Ahorro', sub: 'Viajes y disfrute', tipo: 'savings' },
  // INVERSIONES
  { cat: 'Inversiones', sub: 'Acciones', tipo: 'investment' },
  { cat: 'Inversiones', sub: 'Bonos', tipo: 'investment' },
  { cat: 'Inversiones', sub: 'Depósitos a Plazo Fijo', tipo: 'investment' },
  { cat: 'Inversiones', sub: 'Herramientas empresa', tipo: 'investment' },
  { cat: 'Inversiones', sub: 'Inversion Lote', tipo: 'investment' },
  { cat: 'Inversiones', sub: 'Pagos de Intereses', tipo: 'investment' },
  { cat: 'Inversiones', sub: 'Vehículo', tipo: 'investment' },
  // DEUDAS
  { cat: 'Deudas', sub: 'Crédito Vehículo Davivienda', tipo: 'debt_payment' },
  { cat: 'Deudas', sub: 'Crédito Hipotecario Davivienda', tipo: 'debt_payment' },
  { cat: 'Deudas', sub: 'Tarjeta de Crédito Codensa', tipo: 'debt_payment' },
  { cat: 'Deudas', sub: 'Tarjeta de Crédito Nu', tipo: 'debt_payment' },
  { cat: 'Deudas', sub: 'Tarjeta de Crédito', tipo: 'debt_payment' },
  { cat: 'Deudas', sub: 'Préstamo', tipo: 'debt_payment' },
  { cat: 'Deudas', sub: 'Préstamo Ángela', tipo: 'debt_payment' },
  { cat: 'Deudas', sub: 'Abono a capital', tipo: 'debt_payment' },
  // INGRESOS — SALARIO
  { cat: 'Salario', sub: 'Nómina', tipo: 'income' },
  { cat: 'Salario', sub: 'Prima', tipo: 'income' },
  { cat: 'Salario', sub: 'Vacaciones', tipo: 'income' },
  { cat: 'Salario', sub: 'Cesantías', tipo: 'income' },
  { cat: 'Salario', sub: 'Bonificaciones', tipo: 'income' },
  { cat: 'Salario', sub: 'Comisiones', tipo: 'income' },
  { cat: 'Salario', sub: 'Auxilio de transporte', tipo: 'income' },
  { cat: 'Salario', sub: 'Viáticos', tipo: 'income' },
  // INGRESOS — OTROS
  { cat: 'Otros Ingresos', sub: 'Cliente Blue Box', tipo: 'income' },
  { cat: 'Otros Ingresos', sub: 'Cliente Classic Metals', tipo: 'income' },
  { cat: 'Otros Ingresos', sub: 'Cliente Closer Luna', tipo: 'income' },
  { cat: 'Otros Ingresos', sub: 'Cliente Miami Viral', tipo: 'income' },
  { cat: 'Otros Ingresos', sub: 'Cliente Yenny', tipo: 'income' },
  { cat: 'Otros Ingresos', sub: 'Freelance', tipo: 'income' },
  { cat: 'Otros Ingresos', sub: 'Ingresos Extra', tipo: 'income' },
  { cat: 'Otros Ingresos', sub: 'Reembolsos', tipo: 'income' },
  // INGRESOS — RENTAS / INTERESES / DIVIDENDOS
  { cat: 'Rentas y Alquileres', sub: 'Renta', tipo: 'income' },
  { cat: 'Ingresos por Intereses', sub: 'Intereses', tipo: 'income' },
  { cat: 'Dividendos', sub: 'Dividendos', tipo: 'income' },
];

// ============================================================
// Helpers
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

// Aliases / contexto que la IA necesita para no confundir clientes diferentes
const CLIENT_ALIASES = [
  '"Cliente Yenny" = Yenny-Bio = agencia Bio. Si la descripción menciona Yenny, Bio, Bioshop, o nombres asociados a esa agencia → Cliente Yenny.',
  '"Cliente Blue Box" = agencia Blue Box, maneja proyectos de Constructora Jiménez. Si menciona Blue Box, Bluebox, Constructora Jiménez, o uno de los 9 proyectos (Rodadero, Porto Sabbia, Coralina, Venecias, Marena, Salguero) → Cliente Blue Box.',
  '"Cliente Classic Metals" = Classic Metals Suppliers, ingresos USD vía Mercury (cuenta=mercury). Si la cuenta es mercury o menciona Classic Metals/Arx → Cliente Classic Metals.',
  '"Cliente Miami Viral" = agencia Miami Viral.',
  '"Cliente Closer Luna" = Closer Luna (cierre de ventas).',
  '"Salario/Nómina" = quincenas de empleo formal. Si menciona "1era quincena", "2da quincena", "quincena", "salario", "nómina" → Salario.',
  '"Ingresos por Intereses/Intereses" = pagos de intereses bancarios, USDC yield, etc.',
  '"Rentas y Alquileres/Renta" = ingresos por arriendos.',
  '"Otros Ingresos/Freelance" = trabajos puntuales sin cliente recurrente identificable.',
  '"Otros Ingresos/Reembolsos" = devoluciones, reembolsos, reverso de cargos.',
  '"Otros Ingresos/Ingresos Extra" = TODO lo demás (regalos, premios, bonos no laborales, abonos sueltos sin cliente claro).',
];

async function classifyOne(row) {
  const tipo = row.tipo_transaccion;
  const options = validOptionsForTipo(tipo);
  if (options.length === 0) return null;

  const system = [
    'Sos un clasificador financiero conservador. Recibís una transacción colombiana y elegís la mejor (categoria, subcategoria) de una lista cerrada.',
    'NUNCA inventes una categoría que no esté en la lista. Si no encontrás una clara, devolvé "NO_MATCH".',
    'Si la descripción es ambigua (poca info), bajá la confianza por debajo de 0.6.',
    'Respondé SOLO en JSON válido: {"pick": "Categoria/Subcategoria", "confianza": 0.0-1.0, "razon": "<corta>"}',
  ].join(' ');

  const user = [
    `Tipo: ${tipo}`,
    `Descripción: "${row.descripcion ?? ''}"`,
    `Cuenta: ${row.cuenta ?? '-'}`,
    `Monto: ${row.Valor} ${row.moneda ?? 'COP'}`,
    `Fecha: ${row.fecha}`,
    '',
    'CONTEXTO de aliases (importante):',
    ...CLIENT_ALIASES.map(a => '- ' + a),
    '',
    `Opciones válidas (${options.length}):`,
    options.join(' | '),
  ].join('\n');

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
    return { pick: 'ERROR', confianza: 0, razon: `openai ${res.status}` };
  }
  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content ?? '{}';
  try {
    const parsed = JSON.parse(raw);
    return parsed;
  } catch {
    return { pick: 'PARSE_ERROR', confianza: 0, razon: raw.slice(0, 100) };
  }
}

// ============================================================
// Main
// ============================================================
const MODE = process.env.RECLASSIFY_MODE ?? 'huerfanos'; // 'huerfanos' | 'all-income' | 'all-expense'

function buildFilterPath() {
  const baseSelect = 'id,fecha,descripcion,Valor,moneda,cuenta,categoria,subcategoria,tipo_transaccion,user_id,fuente';
  if (MODE === 'all-income') {
    return `${TABLE}?tipo_transaccion=eq.income&order=fecha.desc&limit=${MAX_ROWS}&select=${baseSelect}`;
  }
  if (MODE === 'all-expense') {
    return `${TABLE}?tipo_transaccion=eq.expense&order=fecha.desc&limit=${MAX_ROWS}&select=${baseSelect}`;
  }
  // Default: huérfanos en catch-all
  const HUERFANO_FILTERS = [
    `and(categoria.eq.Otros%20Ingresos,subcategoria.eq.Otros)`,
    `and(categoria.eq.Gastos%20Personales,subcategoria.eq.Otros)`,
  ];
  return `${TABLE}?or=(${HUERFANO_FILTERS.join(',')})&order=fecha.desc&limit=${MAX_ROWS}&select=${baseSelect}`;
}

async function main() {
  const startedAt = new Date().toISOString();
  process.stderr.write(`[${startedAt}] draft-reclassify: mode=${MODE}\n`);

  const path = buildFilterPath();
  const rows = await supabaseGet(path);
  process.stderr.write(`pulled ${rows.length} candidate rows\n`);

  // Markdown header
  console.log('# Borrador de reclasificación · ' + startedAt.slice(0, 10));
  console.log('');
  console.log(`Modo: **${MODE}** · Filas analizadas: **${rows.length}**`);
  console.log('');
  console.log('Modelo: gpt-4o-mini · temp 0.1 · JSON forzado · contexto de aliases incluido');
  console.log('');
  console.log('---');
  console.log('');

  // Agrupar por tipo_transaccion para legibilidad
  const byTipo = new Map();
  for (const r of rows) {
    const k = r.tipo_transaccion;
    if (!byTipo.has(k)) byTipo.set(k, []);
    byTipo.get(k).push(r);
  }

  let stats = { kept: 0, changed: 0, no_match: 0, error: 0, low_conf: 0 };

  for (const [tipo, rowsOfTipo] of byTipo) {
    console.log(`## ${tipo} (${rowsOfTipo.length})`);
    console.log('');
    console.log('| ID | Fecha | Descripción | Cuenta | Monto | Actual | Propuesto | Conf. | Razón |');
    console.log('|---|---|---|---|---|---|---|---|---|');
    for (const r of rowsOfTipo) {
      let pick;
      try {
        pick = await classifyOne(r);
      } catch (e) {
        pick = { pick: 'ERROR', confianza: 0, razon: String(e).slice(0, 80) };
      }
      const propuesta = pick?.pick ?? 'NO_MATCH';
      const conf = typeof pick?.confianza === 'number' ? pick.confianza : 0;
      const razon = (pick?.razon ?? '').replace(/\|/g, '/').slice(0, 100);
      const actual = `${r.categoria}/${r.subcategoria}`;
      const desc = (r.descripcion ?? '').replace(/\|/g, '/').slice(0, 50);

      // Stats
      if (propuesta === 'NO_MATCH') stats.no_match++;
      else if (propuesta === 'ERROR' || propuesta === 'PARSE_ERROR') stats.error++;
      else if (propuesta === actual) stats.kept++;
      else if (conf < 0.6) stats.low_conf++;
      else stats.changed++;

      console.log(`| ${r.id} | ${r.fecha?.slice(0, 10) ?? '?'} | ${desc} | ${r.cuenta ?? '-'} | ${r.Valor} | ${actual} | **${propuesta}** | ${conf.toFixed(2)} | ${razon} |`);
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
}

main().catch(e => {
  console.error(e);
  process.exit(2);
});
