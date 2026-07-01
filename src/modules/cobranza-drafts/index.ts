import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../../infra/env.js';
import { logger } from '../../infra/logger.js';
import { runCobranzaDrafts } from './run.js';

const here = dirname(fileURLToPath(import.meta.url));

function paths() {
  return {
    configPath: env.COBRANZA_DRAFTS_CONFIG_PATH || join(here, 'clientes.json'),
    statePath: env.COBRANZA_DRAFTS_STATE_PATH || join(here, '.state.json'),
    saJsonPath: env.GOOGLE_SERVICE_ACCOUNT_JSON_PATH,
  };
}

export async function runCobranzaDraftsJob(): Promise<void> {
  try {
    const res = await runCobranzaDrafts({ ...paths(), dryRun: false });
    logger.info({ creados: res.creados.length }, 'cobranza-drafts: job ok');
  } catch (err) {
    logger.error({ err }, 'cobranza-drafts: job crashed');
    throw err;
  }
}

// CLI: `pnpm cobranza:drafts` / `pnpm cobranza:drafts:dry`
const entry = process.argv[1]?.replace(/\\/g, '/') ?? '';
const isCli = /cobranza-drafts\/index\.(ts|js)$/.test(entry);
if (isCli) {
  const dryRun = process.argv.includes('--dry');
  runCobranzaDrafts({ ...paths(), dryRun })
    .then((res) => { console.log(JSON.stringify(res, null, 2)); process.exit(0); })
    .catch((err) => { console.error(err); process.exit(1); });
}
