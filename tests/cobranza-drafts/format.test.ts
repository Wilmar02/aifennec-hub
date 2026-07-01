import { describe, it, expect } from 'vitest';
import { formatMoney, formatDate, MESES } from '../../src/modules/cobranza-drafts/format.js';

describe('formatMoney', () => {
  it('formatea COP con separador de miles y moneda', () => {
    expect(formatMoney(1657000, 'COP')).toBe('$1.657.000 COP');
  });
  it('redondea decimales', () => {
    expect(formatMoney(330000.4, 'COP')).toBe('$330.000 COP');
  });
});

describe('formatDate', () => {
  it('formatea en español largo', () => {
    expect(formatDate(new Date(2026, 6, 1))).toBe('1 de julio de 2026');
  });
});

describe('MESES', () => {
  it('tiene 12 meses y empieza en enero', () => {
    expect(MESES).toHaveLength(12);
    expect(MESES[6]).toBe('julio');
  });
});
