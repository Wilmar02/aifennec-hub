import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadConfig, resolveEmisor } from '../../src/modules/cobranza-drafts/config.js';

let dir: string;
const VALID = {
  emisores: {
    wilmar: { nombre: 'Wilmar Rocha López', cedula: '1.019.031.051', direccion: 'Bogotá',
      banco: 'Bancolombia', tipoCuenta: 'cuenta de ahorros', numeroCuenta: '662-500-829-92' },
  },
  remitente: { email: 'wilmar@aifennecia.com', nombre: 'Wilmar Rocha López' },
  clientes: [
    { id: 'yenny', activo: true, razonSocial: 'Yenny — Agencia Bio', email: 'y@x.com',
      emisor: 'wilmar', diaPago: 7, moneda: 'COP', conceptoPeriodo: 'Servicios',
      items: [{ id: 'YEN-01', concepto: 'Pauta', monto: 330000 }] },
  ],
};

function write(obj: unknown): string {
  const p = join(dir, 'clientes.json');
  writeFileSync(p, JSON.stringify(obj));
  return p;
}

beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'cob-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe('loadConfig', () => {
  it('carga un JSON válido', () => {
    const cfg = loadConfig(write(VALID));
    expect(cfg.clientes[0].id).toBe('yenny');
    expect(resolveEmisor(cfg, cfg.clientes[0]).banco).toBe('Bancolombia');
  });

  it('rechaza email inválido', () => {
    const bad = structuredClone(VALID);
    bad.clientes[0].email = 'no-es-email';
    expect(() => loadConfig(write(bad))).toThrow();
  });

  it('rechaza monto negativo', () => {
    const bad = structuredClone(VALID);
    bad.clientes[0].items[0].monto = -1;
    expect(() => loadConfig(write(bad))).toThrow();
  });

  it('rechaza cliente activo sin items', () => {
    const bad = structuredClone(VALID);
    bad.clientes[0].items = [];
    expect(() => loadConfig(write(bad))).toThrow();
  });

  it('rechaza emisor inexistente', () => {
    const bad = structuredClone(VALID);
    bad.clientes[0].emisor = 'fantasma';
    expect(() => loadConfig(write(bad))).toThrow(/emisor/i);
  });

  it('carga un cliente con recordatorios: true', () => {
    const withReminders = structuredClone(VALID);
    (withReminders.clientes[0] as { recordatorios?: boolean }).recordatorios = true;
    const cfg = loadConfig(write(withReminders));
    expect(cfg.clientes[0].recordatorios).toBe(true);
  });
});
