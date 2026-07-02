import { describe, it, expect } from 'vitest';
import { buildReminderSubject, buildReminderBody } from '../../src/modules/cobranza-drafts/reminders-body.js';
import type { Cliente, Emisor } from '../../src/modules/cobranza-drafts/types.js';

const emisor: Emisor = {
  nombre: 'Wilmar Rocha López', cedula: '1.019.031.051', direccion: 'Bogotá',
  banco: 'Bancolombia', tipoCuenta: 'cuenta de ahorros', numeroCuenta: '662-500-829-92',
};
const cliente: Cliente = {
  id: 'yenny', activo: true, razonSocial: 'Yenny — Agencia Bio',
  email: 'y@x.com', emisor: 'wilmar', diaPago: 7, moneda: 'COP',
  conceptoPeriodo: 'Servicios', recordatorios: true, items: [],
};
const fechaPago = new Date(2026, 6, 7); // 7 de julio de 2026
const hoy = new Date(2026, 6, 5);

describe('buildReminderSubject', () => {
  it('preventivo menciona que se acerca el pago', () => {
    const s = buildReminderSubject(cliente, 'preventivo', hoy);
    expect(s.toLowerCase()).toMatch(/acerca|próxim|recordatorio/);
  });

  it('mora menciona pendiente', () => {
    const s = buildReminderSubject(cliente, 'mora', hoy);
    expect(s.toLowerCase()).toMatch(/pendiente|vencid/);
  });

  it('los dos tonos generan subjects distintos', () => {
    const a = buildReminderSubject(cliente, 'preventivo', hoy);
    const b = buildReminderSubject(cliente, 'mora', hoy);
    expect(a).not.toBe(b);
  });
});

describe('buildReminderBody', () => {
  it('preventivo usa tono amable ("se acerca")', () => {
    const body = buildReminderBody({
      cliente, tipo: 'preventivo', total: 1657000, fechaPago, emisor, moneda: 'COP',
    });
    expect(body.toLowerCase()).toMatch(/se acerca/);
    expect(body).toContain('julio');
    expect(body).toContain('$1.657.000 COP');
    expect(body).toContain('7 de julio de 2026');
    expect(body).toContain('662-500-829-92');
    expect(body).not.toContain('undefined');
  });

  it('mora usa tono cordial-firme ("quedó pendiente")', () => {
    const body = buildReminderBody({
      cliente, tipo: 'mora', total: 1657000, fechaPago, emisor, moneda: 'COP',
    });
    expect(body.toLowerCase()).toMatch(/quedó pendiente|sigue pendiente/);
    expect(body).toContain('julio');
    expect(body).toContain('$1.657.000 COP');
    expect(body).toContain('7 de julio de 2026');
    expect(body).toContain('662-500-829-92');
    expect(body).not.toContain('undefined');
  });

  it('los dos tonos producen cuerpos distintos', () => {
    const a = buildReminderBody({ cliente, tipo: 'preventivo', total: 1657000, fechaPago, emisor, moneda: 'COP' });
    const b = buildReminderBody({ cliente, tipo: 'mora', total: 1657000, fechaPago, emisor, moneda: 'COP' });
    expect(a).not.toBe(b);
  });
});
