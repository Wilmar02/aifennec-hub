import { CUSTOM_MAPPINGS, FALLBACK_BY_TYPE } from './categorias.js';
import type { ParsedTransaction, TransactionType } from './types.js';

const COMBINING_DIACRITICS = /[̀-ͯ]/g;

/**
 * Hard cap del input para evitar catastrophic backtracking en regex con texto enorme.
 * Mensajes financieros legítimos no superan 500 chars.
 */
const MAX_INPUT_LEN = 1000;

/**
 * Detecta keywords que dan contexto monetario al patrón "M" (millones).
 * Sin esto, "BMW M5" o "placa AB5M" disparaban falsos positivos de $5M.
 */
const MONETARY_CONTEXT = /\$|cop|usd|pesos?|d[oó]lar(es)?|mil(?:l[oó]n(es)?)?|abono|pago|cuota|salario|sueldo|ingreso|gasto|compra|venta/i;

export function extractAmount(text: string): number | null {
  // A-1: cortar input gigante antes de regex
  const truncated = text.length > MAX_INPUT_LEN ? text.slice(0, MAX_INPUT_LEN) : text;
  const clean = truncated.toLowerCase().replace(/\$/g, '').trim();

  const kMatch = clean.match(/(\d+(?:[.,]\d+)?)\s*k\b/i);
  if (kMatch) return parseFloat(kMatch[1]!.replace(',', '.')) * 1000;

  const milMatch = clean.match(/(\d+(?:[.,]\d+)?)\s*mil\b/i);
  if (milMatch) return parseFloat(milMatch[1]!.replace(',', '.')) * 1000;

  // CR-1: el patrón "M" es ambiguo (modelos de auto, placas) — exigir contexto monetario
  const mMatch = clean.match(/(\d+(?:[.,]\d+)?)\s*m\b/i);
  if (mMatch && MONETARY_CONTEXT.test(text)) {
    return parseFloat(mMatch[1]!.replace(',', '.')) * 1000000;
  }

  const bigMatch = clean.match(/(\d{1,3}(?:[.,]\d{3})+)/);
  if (bigMatch) return parseInt(bigMatch[1]!.replace(/[.,]/g, ''), 10);

  const plainMatch = clean.match(/(\d{4,})/);
  if (plainMatch) return parseInt(plainMatch[1]!, 10);

  const smallMatch = clean.match(/(\d{2,3})/);
  if (smallMatch) return parseInt(smallMatch[1]!, 10);

  return null;
}

/**
 * Catálogo de cuentas. Cada entrada tiene patrones de match Y un flag tipo (debit/credit).
 * Si la cuenta tiene ambos tipos (Bancolombia tiene débito y crédito), usar la versión
 * más específica como key (`bancolombia debito` / `bancolombia credito`) y dejar la
 * genérica `bancolombia` como fallback ambiguo (parser pregunta tipo).
 */
const ACCOUNT_PATTERNS: Record<string, { patterns: string[]; tipo: 'debito' | 'credito' | 'efectivo' | 'ambiguo' }> = {
  'bancolombia debito': { patterns: ['bancolombia debito', 'bcol debito', 'cuenta ahorros bancolombia'], tipo: 'debito' },
  'bancolombia credito': { patterns: ['bancolombia credito', 'tc bancolombia', 'tarjeta bancolombia'], tipo: 'credito' },
  bancolombia: { patterns: ['bancolombia', 'bancolom'], tipo: 'ambiguo' },
  'nu colombia': { patterns: ['nu ', 'nu colombia', 'nubank', 'nucolombia'], tipo: 'credito' },
  'davivienda credito': { patterns: ['davivienda credito', 'credito davivienda', 'tc davivienda'], tipo: 'credito' },
  'davivienda debito': { patterns: ['davivienda debito', 'cuenta ahorros davivienda'], tipo: 'debito' },
  davivienda: { patterns: ['davivienda'], tipo: 'ambiguo' },
  'dolar app': { patterns: ['dolar app', 'dolarapp', 'dolares', 'dollar app'], tipo: 'debito' },
  mercury: { patterns: ['mercury', 'mercury bank', 'mercury usd'], tipo: 'debito' },
  efectivo: { patterns: ['efectivo', 'cash'], tipo: 'efectivo' },
};

/**
 * Cuentas que operan en USD por default. Si la cuenta detectada/elegida está acá,
 * el bot asume USD a menos que el texto indique otra moneda.
 */
const USD_ACCOUNTS = new Set(['mercury', 'dolar app']);

export function isUsdAccount(account: string): boolean {
  return USD_ACCOUNTS.has(account);
}

export interface AccountResult {
  account: string;
  tipo: 'debito' | 'credito' | 'efectivo' | 'ambiguo' | 'desconocido';
}

/** Detecta cuenta en el texto. Si no encuentra match, retorna 'desconocido' (no efectivo por default). */
export function extractAccount(text: string): AccountResult {
  const lower = text.toLowerCase().normalize('NFD').replace(COMBINING_DIACRITICS, '');
  // Probar primero las versiones más específicas (multi-palabra)
  const sortedEntries = Object.entries(ACCOUNT_PATTERNS).sort((a, b) => b[0].length - a[0].length);
  for (const [account, { patterns, tipo }] of sortedEntries) {
    if (patterns.some((p) => lower.includes(p))) return { account, tipo };
  }
  return { account: 'desconocido', tipo: 'desconocido' };
}

const INCOME_KEYWORDS = [
  'ingreso', 'recibi', 'recibi', 'me pagaron', 'salario', 'sueldo', 'honorarios',
  'freelance', 'dividendo', 'venta', 'cobre', 'transferencia recibida',
  'me consignaron', 'pago recibido', 'ganancia', 'rendimiento', 'intereses',
  'arriendo cobrado', 'prima',
];
const SAVINGS_KEYWORDS = ['ahorro', 'ahorre', 'fondo emergencia', 'reserva', 'pension voluntaria', 'afc'];
const INVESTMENT_KEYWORDS = [
  'inversion', 'inverti', 'etf', 'sp500', 'acciones', 'cdt',
  'fiducia', 'crypto', 'bitcoin', 'btc', 'finca raiz', 'lote', 'crowdfunding',
];
const DEBT_KEYWORDS = [
  'cuota hipoteca', 'pago hipoteca', 'cuota vehiculo', 'pago tc', 'tarjeta credito',
  'libranza', 'icetex', 'abono deuda', 'cuota credito', 'pago prestamo',
];

export function detectTransactionType(text: string): { type: TransactionType; confidence: number } {
  const lower = text.toLowerCase().normalize('NFD').replace(COMBINING_DIACRITICS, '');
  if (INCOME_KEYWORDS.some((k) => lower.includes(k))) return { type: 'income', confidence: 0.85 };
  if (SAVINGS_KEYWORDS.some((k) => lower.includes(k))) return { type: 'savings', confidence: 0.85 };
  if (INVESTMENT_KEYWORDS.some((k) => lower.includes(k))) return { type: 'investment', confidence: 0.85 };
  if (DEBT_KEYWORDS.some((k) => lower.includes(k))) return { type: 'debt_payment', confidence: 0.85 };
  return { type: 'expense', confidence: 0.6 };
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(COMBINING_DIACRITICS, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b\d{4,}\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function categorize(
  text: string,
  typeHint?: TransactionType
): { categoria: string; subcategoria: string; tipo_transaccion: TransactionType; confidence: number } {
  const normalized = normalize(text);
  const tokens = new Set(normalized.split(/\s+/).filter(Boolean));
  const sortedMappings = Object.entries(CUSTOM_MAPPINGS).sort((a, b) => b[0].length - a[0].length);
  for (const [keyword, mapping] of sortedMappings) {
    const k = normalize(keyword);
    // Multi-word keyword: substring match (e.g. "abono a capital", "comida de perro")
    // Single-word keyword: exact token match to evitar falsos positivos
    // (p.ej. "gas" no debe matchear "gasto", "pan" no debe matchear "pantalón").
    const isMulti = k.includes(' ');
    const matched = isMulti ? normalized.includes(k) : tokens.has(k);
    if (matched) {
      return {
        categoria: mapping.cat,
        subcategoria: mapping.sub,
        tipo_transaccion: mapping.tipo,
        confidence: 0.95,
      };
    }
  }
  const fallback = FALLBACK_BY_TYPE[typeHint ?? 'expense'];
  return {
    categoria: fallback.cat,
    subcategoria: fallback.sub,
    tipo_transaccion: typeHint ?? 'expense',
    confidence: 0.3,
  };
}

export function getBogotaDate(): { fecha: string; mes: string } {
  const now = new Date();
  const fecha = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const mesNum = parseInt(fecha.split('-')[1]!, 10);
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];
  return { fecha, mes: meses[mesNum - 1]! };
}

function cleanDescription(text: string): string {
  let desc = text
    .replace(/\$?\d{1,3}(?:[.,]\d{3})+/g, '')
    .replace(/\d+\s*(?:k|mil)\b/gi, '')
    .replace(/\d{4,}/g, '')
    .replace(/\b(?:bancolombia|nequi|daviplata|nu\s*colombia|efectivo|dolar\s*app|davivienda)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!desc) desc = text.trim();
  return desc.charAt(0).toUpperCase() + desc.slice(1);
}

export function parseMessage(text: string): ParsedTransaction | null {
  const amount = extractAmount(text);
  if (!amount || amount <= 0) return null;
  const accountResult = extractAccount(text);
  const typeDetection = detectTransactionType(text);
  const cat = categorize(text, typeDetection.type);
  const { fecha, mes } = getBogotaDate();
  const confidence =
    cat.confidence >= 0.9 ? cat.confidence : Math.min(1, (typeDetection.confidence + cat.confidence) / 2);
  return {
    descripcion: cleanDescription(text),
    Valor: amount,
    tipo_transaccion: cat.tipo_transaccion,
    categoria: cat.categoria,
    subcategoria: cat.subcategoria,
    cuenta: accountResult.account,
    cuenta_tipo: accountResult.tipo,
    fecha,
    mes,
    moneda: (isUsdAccount(accountResult.account) || /\busd\b|\bdolares?\b/i.test(text)) ? 'USD' : 'COP',
    fuente: 'telegram',
    confidence,
  };
}
