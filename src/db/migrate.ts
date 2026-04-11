import { readFile, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pool, query, close } from './connection.js';
import { logger } from '../infra/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, 'migrations');

async function ensureMigrationsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

async function appliedMigrations(): Promise<Set<string>> {
  const rows = await query<{ filename: string }>('SELECT filename FROM migrations');
  return new Set(rows.map((r) => r.filename));
}

async function run(): Promise<void> {
  await ensureMigrationsTable();
  const applied = await appliedMigrations();
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    if (applied.has(file)) {
      logger.info({ file }, 'migration already applied, skipping');
      continue;
    }
    const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf8');
    logger.info({ file }, 'applying migration');
    await pool.query('BEGIN');
    try {
      await pool.query(sql);
      await pool.query('INSERT INTO migrations (filename) VALUES ($1)', [file]);
      await pool.query('COMMIT');
      logger.info({ file }, 'migration applied');
    } catch (err) {
      await pool.query('ROLLBACK');
      logger.error({ err, file }, 'migration failed');
      throw err;
    }
  }
  await close();
  logger.info('all migrations done');
}

run().catch((err) => {
  logger.error({ err }, 'migrate failed');
  process.exit(1);
});
