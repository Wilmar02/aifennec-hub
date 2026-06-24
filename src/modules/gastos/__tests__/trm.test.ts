import { describe, it, expect, beforeEach } from 'vitest';
import { convertToCop, aggregateByTypeCop, parseTrmResponse, getTrm, TRM_FALLBACK, __resetTrmCache } from '../trm.js';

describe('convertToCop', () => {
  it('convierte USD a COP multiplicando por la TRM', () => {
    expect(convertToCop(100, 'USD', 4000)).toBe(400_000);
  });

  it('deja COP sin cambios (TRM no aplica)', () => {
    expect(convertToCop(5000, 'COP', 4000)).toBe(5000);
  });
});

describe('aggregateByTypeCop', () => {
  it('convierte USD a COP antes de sumar y agrupa por tipo', () => {
    const rows = [
      { tipo_transaccion: 'income', Valor: 100, moneda: 'USD' },   // 400.000
      { tipo_transaccion: 'income', Valor: 5000, moneda: 'COP' },  // 5.000
      { tipo_transaccion: 'expense', Valor: 50, moneda: 'USD' },   // 200.000
    ];
    const agg = aggregateByTypeCop(rows, 4000);
    const byType = Object.fromEntries(agg.map(a => [a.tipo_transaccion, a.total]));
    expect(byType.income).toBe(405_000);
    expect(byType.expense).toBe(200_000);
  });

  it('trata moneda ausente/desconocida como COP (no infla por error)', () => {
    const rows = [{ tipo_transaccion: 'expense', Valor: 1000, moneda: '' }];
    const agg = aggregateByTypeCop(rows, 4000);
    expect(agg[0].total).toBe(1000);
  });
});

describe('parseTrmResponse', () => {
  it('extrae el valor del payload del Banco de la República', () => {
    expect(parseTrmResponse([{ valor: '3950.50', vigenciadesde: '2026-06-24T00:00:00.000' }])).toBe(3950.5);
  });

  it('devuelve null si el payload está vacío o malformado', () => {
    expect(parseTrmResponse([])).toBeNull();
    expect(parseTrmResponse(null)).toBeNull();
    expect(parseTrmResponse([{ valor: 'abc' }])).toBeNull();
  });
});

describe('getTrm', () => {
  beforeEach(() => __resetTrmCache());

  it('devuelve la TRM del Banco cuando el fetch funciona', async () => {
    const trm = await getTrm(async () => [{ valor: '3900.00' }]);
    expect(trm).toBe(3900);
  });

  it('usa el fallback cuando la red falla (el balance nunca se rompe)', async () => {
    const trm = await getTrm(async () => { throw new Error('network down'); });
    expect(trm).toBe(TRM_FALLBACK);
  });
});
