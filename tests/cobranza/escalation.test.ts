import { describe, it, expect } from 'vitest';
import { escalationDecide, ESCALATION_CHAIN } from '../../src/modules/cobranza/calendar.js';
import type { TemplateId } from '../../src/modules/cobranza/types.js';

const day = (y: number, m: number, d: number): Date => new Date(y, m - 1, d);

describe('escalationDecide — sin envíos previos', () => {
  it('null si days < -3', () => {
    expect(escalationDecide(-5, null, day(2026, 4, 27))).toBeNull();
  });
  it('T_MINUS_3 si days = -3', () => {
    expect(escalationDecide(-3, null, day(2026, 4, 28))?.template).toBe('T_MINUS_3');
  });
  it('T_ZERO si days = 0', () => {
    expect(escalationDecide(0, null, day(2026, 5, 1))?.template).toBe('T_ZERO');
  });
  it('T_ZERO incluso con atraso grande (cortesía primer contacto)', () => {
    expect(escalationDecide(23, null, day(2026, 4, 24))?.template).toBe('T_ZERO');
    expect(escalationDecide(45, null, day(2026, 5, 16))?.template).toBe('T_ZERO');
  });
});

describe('escalationDecide — con T_ZERO previo', () => {
  it('null si solo 1 día desde T_ZERO (espera 3)', () => {
    const lastSent = { template: 'T_ZERO' as TemplateId, sentAt: day(2026, 4, 24) };
    expect(escalationDecide(24, lastSent, day(2026, 4, 25))).toBeNull();
  });
  it('null si 2 días desde T_ZERO', () => {
    const lastSent = { template: 'T_ZERO' as TemplateId, sentAt: day(2026, 4, 24) };
    expect(escalationDecide(25, lastSent, day(2026, 4, 26))).toBeNull();
  });
  it('T_PLUS_3 si 3 días desde T_ZERO + days >= 3', () => {
    const lastSent = { template: 'T_ZERO' as TemplateId, sentAt: day(2026, 4, 24) };
    const dec = escalationDecide(26, lastSent, day(2026, 4, 27));
    expect(dec?.template).toBe('T_PLUS_3');
    expect(dec?.isCritical).toBe(false);
  });
});

describe('escalationDecide — escalamiento progresivo', () => {
  it('T_PLUS_3 → T_PLUS_7 espera 4 días', () => {
    const lastSent = { template: 'T_PLUS_3' as TemplateId, sentAt: day(2026, 4, 27) };
    expect(escalationDecide(30, lastSent, day(2026, 4, 30))).toBeNull(); // 3 días
    expect(escalationDecide(31, lastSent, day(2026, 5, 1))?.template).toBe('T_PLUS_7'); // 4 días + days >= 7
  });
  it('T_PLUS_7 → T_PLUS_11 espera 4 días', () => {
    const lastSent = { template: 'T_PLUS_7' as TemplateId, sentAt: day(2026, 5, 1) };
    expect(escalationDecide(35, lastSent, day(2026, 5, 5))?.template).toBe('T_PLUS_11');
    expect(escalationDecide(35, lastSent, day(2026, 5, 5))?.isCritical).toBe(true);
  });
  it('T_PLUS_11 → T_PAUSA espera 4 días', () => {
    const lastSent = { template: 'T_PLUS_11' as TemplateId, sentAt: day(2026, 5, 5) };
    expect(escalationDecide(39, lastSent, day(2026, 5, 9))?.template).toBe('T_PAUSA');
  });
  it('T_PAUSA → T_PLUS_30 espera 15 días', () => {
    const lastSent = { template: 'T_PAUSA' as TemplateId, sentAt: day(2026, 5, 9) };
    expect(escalationDecide(50, lastSent, day(2026, 5, 20))).toBeNull(); // 11 días
    expect(escalationDecide(54, lastSent, day(2026, 5, 24))?.template).toBe('T_PLUS_30');
  });
  it('T_PLUS_45 es el último, retorna null si ya se envió', () => {
    const lastSent = { template: 'T_PLUS_45' as TemplateId, sentAt: day(2026, 6, 5) };
    expect(escalationDecide(60, lastSent, day(2026, 7, 1))).toBeNull();
  });
});

describe('escalationDecide — caso Blue Box (bug original)', () => {
  it('día 25 abril (1d post T_ZERO): NO dispara T_PAUSA, espera', () => {
    const lastSent = { template: 'T_ZERO' as TemplateId, sentAt: day(2026, 4, 24) };
    expect(escalationDecide(24, lastSent, day(2026, 4, 25))).toBeNull();
  });
  it('día 27 abril (3d post T_ZERO): T_PLUS_3 cordial (no T_PAUSA)', () => {
    const lastSent = { template: 'T_ZERO' as TemplateId, sentAt: day(2026, 4, 24) };
    const dec = escalationDecide(26, lastSent, day(2026, 4, 27));
    expect(dec?.template).toBe('T_PLUS_3');
    expect(dec?.isCritical).toBe(false);
  });
});

describe('ESCALATION_CHAIN', () => {
  it('contiene 8 steps en orden', () => {
    expect(ESCALATION_CHAIN.map((s) => s.template)).toEqual([
      'T_MINUS_3', 'T_ZERO', 'T_PLUS_3', 'T_PLUS_7', 'T_PLUS_11', 'T_PAUSA', 'T_PLUS_30', 'T_PLUS_45',
    ]);
  });
  it('los 4 últimos son críticos', () => {
    const critical = ESCALATION_CHAIN.filter((s) => s.critical).map((s) => s.template);
    expect(critical).toEqual(['T_PLUS_11', 'T_PAUSA', 'T_PLUS_30', 'T_PLUS_45']);
  });
});
