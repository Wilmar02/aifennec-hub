import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { nextInvoiceNumber } from '../../src/modules/cobranza-drafts/numbering.js';

let dir: string;
let state: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'num-')); state = join(dir, '.state.json'); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe('nextInvoiceNumber', () => {
  it('incrementa desde el estado y persiste', () => {
    writeFileSync(state, JSON.stringify({ lastInvoiceNumber: 85 }));
    expect(nextInvoiceNumber(state)).toBe(86);
    expect(JSON.parse(readFileSync(state, 'utf8')).lastInvoiceNumber).toBe(86);
  });

  it('dryRun no persiste', () => {
    writeFileSync(state, JSON.stringify({ lastInvoiceNumber: 85 }));
    expect(nextInvoiceNumber(state, { dryRun: true })).toBe(86);
    expect(JSON.parse(readFileSync(state, 'utf8')).lastInvoiceNumber).toBe(85);
  });

  it('arranca en 1 si no existe el archivo', () => {
    expect(existsSync(state)).toBe(false);
    expect(nextInvoiceNumber(state)).toBe(1);
  });
});
