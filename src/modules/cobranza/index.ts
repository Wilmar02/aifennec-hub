import { logger } from '../../infra/logger.js';
import { runCobranza } from './engine.js';

export async function runCobranzaJob(): Promise<void> {
  try {
    await runCobranza();
  } catch (err) {
    logger.error({ err }, 'cobranza: job crashed');
    throw err;
  }
}

// CLI entry point: `pnpm cobranza:once` or `pnpm cobranza:dry`
const isCli = typeof process !== 'undefined' && process.argv[1]?.endsWith('cobranza/index.js');
if (isCli) {
  const dryRun = process.argv.includes('--dry');
  runCobranza({ dryRun })
    .then((res) => {
      console.log(JSON.stringify(res, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

export { runCobranza };
