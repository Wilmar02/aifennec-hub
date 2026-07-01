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

import { runCobranzaDrafts } from '../../src/modules/cobranza-drafts/run.js';

let dir: string, cfgPath: string, statePath: string, saPath: string;

const CONFIG = {
  emisores: { wilmar: { nombre: 'Wilmar', cedula: '1', direccion: 'Bogotá', banco: 'Bancolombia', tipoCuenta: 'ahorros', numeroCuenta: '662' } },
  remitente: { email: 'wilmar@aifennecia.com', nombre: 'Wilmar' },
  clientes: [
    { id: 'yenny', activo: true, razonSocial: 'Yenny', email: 'y@x.com', emisor: 'wilmar', diaPago: 7, moneda: 'COP', conceptoPeriodo: 'Servicios',
      items: [{ id: 'YEN-01', concepto: 'Pauta', monto: 330000 }, { id: 'YEN-03', concepto: 'CRM', monto: 597000 }] },
    { id: 'pausado', activo: false, razonSocial: 'X', email: 'x@x.com', emisor: 'wilmar', diaPago: 5, moneda: 'COP', conceptoPeriodo: 'Servicios',
      items: [{ id: 'P-01', concepto: 'Algo', monto: 100000 }] },
  ],
};

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'run-'));
  cfgPath = join(dir, 'clientes.json'); writeFileSync(cfgPath, JSON.stringify(CONFIG));
  statePath = join(dir, '.state.json'); writeFileSync(statePath, JSON.stringify({ lastInvoiceNumber: 85 }));
  saPath = join(dir, 'sa.json'); writeFileSync(saPath, JSON.stringify({ client_email: 'sa@x.iam', private_key: 'K' }));
});
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe('runCobranzaDrafts', () => {
  it('crea un borrador solo para el cliente activo con total y número correctos', async () => {
    const createDraft = vi.fn().mockResolvedValue('draft_1');
    const res = await runCobranzaDrafts({
      configPath: cfgPath, statePath, saJsonPath: saPath,
      deps: { createDraft, now: () => new Date(2026, 6, 1) },
    });
    expect(res.creados).toHaveLength(1);
    expect(res.creados[0]).toMatchObject({ cliente: 'yenny', numero: '86', total: 927000, draftId: 'draft_1' });
    expect(createDraft).toHaveBeenCalledOnce();
    expect(createDraft).toHaveBeenCalledWith(expect.any(String), 'wilmar@aifennecia.com');
  });

  it('dryRun no crea borradores', async () => {
    const createDraft = vi.fn().mockResolvedValue('nope');
    const res = await runCobranzaDrafts({
      configPath: cfgPath, statePath, saJsonPath: saPath, dryRun: true,
      deps: { createDraft, now: () => new Date(2026, 6, 1) },
    });
    expect(createDraft).not.toHaveBeenCalled();
    expect(res.creados[0].draftId).toBeNull();
  });
});
