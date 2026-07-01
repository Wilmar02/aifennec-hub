import { readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

export function nextInvoiceNumber(statePath: string, opts: { dryRun?: boolean } = {}): number {
  let last = 0;
  if (existsSync(statePath)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(statePath, 'utf8'));
    } catch (err) {
      throw new Error(`Estado de numeración corrupto en ${statePath}: ${err instanceof Error ? err.message : String(err)}`);
    }

    const lastInvoiceNumber = (parsed as Record<string, unknown>)?.lastInvoiceNumber;
    if (typeof lastInvoiceNumber !== 'number' || !Number.isInteger(lastInvoiceNumber) || lastInvoiceNumber < 0) {
      throw new Error(`Estado de numeración corrupto en ${statePath}: lastInvoiceNumber debe ser un entero no-negativo, recibido ${JSON.stringify(lastInvoiceNumber)}`);
    }
    last = lastInvoiceNumber;
  }
  const next = last + 1;
  if (!opts.dryRun) {
    const tmpFile = join(dirname(statePath), `.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`);
    writeFileSync(tmpFile, JSON.stringify({ lastInvoiceNumber: next }, null, 2));
    renameSync(tmpFile, statePath);
  }
  return next;
}
