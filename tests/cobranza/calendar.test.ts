import { describe, it, expect } from 'vitest';
import {
  computeDecision,
  daysRelativeToDueDay,
  pickTemplate,
} from '../../src/modules/cobranza/calendar.js';

describe('calendar.daysRelativeToDueDay', () => {
  it('returns -3 three days before due day', () => {
    const today = new Date(2026, 3, 22); // 22 abril
    expect(daysRelativeToDueDay(today, 25)).toBe(-3);
  });
  it('returns 0 on due day', () => {
    const today = new Date(2026, 3, 5);
    expect(daysRelativeToDueDay(today, 5)).toBe(0);
  });
  it('returns +7 seven days after due day', () => {
    const today = new Date(2026, 3, 12);
    expect(daysRelativeToDueDay(today, 5)).toBe(7);
  });
  it('handles due day beyond month length (clamps to last day)', () => {
    const today = new Date(2026, 1, 28); // 28 feb
    expect(daysRelativeToDueDay(today, 31)).toBe(0);
  });
});

describe('calendar.pickTemplate', () => {
  it('no template for days < -3', () => {
    expect(pickTemplate(-5)).toBeNull();
  });
  it('T_MINUS_3 at -3', () => {
    expect(pickTemplate(-3)?.template).toBe('T_MINUS_3');
  });
  it('T_ZERO at 0', () => {
    expect(pickTemplate(0)?.template).toBe('T_ZERO');
  });
  it('T_PLUS_3 at 3-6', () => {
    expect(pickTemplate(3)?.template).toBe('T_PLUS_3');
    expect(pickTemplate(6)?.template).toBe('T_PLUS_3');
  });
  it('T_PLUS_7 at 7-10', () => {
    expect(pickTemplate(7)?.template).toBe('T_PLUS_7');
    expect(pickTemplate(10)?.template).toBe('T_PLUS_7');
  });
  it('T_PLUS_11 is critical', () => {
    expect(pickTemplate(11)?.isCritical).toBe(true);
  });
  it('T_PAUSA at 15+', () => {
    expect(pickTemplate(15)?.template).toBe('T_PAUSA');
  });
  it('T_PLUS_30 at 30+', () => {
    expect(pickTemplate(30)?.template).toBe('T_PLUS_30');
  });
  it('T_PLUS_45 at 45+', () => {
    expect(pickTemplate(45)?.template).toBe('T_PLUS_45');
    expect(pickTemplate(100)?.template).toBe('T_PLUS_45');
  });
});

describe('calendar.computeDecision', () => {
  it('returns null for invalid due day', () => {
    expect(computeDecision(new Date(), 0)).toBeNull();
    expect(computeDecision(new Date(), 32)).toBeNull();
  });
  it('integrates days + template', () => {
    const today = new Date(2026, 3, 24); // 24 abril
    const dec = computeDecision(today, 5);
    expect(dec?.diasAlPago).toBe(19);
    expect(dec?.template).toBe('T_PAUSA');
    expect(dec?.isCritical).toBe(true);
  });
});
