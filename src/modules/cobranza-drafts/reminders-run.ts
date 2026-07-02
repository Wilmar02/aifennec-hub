import { loadConfig, resolveEmisor } from './config.js';
import { computeTotal } from './invoice.js';
import { dueReminders } from './reminders.js';
import { buildReminderSubject, buildReminderBody } from './reminders-body.js';
import { buildRawMessage } from './mime.js';
import { createDraft as gmailCreateDraft } from './gmail.js';
import { logger } from '../../infra/logger.js';

export interface RemindersRunDeps {
  createDraft: (raw: string, impersonate: string) => Promise<string>;
  now: () => Date;
}

export interface RemindersRunResult {
  creados: Array<{ cliente: string; tipo: 'preventivo' | 'mora'; total: number; draftId: string | null }>;
}

export async function runReminders(opts: {
  configPath: string; saJsonPath: string;
  dryRun?: boolean; deps?: Partial<RemindersRunDeps>;
}): Promise<RemindersRunResult> {
  const dryRun = opts.dryRun ?? false;
  const now = opts.deps?.now ?? (() => new Date());
  const createDraft = opts.deps?.createDraft
    ?? ((raw: string, impersonate: string) => gmailCreateDraft({ saJsonPath: opts.saJsonPath, impersonate, raw }));

  const config = loadConfig(opts.configPath);
  const hoy = now();
  const creados: RemindersRunResult['creados'] = [];

  for (const { cliente, tipo, fechaPago } of dueReminders(config.clientes, hoy)) {
    const emisor = resolveEmisor(config, cliente);
    const total = computeTotal(cliente.items);

    const subject = buildReminderSubject(cliente, tipo, hoy);
    const body = buildReminderBody({ cliente, tipo, total, fechaPago, emisor, moneda: cliente.moneda });
    const raw = buildRawMessage({
      fromEmail: config.remitente.email, fromName: config.remitente.nombre,
      to: cliente.email, subject, body,
    });

    let draftId: string | null = null;
    if (dryRun) {
      logger.info({ cliente: cliente.id, tipo, total }, 'cobranza-drafts/reminders: dryRun (no crea borrador)');
    } else {
      draftId = await createDraft(raw, config.remitente.email);
      logger.info({ cliente: cliente.id, tipo, draftId }, 'cobranza-drafts/reminders: borrador creado');
    }
    creados.push({ cliente: cliente.id, tipo, total, draftId });
  }

  logger.info({ count: creados.length }, 'cobranza-drafts/reminders: fin');
  return { creados };
}
