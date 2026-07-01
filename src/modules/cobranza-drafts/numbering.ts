import { readFileSync, writeFileSync, existsSync } from 'node:fs';

export function nextInvoiceNumber(statePath: string, opts: { dryRun?: boolean } = {}): number {
  let last = 0;
  if (existsSync(statePath)) {
    const parsed = JSON.parse(readFileSync(statePath, 'utf8'));
    if (typeof parsed?.lastInvoiceNumber === 'number') last = parsed.lastInvoiceNumber;
  }
  const next = last + 1;
  if (!opts.dryRun) {
    writeFileSync(statePath, JSON.stringify({ lastInvoiceNumber: next }, null, 2));
  }
  return next;
}
