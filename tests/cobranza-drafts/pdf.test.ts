import { describe, it, expect } from 'vitest';
import { generateCobranzaPdf } from '../../src/modules/cobranza-drafts/pdf.js';
import type { PdfInput } from '../../src/modules/cobranza-drafts/pdf.js';

const input: PdfInput = {
  numeroFactura: '85', fechaFactura: new Date(2026, 6, 1), fechaVencimiento: new Date(2026, 6, 7),
  concepto: 'Servicios — julio 2026', moneda: 'COP',
  cliente: { razonSocial: 'Yenny — Agencia Bio', email: 'y@x.com' },
  emisor: { nombre: 'Wilmar Rocha López', cedula: '1.019.031.051', direccion: 'Bogotá',
    banco: 'Bancolombia', tipoCuenta: 'cuenta de ahorros', numeroCuenta: '662-500-829-92' },
  items: [
    { id: 'YEN-01', concepto: 'Pauta Meta', monto: 330000, descripcion: 'Gestión de campañas' },
    { id: 'YEN-03', concepto: 'CRM', monto: 597000 },
  ],
};

describe('generateCobranzaPdf', () => {
  it('produce un Buffer PDF válido', async () => {
    const buf = await generateCobranzaPdf(input);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(1000);
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(buf.subarray(-6).toString()).toContain('EOF');
  });
});
