import { loadConfig, resolveEmisor } from './config.js';
import { computeTotal, computeFechas, buildConcepto } from './invoice.js';
import { nextInvoiceNumber } from './numbering.js';
import { generateCobranzaPdf } from './pdf.js';
import { buildSubject, buildBody } from './body.js';
import { buildRawMessage } from './mime.js';
import { createDraft as gmailCreateDraft } from './gmail.js';
import { logger } from '../../infra/logger.js';

export interface RunDeps {
  createDraft: (raw: string, impersonate: string) => Promise<string>;
  now: () => Date;
}

export interface RunResult {
  mes: string;
  creados: Array<{ cliente: string; numero: string; total: number; draftId: string | null }>;
}

export async function runCobranzaDrafts(opts: {
  configPath: string; statePath: string; saJsonPath: string;
  dryRun?: boolean; deps?: Partial<RunDeps>;
}): Promise<RunResult> {
  const dryRun = opts.dryRun ?? false;
  const now = opts.deps?.now ?? (() => new Date());
  const createDraft = opts.deps?.createDraft
    ?? ((raw: string, impersonate: string) => gmailCreateDraft({ saJsonPath: opts.saJsonPath, impersonate, raw }));

  const config = loadConfig(opts.configPath);
  const hoy = now();
  const creados: RunResult['creados'] = [];

  for (const cliente of config.clientes.filter((c) => c.activo)) {
    const emisor = resolveEmisor(config, cliente);
    const numero = String(nextInvoiceNumber(opts.statePath, { dryRun }));
    const total = computeTotal(cliente.items);
    const { fechaEmision, fechaVencimiento } = computeFechas(cliente.diaPago, hoy);
    const concepto = buildConcepto(cliente.conceptoPeriodo, hoy);

    const pdf = await generateCobranzaPdf({
      numeroFactura: numero, fechaFactura: fechaEmision, fechaVencimiento, concepto,
      moneda: cliente.moneda, cliente: { razonSocial: cliente.razonSocial, email: cliente.email },
      emisor, items: cliente.items,
    });

    const subject = buildSubject(numero, hoy, fechaVencimiento, cliente.conceptoPeriodo);
    const body = buildBody({
      cliente, items: cliente.items, total, fechaVencimiento, emisor,
      moneda: cliente.moneda, remitenteNombre: config.remitente.nombre,
    });
    const raw = buildRawMessage({
      fromEmail: config.remitente.email, fromName: config.remitente.nombre,
      to: cliente.email, subject, body, pdf, filename: `cuenta-cobro-${numero}.pdf`,
    });

    let draftId: string | null = null;
    if (dryRun) {
      logger.info({ cliente: cliente.id, numero, total }, 'cobranza-drafts: dryRun (no crea borrador)');
    } else {
      draftId = await createDraft(raw, config.remitente.email);
      logger.info({ cliente: cliente.id, numero, draftId }, 'cobranza-drafts: borrador creado');
    }
    creados.push({ cliente: cliente.id, numero, total, draftId });
  }

  const mes = buildConcepto('', hoy).replace(' — ', '').trim();
  logger.info({ mes, count: creados.length }, 'cobranza-drafts: fin');
  return { mes, creados };
}
