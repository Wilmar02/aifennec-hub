import { describe, it, expect } from 'vitest';
import { dueReminders } from '../../src/modules/cobranza-drafts/reminders.js';
import type { Cliente } from '../../src/modules/cobranza-drafts/types.js';

function cliente(overrides: Partial<Cliente> = {}): Cliente {
  return {
    id: 'yenny',
    activo: true,
    razonSocial: 'Yenny — Agencia Bio',
    email: 'y@x.com',
    emisor: 'wilmar',
    diaPago: 7,
    moneda: 'COP',
    conceptoPeriodo: 'Servicios',
    recordatorios: true,
    items: [{ id: 'YEN-01', concepto: 'Pauta', monto: 330000 }],
    ...overrides,
  };
}

describe('dueReminders', () => {
  it('incluye tipo preventivo cuando hoy es fechaPago - 2 días', () => {
    const hoy = new Date(2026, 6, 5); // 5 de julio, diaPago=7 -> T-2
    const res = dueReminders([cliente()], hoy);
    expect(res).toHaveLength(1);
    expect(res[0].tipo).toBe('preventivo');
    expect(res[0].cliente.id).toBe('yenny');
    expect(res[0].fechaPago).toEqual(new Date(2026, 6, 7));
  });

  it('incluye tipo mora cuando hoy es fechaPago + 3 días', () => {
    const hoy = new Date(2026, 6, 10); // 10 de julio, diaPago=7 -> T+3
    const res = dueReminders([cliente()], hoy);
    expect(res).toHaveLength(1);
    expect(res[0].tipo).toBe('mora');
    expect(res[0].fechaPago).toEqual(new Date(2026, 6, 7));
  });

  it('excluye clientes sin el flag recordatorios', () => {
    const hoy = new Date(2026, 6, 5);
    const res = dueReminders([cliente({ recordatorios: false })], hoy);
    expect(res).toHaveLength(0);
  });

  it('excluye clientes sin el flag recordatorios (undefined = default false)', () => {
    const hoy = new Date(2026, 6, 5);
    const res = dueReminders([cliente({ recordatorios: undefined })], hoy);
    expect(res).toHaveLength(0);
  });

  it('excluye clientes inactivos', () => {
    const hoy = new Date(2026, 6, 5);
    const res = dueReminders([cliente({ activo: false })], hoy);
    expect(res).toHaveLength(0);
  });

  it('no incluye nada cuando el día no coincide con T-2 ni T+3', () => {
    const hoy = new Date(2026, 6, 15);
    const res = dueReminders([cliente()], hoy);
    expect(res).toHaveLength(0);
  });
});
