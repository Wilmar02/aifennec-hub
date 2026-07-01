import { describe, it, expect } from 'vitest';
import { computeTotal, computeFechas, buildConcepto } from '../../src/modules/cobranza-drafts/invoice.js';

describe('computeTotal', () => {
  it('suma los montos', () => {
    expect(computeTotal([
      { id: 'a', concepto: 'x', monto: 330000 },
      { id: 'b', concepto: 'y', monto: 597000 },
    ])).toBe(927000);
  });
});

describe('computeFechas', () => {
  it('vencimiento en el mismo mes si el día no ha pasado', () => {
    const { fechaVencimiento } = computeFechas(7, new Date(2026, 6, 1));
    expect(fechaVencimiento.getMonth()).toBe(6); // julio
    expect(fechaVencimiento.getDate()).toBe(7);
  });
  it('vencimiento el mes siguiente si el día ya pasó', () => {
    const { fechaVencimiento } = computeFechas(5, new Date(2026, 6, 10));
    expect(fechaVencimiento.getMonth()).toBe(7); // agosto
    expect(fechaVencimiento.getDate()).toBe(5);
  });
});

describe('buildConcepto', () => {
  it('agrega mes y año', () => {
    expect(buildConcepto('Servicios de marketing digital', new Date(2026, 6, 1)))
      .toBe('Servicios de marketing digital — julio 2026');
  });
});
