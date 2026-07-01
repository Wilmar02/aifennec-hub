import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadConfig } from '../../src/modules/cobranza-drafts/config.js';

const here = dirname(fileURLToPath(import.meta.url));
const seed = join(here, '../../src/modules/cobranza-drafts/clientes.json');

describe('seed clientes.json', () => {
  it('existe y es válido según el schema', () => {
    expect(existsSync(seed)).toBe(true);
    const cfg = loadConfig(seed);
    expect(cfg.remitente.email).toBe('wilmar@aifennecia.com');
    expect(cfg.clientes.length).toBeGreaterThan(0);
  });
});
