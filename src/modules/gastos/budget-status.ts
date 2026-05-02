// ============================================================
// budget-status — helpers para conciencia financiera
// ============================================================
//
// Calcula el estado del presupuesto del mes en curso (categoría individual
// o global). Usado por:
// - persist.ts → confirmación con contexto al registrar un gasto
// - cron 8pm  → resumen diario
// - alerts.ts → detectar umbrales cruzados (70/85/100%)
// ============================================================

import { monthAggregateByCategoria, fetchPresupuestos } from './supabase.js';
import { TIMEZONE } from './config.js';

export type Tier = 'safe' | 'warn' | 'over';

export const TIER_EMOJI: Record<Tier, string> = {
  safe: '🟢',
  warn: '🟡',
  over: '🔴',
};

export interface CategoryStatus {
  categoria: string;
  spent: number;
  budget: number;            // 0 si no hay presupuesto seteado
  pct: number;               // 0..100+ (puede pasar 100)
  remaining: number;         // budget - spent (puede ser negativo)
  daysInMonth: number;
  daysRemaining: number;     // días que faltan hasta fin de mes (incluyendo hoy)
  dailySustainable: number;  // remaining / daysRemaining
  tier: Tier;
}

export interface MonthOverview {
  yyyymm: string;
  totalSpent: number;
  totalBudget: number;
  pct: number;
  tier: Tier;
  daysInMonth: number;
  daysRemaining: number;
  topCategory: CategoryStatus | null; // la más cargada relativamente
  categories: CategoryStatus[];        // ordenadas por pct desc
}

/** Devuelve YYYY-MM del mes actual en zona horaria del usuario. */
export function currentYearMonth(): string {
  const now = new Date();
  // Intl da partes en TZ Bogotá sin tener que hacer math de offsets
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
  });
  return fmt.format(now); // 'YYYY-MM'
}

/** Día del mes actual en TZ Bogotá. */
export function currentDayOfMonth(): number {
  return Number(
    new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, day: 'numeric' }).format(new Date())
  );
}

/** Días en el mes actual (28-31). */
export function daysInCurrentMonth(): number {
  const yyyymm = currentYearMonth();
  const [y, m] = yyyymm.split('-').map(Number) as [number, number];
  return new Date(y, m, 0).getDate();
}

/** Clasifica un porcentaje en tier (safe/warn/over). */
export function tierOf(pct: number): Tier {
  if (pct >= 100) return 'over';
  if (pct >= 70) return 'warn';
  return 'safe';
}

/**
 * Estado del presupuesto del MES ACTUAL para una categoría específica.
 * Devuelve null si la categoría no existe en aggregates Y no tiene presupuesto.
 *
 * Solo aplica para tipos `expense` y `debt_payment` (las que se controlan vs presupuesto).
 * Para income/savings/investment no tiene sentido un "% consumido".
 */
export async function getCategoryStatus(userId: string, categoria: string): Promise<CategoryStatus | null> {
  const yyyymm = currentYearMonth();
  const [aggs, budgets] = await Promise.all([
    monthAggregateByCategoria(userId, yyyymm),
    fetchPresupuestos(userId, 'COP'),
  ]);

  const agg = aggs.find(a => a.categoria === categoria && (a.tipo_transaccion === 'expense' || a.tipo_transaccion === 'debt_payment'));
  const presupuesto = budgets.find(b => b.categoria === categoria);

  if (!agg && !presupuesto) return null;

  const spent = agg?.total ?? 0;
  const budget = presupuesto?.presupuesto ?? 0;
  const pct = budget > 0 ? (spent / budget) * 100 : 0;
  const remaining = budget - spent;
  const dim = daysInCurrentMonth();
  const dRemaining = Math.max(1, dim - currentDayOfMonth() + 1);
  const dailySustainable = remaining > 0 ? remaining / dRemaining : 0;

  return {
    categoria,
    spent,
    budget,
    pct,
    remaining,
    daysInMonth: dim,
    daysRemaining: dRemaining,
    dailySustainable,
    tier: tierOf(pct),
  };
}

/**
 * Snapshot completo del mes: total gastado, total presupuestado, top categoría
 * y lista ordenada de categorías con presupuesto activo.
 */
export async function getMonthOverview(userId: string): Promise<MonthOverview> {
  const yyyymm = currentYearMonth();
  const [aggs, budgets] = await Promise.all([
    monthAggregateByCategoria(userId, yyyymm),
    fetchPresupuestos(userId, 'COP'),
  ]);

  const dim = daysInCurrentMonth();
  const dRemaining = Math.max(1, dim - currentDayOfMonth() + 1);

  // Solo gastos reales contra presupuesto (excluye income, savings, investment)
  const expenseAggs = aggs.filter(a => a.tipo_transaccion === 'expense' || a.tipo_transaccion === 'debt_payment');
  const totalSpent = expenseAggs.reduce((s, a) => s + a.total, 0);
  const totalBudget = budgets.reduce((s, b) => s + b.presupuesto, 0);
  const pct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  // Construir status por categoría con presupuesto
  const byCat = new Map<string, number>();
  for (const a of expenseAggs) byCat.set(a.categoria, a.total);

  const categories: CategoryStatus[] = budgets
    .map(b => {
      const spent = byCat.get(b.categoria) ?? 0;
      const catPct = b.presupuesto > 0 ? (spent / b.presupuesto) * 100 : 0;
      return {
        categoria: b.categoria,
        spent,
        budget: b.presupuesto,
        pct: catPct,
        remaining: b.presupuesto - spent,
        daysInMonth: dim,
        daysRemaining: dRemaining,
        dailySustainable: b.presupuesto - spent > 0 ? (b.presupuesto - spent) / dRemaining : 0,
        tier: tierOf(catPct),
      };
    })
    .sort((a, b) => b.pct - a.pct);

  return {
    yyyymm,
    totalSpent,
    totalBudget,
    pct,
    tier: tierOf(pct),
    daysInMonth: dim,
    daysRemaining: dRemaining,
    topCategory: categories[0] ?? null,
    categories,
  };
}
