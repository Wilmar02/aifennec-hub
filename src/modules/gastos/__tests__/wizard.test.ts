import { describe, it, expect, beforeEach } from 'vitest';
import {
  startWizard,
  getWizard,
  updateWizard,
  clearWizard,
  hasActiveWizard,
  _wizardSize,
} from '../state/wizard.js';

// Mock mínimo de Context para los keys
const mkCtx = (chatId: number, fromId: number) => ({
  chat: { id: chatId },
  from: { id: fromId },
} as any);

describe('wizard state machine', () => {
  beforeEach(() => {
    // Limpia los wizards de tests anteriores
    for (let i = 0; i < 10; i++) clearWizard(mkCtx(i, i));
  });

  it('startWizard crea estado en step "tipo"', () => {
    const ctx = mkCtx(1, 1);
    const w = startWizard(ctx);
    expect(w.step).toBe('tipo');
    expect(w.tipo).toBeUndefined();
    expect(hasActiveWizard(ctx)).toBe(true);
  });

  it('updateWizard parchea campos sin perder lo existente', () => {
    const ctx = mkCtx(2, 2);
    startWizard(ctx);
    updateWizard(ctx, { tipo: 'expense', step: 'categoria' });
    updateWizard(ctx, { categoria: 'Vivienda' });
    const w = getWizard(ctx)!;
    expect(w.tipo).toBe('expense');
    expect(w.categoria).toBe('Vivienda');
    expect(w.step).toBe('categoria');
  });

  it('clearWizard elimina el estado', () => {
    const ctx = mkCtx(3, 3);
    startWizard(ctx);
    clearWizard(ctx);
    expect(getWizard(ctx)).toBeNull();
    expect(hasActiveWizard(ctx)).toBe(false);
  });

  it('aisla wizards por chat:from key', () => {
    const a = mkCtx(10, 100);
    const b = mkCtx(10, 200); // mismo chat, distinto user
    const c = mkCtx(20, 100); // distinto chat, mismo user

    startWizard(a);
    updateWizard(a, { tipo: 'expense' });
    startWizard(b);
    updateWizard(b, { tipo: 'income' });
    startWizard(c);
    updateWizard(c, { tipo: 'savings' });

    expect(getWizard(a)?.tipo).toBe('expense');
    expect(getWizard(b)?.tipo).toBe('income');
    expect(getWizard(c)?.tipo).toBe('savings');

    clearWizard(a);
    clearWizard(b);
    clearWizard(c);
  });

  it('updateWizard sobre wizard inexistente devuelve null', () => {
    const ctx = mkCtx(99, 99);
    const r = updateWizard(ctx, { tipo: 'expense' });
    expect(r).toBeNull();
  });

  it('flujo completo: tipo → cat → sub → cuenta → monto → confirmar', () => {
    const ctx = mkCtx(5, 5);
    startWizard(ctx);
    updateWizard(ctx, { tipo: 'expense', step: 'categoria' });
    updateWizard(ctx, { categoria: 'Alimento', step: 'subcategoria' });
    updateWizard(ctx, { subcategoria: 'Mercado', step: 'cuenta' });
    updateWizard(ctx, { cuenta: 'bancolombia debito', cuenta_tipo: 'debito', moneda: 'COP', step: 'monto' });
    updateWizard(ctx, { Valor: 45000, step: 'descripcion' });
    updateWizard(ctx, { descripcion: 'Mercado D1', step: 'confirmar' });

    const w = getWizard(ctx)!;
    expect(w.tipo).toBe('expense');
    expect(w.categoria).toBe('Alimento');
    expect(w.subcategoria).toBe('Mercado');
    expect(w.cuenta).toBe('bancolombia debito');
    expect(w.Valor).toBe(45000);
    expect(w.moneda).toBe('COP');
    expect(w.step).toBe('confirmar');
  });

  it('back: limpia campos al retroceder', () => {
    const ctx = mkCtx(6, 6);
    startWizard(ctx);
    updateWizard(ctx, { tipo: 'expense', categoria: 'Vivienda', subcategoria: 'Luz', step: 'cuenta' });
    // Simular "atrás" desde cuenta a sub
    updateWizard(ctx, { cuenta: undefined, step: 'subcategoria' });
    const w = getWizard(ctx)!;
    expect(w.cuenta).toBeUndefined();
    expect(w.subcategoria).toBe('Luz');
    expect(w.step).toBe('subcategoria');
  });

  it('cleanup: tracker no leakea entradas', () => {
    const before = _wizardSize();
    const ctx = mkCtx(7, 7);
    startWizard(ctx);
    expect(_wizardSize()).toBe(before + 1);
    clearWizard(ctx);
    expect(_wizardSize()).toBe(before);
  });
});
