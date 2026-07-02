import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

vi.mock('../../src/infra/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { runReminders } from '../../src/modules/cobranza-drafts/reminders-run.js';

let dir: string, cfgPath: string, saPath: string;

const CONFIG = {
  emisores: { wilmar: { nombre: 'Wilmar', cedula: '1', direccion: 'Bogotá', banco: 'Bancolombia', tipoCuenta: 'ahorros', numeroCuenta: '662' } },
  remitente: { email: 'wilmar@aifennecia.com', nombre: 'Wilmar' },
  clientes: [
    {
      id: 'yenny', activo: true, razonSocial: 'Yenny', email: 'y@x.com', emisor: 'wilmar',
      diaPago: 7, moneda: 'COP', conceptoPeriodo: 'Servicios', recordatorios: true,
      items: [{ id: 'YEN-01', concepto: 'Pauta', monto: 330000 }],
    },
    {
      id: 'otro', activo: true, razonSocial: 'Otro Cliente', email: 'o@x.com', emisor: 'wilmar',
      diaPago: 7, moneda: 'COP', conceptoPeriodo: 'Servicios',
      items: [{ id: 'O-01', concepto: 'Algo', monto: 100000 }],
    },
  ],
};

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'rem-run-'));
  cfgPath = join(dir, 'clientes.json'); writeFileSync(cfgPath, JSON.stringify(CONFIG));
  saPath = join(dir, 'sa.json'); writeFileSync(saPath, JSON.stringify({ client_email: 'sa@x.iam', private_key: 'K' }));
});
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe('runReminders', () => {
  it('crea un borrador solo para el cliente flaggeado en su día T-2', async () => {
    const createDraft = vi.fn().mockResolvedValue('draft_1');
    const res = await runReminders({
      configPath: cfgPath, saJsonPath: saPath,
      deps: { createDraft, now: () => new Date(2026, 6, 5) }, // T-2 de diaPago=7
    });
    expect(res.creados).toHaveLength(1);
    expect(res.creados[0]).toMatchObject({ cliente: 'yenny', tipo: 'preventivo' });
    expect(createDraft).toHaveBeenCalledOnce();
    expect(createDraft).toHaveBeenCalledWith(expect.any(String), 'wilmar@aifennecia.com');
  });

  it('crea un borrador en el día T+3 (mora)', async () => {
    const createDraft = vi.fn().mockResolvedValue('draft_2');
    const res = await runReminders({
      configPath: cfgPath, saJsonPath: saPath,
      deps: { createDraft, now: () => new Date(2026, 6, 10) }, // T+3
    });
    expect(res.creados).toHaveLength(1);
    expect(res.creados[0]).toMatchObject({ cliente: 'yenny', tipo: 'mora' });
  });

  it('no crea nada cuando el día no coincide', async () => {
    const createDraft = vi.fn().mockResolvedValue('nope');
    const res = await runReminders({
      configPath: cfgPath, saJsonPath: saPath,
      deps: { createDraft, now: () => new Date(2026, 6, 15) },
    });
    expect(res.creados).toHaveLength(0);
    expect(createDraft).not.toHaveBeenCalled();
  });

  it('dryRun no crea borradores aunque el día coincida', async () => {
    const createDraft = vi.fn().mockResolvedValue('nope');
    const res = await runReminders({
      configPath: cfgPath, saJsonPath: saPath, dryRun: true,
      deps: { createDraft, now: () => new Date(2026, 6, 5) },
    });
    expect(createDraft).not.toHaveBeenCalled();
    expect(res.creados).toHaveLength(1);
    expect(res.creados[0].draftId).toBeNull();
  });
});
