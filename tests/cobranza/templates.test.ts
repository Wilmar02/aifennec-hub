import { describe, it, expect } from 'vitest';
import { renderTemplate, formatDate, formatMoney } from '../../src/modules/cobranza/templates.js';
import type { CobranzaOpportunity } from '../../src/modules/cobranza/types.js';

const baseOpp: CobranzaOpportunity = {
  ghlOppId: 'test-opp',
  ghlContactId: 'test-contact',
  name: 'Paquete Test',
  status: 'won',
  stageId: 'stage',
  diaPago: 5,
  monto: 4400000,
  moneda: 'COP',
  frecuencia: 'mensual',
  metodoPago: 'Transferencia Bancolombia',
  vpsService: '',
  autoPausa: false,
  items: [
    { id: 'BBX-01', concepto: 'Pautas Meta+Google (5 proyectos)', monto: 4000000, dia: 5, frec: 'mensual' },
    { id: 'BBX-02', concepto: 'CRM Sindy Clinica', monto: 400000, dia: 5, frec: 'mensual' },
  ],
};

describe('formatMoney', () => {
  it('formats COP with thousand separators', () => {
    expect(formatMoney(4400000, 'COP')).toBe('$4.400.000 COP');
  });
  it('formats USD correctly', () => {
    expect(formatMoney(2000, 'USD')).toBe('$2.000 USD');
  });
});

describe('formatDate', () => {
  it('produces human readable Spanish date', () => {
    expect(formatDate(new Date(2026, 4, 5))).toBe('5 de mayo de 2026');
  });
});

describe('renderTemplate', () => {
  const ctx = {
    clienteNombre: 'Jose Anaya',
    opp: baseOpp,
    diasAlPago: -3,
    fechaPagoTexto: '5 de mayo de 2026',
    fechaHoyTexto: '2 de mayo de 2026',
    metodoPagoDetalle: 'Bancolombia cta ahorros 662-500-829-92',
  };

  it('T_MINUS_3 incluye ambos items y total', () => {
    const m = renderTemplate('T_MINUS_3', ctx);
    expect(m.subject).toContain('Recordatorio');
    expect(m.subject).toContain('$4.400.000 COP');
    expect(m.html).toContain('BBX-01');
    expect(m.html).toContain('BBX-02');
    expect(m.html).toContain('Pautas Meta+Google');
    expect(m.plain).toContain('Bancolombia');
  });

  it('T_PLUS_11 is urgent', () => {
    const m = renderTemplate('T_PLUS_11', { ...ctx, diasAlPago: 11 });
    expect(m.subject).toContain('pausa');
    expect(m.html).toContain('pausados');
  });

  it('T_PAUSA mentions pause explicitly', () => {
    const m = renderTemplate('T_PAUSA', { ...ctx, diasAlPago: 15 });
    expect(m.subject).toContain('pausado');
    expect(m.plain).toContain('pausados');
  });
});
