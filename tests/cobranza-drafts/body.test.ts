import { describe, it, expect } from 'vitest';
import { buildSubject, buildBody } from '../../src/modules/cobranza-drafts/body.js';
import type { Cliente, Emisor } from '../../src/modules/cobranza-drafts/types.js';

const emisor: Emisor = { nombre: 'Wilmar Rocha López', cedula: '1.019.031.051', direccion: 'Bogotá',
  banco: 'Bancolombia', tipoCuenta: 'cuenta de ahorros', numeroCuenta: '662-500-829-92' };
const cliente: Cliente = { id: 'yenny', activo: true, razonSocial: 'Yenny — Agencia Bio',
  email: 'y@x.com', emisor: 'wilmar', diaPago: 7, moneda: 'COP', conceptoPeriodo: 'Servicios',
  notaCorreo: 'Desde este mes ya no se incluye John Very.', items: [] };

describe('buildSubject', () => {
  it('incluye número y fecha de vencimiento', () => {
    const s = buildSubject('85', new Date(2026, 6, 1), new Date(2026, 6, 7));
    expect(s).toContain('N°85');
    expect(s).toContain('julio 2026');
    expect(s).toContain('7 de julio');
  });
});

describe('buildBody', () => {
  it('incluye total, fecha de pago, datos de pago y confirmación', () => {
    const body = buildBody({
      cliente, emisor, moneda: 'COP', total: 1657000, fechaVencimiento: new Date(2026, 6, 7),
      remitenteNombre: 'Wilmar Rocha López',
      items: [{ id: 'YEN-01', concepto: 'Pauta Meta', monto: 330000 }],
    });
    expect(body).toContain('$1.657.000 COP');
    expect(body).toContain('7 de julio de 2026');
    expect(body).toContain('662-500-829-92');
    expect(body).toMatch(/confirm/i);
    expect(body).toContain('John Very'); // notaCorreo
  });

  it('omite la nota cuando notaCorreo no está presente', () => {
    const clienteSinNota: Cliente = { id: 'yenny', activo: true, razonSocial: 'Yenny — Agencia Bio',
      email: 'y@x.com', emisor: 'wilmar', diaPago: 7, moneda: 'COP', conceptoPeriodo: 'Servicios',
      items: [] };
    const body = buildBody({
      cliente: clienteSinNota, emisor, moneda: 'COP', total: 1657000, fechaVencimiento: new Date(2026, 6, 7),
      remitenteNombre: 'Wilmar Rocha López',
      items: [{ id: 'YEN-01', concepto: 'Pauta Meta', monto: 330000 }],
    });
    expect(body).not.toContain('undefined');
    expect(body).not.toContain('John Very');
  });
});
