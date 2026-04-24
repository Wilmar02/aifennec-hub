import { env } from '../../infra/env.js';
import { logger } from '../../infra/logger.js';
import { sendMessage as telegramSend } from '../../channels/telegram.js';
import {
  listOpportunitiesInPipeline,
  getContact,
  sendEmail,
  addContactNote,
  uploadMedia as ghlUploadMedia,
  type GhlOpportunity,
} from '../../channels/ghl.js';
import {
  sendTemplate as waSendTemplate,
  WA_TEMPLATE_BINDINGS,
  type CobranzaWaContext,
} from '../../channels/whatsapp-meta.js';
import { computeDecision } from './calendar.js';
import { renderTemplate, formatDate, formatMoney } from './templates.js';
import { generateCobranzaPdf } from './pdf.js';
import { alreadySentThisMonth, logSend } from './repository.js';
import type {
  CobranzaContact,
  CobranzaItem,
  CobranzaOpportunity,
  TemplateId,
} from './types.js';

/**
 * Custom field IDs del pipeline "Clientes IA AIFENNEC LLC" de la location AIFENNEC.
 * La GHL API devuelve customFields como [{id, fieldValue}] — hay que hacer lookup por id.
 * Si se clona el location o cambia el schema, actualizar estos IDs (fuente: seed_ghl_aifennec.py).
 */
const CF_ID = {
  DIA_PAGO:    'V4XZRHf9i71vODEshfyH',
  MONTO:       '9K5H7X9M9nTXAuyJVHdY',
  MONEDA:      'XRqQoCiZmkkIMj51WYGh',
  FRECUENCIA:  'ueeCRthViRjTYhodynOq',
  VPS_SERVICE: 'ilNeOjZMEiux39OiE6Y5',
  METODO_PAGO: 'p7h2qdBukvBVV9fja7gj',
  AUTO_PAUSA:  'ycfAn4FFw9LvMWTq6iX7',
  ITEMS_JSON:  'eG1NzxJ9aoOvgLxzj7YK',
  ULTIMO_PAGO: 'JDnqILhK43XhKMJBOVZ1',
} as const;

function currentCycleYYYYMM(today: Date): string {
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
}

function readCf(opp: GhlOpportunity, id: string): string | undefined {
  const f = opp.customFields?.find((x) => (x as unknown as { id?: string }).id === id);
  if (!f) return undefined;
  const anyF = f as unknown as { fieldValueString?: string; fieldValue?: string | number | boolean };
  if (anyF.fieldValueString !== undefined) return anyF.fieldValueString;
  if (anyF.fieldValue !== undefined) return String(anyF.fieldValue);
  return undefined;
}

function parseItems(raw: string | undefined): CobranzaItem[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as CobranzaItem[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function mapOpportunity(opp: GhlOpportunity): CobranzaOpportunity | null {
  const diaPagoRaw = readCf(opp, CF_ID.DIA_PAGO);
  const monedaRaw = readCf(opp, CF_ID.MONEDA);
  const diaPago = Number(diaPagoRaw);
  if (!diaPagoRaw || !Number.isFinite(diaPago) || diaPago < 1 || diaPago > 31) return null;
  const moneda = (monedaRaw === 'USD' ? 'USD' : 'COP') as 'COP' | 'USD';
  return {
    ghlOppId: opp.id,
    ghlContactId: opp.contactId,
    name: opp.name,
    status: opp.status,
    stageId: opp.pipelineStageId,
    diaPago,
    monto: Number(readCf(opp, CF_ID.MONTO) ?? opp.monetaryValue ?? 0),
    moneda,
    frecuencia: readCf(opp, CF_ID.FRECUENCIA) ?? 'mensual',
    metodoPago: readCf(opp, CF_ID.METODO_PAGO) ?? '',
    vpsService: readCf(opp, CF_ID.VPS_SERVICE) ?? '',
    autoPausa: (readCf(opp, CF_ID.AUTO_PAUSA) ?? 'NO').toUpperCase() === 'SI',
    items: parseItems(readCf(opp, CF_ID.ITEMS_JSON)),
  };
}

function clienteLabel(contact: CobranzaContact, opp: CobranzaOpportunity): string {
  const full = [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim();
  return full || contact.companyName || opp.name;
}

function dueDateThisMonth(today: Date, dia: number): Date {
  const y = today.getFullYear();
  const m = today.getMonth();
  const lastDay = new Date(y, m + 1, 0).getDate();
  return new Date(y, m, Math.min(Math.max(dia, 1), lastDay));
}

/**
 * Config del emisor + numeración facturas, por GHL contact ID.
 * Blue Box factura Ángela / NU Bank (último N° histórico 73). Yenny y demás: Wilmar / Bancolombia.
 * `startingNumber` es el próximo número a emitir la primera vez.
 */
interface EmisorConfig {
  nombre: string;
  cedula: string;
  direccion: string;
  banco: string;
  tipoCuenta: string;
  numeroCuenta: string;
  startingInvoiceNumber: number;
}

const EMISOR_ANGELA: EmisorConfig = {
  nombre: 'Ángela Patricia García Cruz',
  cedula: '53.131.435',
  direccion: 'Kr 81h sur 75 85 t21 303, Bogotá',
  banco: 'NU BANK',
  tipoCuenta: 'cuenta de ahorros',
  numeroCuenta: '67603830',
  startingInvoiceNumber: 74,
};
const EMISOR_WILMAR: EmisorConfig = {
  nombre: 'Wilmar Rocha Lopez',
  cedula: '1.019.031.051',
  direccion: 'Kr 81h sur 75 85 t21 303, Bogotá',
  banco: 'Bancolombia',
  tipoCuenta: 'cuenta de ahorros',
  numeroCuenta: '662-500-829-92',
  startingInvoiceNumber: 82,
};

const EMISOR_BY_CONTACT: Record<string, EmisorConfig> = {
  l5A8VTC99TnezhoEavBC: EMISOR_ANGELA,   // Blue Box
  oBeqSpBNNU4p9qf1c3tc: EMISOR_WILMAR,   // Yenny
  d0rye43azI3YUZeICelr: EMISOR_WILMAR,   // Classic Metals
  n31rZuLPijvfmVmgMAjo: EMISOR_WILMAR,   // Miami Viral
  SS2P0UTS8lbUIBgZHJ7f: EMISOR_WILMAR,   // Felipe
};

function resolveEmisor(contactId: string): EmisorConfig {
  return EMISOR_BY_CONTACT[contactId] ?? EMISOR_WILMAR;
}

async function computeInvoiceNumber(ghlOppId: string, base: number): Promise<number> {
  // Cuenta envíos T_ZERO previos (mes-a-mes) para este opp -> suma a base.
  const { query } = await import('../../db/connection.js');
  const rows = await query<{ count: string }>(
    `SELECT COUNT(DISTINCT date_trunc('month', sent_at))::text AS count
       FROM cobranza_sends
      WHERE ghl_opp_id = $1
        AND template_id = 'T_ZERO'
        AND status IN ('sent','queued')`,
    [ghlOppId]
  );
  const prior = Number(rows[0]?.count ?? 0);
  return base + prior;
}

/** Procesa una sola opportunity: decide, envía, loguea. */
export async function processOpportunity(
  opp: GhlOpportunity,
  today: Date,
  opts: { dryRun: boolean }
): Promise<{ action: 'sent' | 'skipped-no-decision' | 'skipped-duplicate' | 'skipped-already-paid' | 'skipped-no-email' | 'failed' | 'skipped-dry-run'; templateId?: TemplateId; reason?: string }> {
  const mapped = mapOpportunity(opp);
  if (!mapped) {
    return { action: 'skipped-no-decision', reason: 'no dia_pago custom field' };
  }

  // Skip si el ciclo actual ya está cubierto por un pago
  const ultimoPago = readCf(opp, CF_ID.ULTIMO_PAGO) ?? '';
  const thisCycle = currentCycleYYYYMM(today);
  if (ultimoPago && ultimoPago >= thisCycle) {
    return { action: 'skipped-already-paid', reason: `cubre hasta ${ultimoPago} >= ciclo ${thisCycle}` };
  }

  let decision = computeDecision(today, mapped.diaPago);
  if (!decision) {
    return { action: 'skipped-no-decision', reason: 'no threshold hoy' };
  }

  // Regla de cortesía: si es el primer contacto del ciclo y se caería en T_PAUSA+ directo,
  // bajar a T_ZERO — no tiene sentido mandar "servicio pausado" sin haber mandado la factura.
  const neverSentT0 = !(await alreadySentThisMonth(mapped.ghlOppId, 'T_ZERO'));
  if (neverSentT0 && ['T_PAUSA', 'T_PLUS_30', 'T_PLUS_45'].includes(decision.template)) {
    logger.info(
      { opp: opp.name, originalTemplate: decision.template, newTemplate: 'T_ZERO' },
      'cobranza: downgrading to T_ZERO (primer contacto del ciclo)'
    );
    decision = { ...decision, template: 'T_ZERO', isCritical: false };
  }

  // Evitar duplicados en el mismo mes
  const duplicate = await alreadySentThisMonth(mapped.ghlOppId, decision.template);
  if (duplicate) {
    return { action: 'skipped-duplicate', templateId: decision.template };
  }

  const contact = await getContact(mapped.ghlContactId);
  if (!contact) {
    return { action: 'failed', reason: `contact ${mapped.ghlContactId} not found` };
  }
  if (!contact.email || contact.email.startsWith('pendiente@')) {
    return { action: 'skipped-no-email', reason: 'contact sin email real' };
  }

  const cliente: CobranzaContact = {
    id: contact.id,
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    phone: contact.phone,
    companyName: contact.companyName,
  };
  const nombre = clienteLabel(cliente, mapped);
  const dueDate = dueDateThisMonth(today, mapped.diaPago);
  const msg = renderTemplate(decision.template, {
    clienteNombre: nombre,
    opp: mapped,
    diasAlPago: decision.diasAlPago,
    fechaPagoTexto: formatDate(dueDate),
    fechaHoyTexto: formatDate(today),
    metodoPagoDetalle: mapped.metodoPago || '—',
  });

  // Si es T_ZERO: generar PDF, subir a GHL, obtener URL para adjuntos
  let pdfUrl: string | undefined;
  if (decision.template === 'T_ZERO' && !opts.dryRun) {
    try {
      const emisor = resolveEmisor(mapped.ghlContactId);
      const invoiceNumber = await computeInvoiceNumber(mapped.ghlOppId, emisor.startingInvoiceNumber);
      const buf = await generateCobranzaPdf({
        numeroFactura: String(invoiceNumber),
        fechaFactura: today,
        fechaVencimiento: new Date(dueDate.getTime() + 6 * 86400000), // vencimiento = dueDate + 6d
        cliente: {
          razonSocial: contact.companyName || nombre,
          email: contact.email,
          telefono: contact.phone,
        },
        emisor,
        concepto: `Servicios de marketing digital — ${formatDate(today).split(' de ').slice(1).join(' de ')}`,
        opp: mapped,
      });
      const filename = `CuentaDeCobro_${invoiceNumber}_${(contact.companyName || 'cliente').replace(/\s+/g, '_')}.pdf`;
      const uploaded = await ghlUploadMedia(buf, filename);
      pdfUrl = uploaded.url;
      logger.info({ invoiceNumber, pdfUrl }, 'cobranza: PDF generated + uploaded');
    } catch (err) {
      logger.error({ err }, 'cobranza: PDF generation failed, continuing without attachment');
    }
  }

  if (opts.dryRun) {
    await logSend({
      ghlOppId: mapped.ghlOppId,
      ghlContactId: mapped.ghlContactId,
      clienteNombre: nombre,
      templateId: decision.template,
      channel: 'Email',
      diasAlPago: decision.diasAlPago,
      monto: mapped.monto,
      moneda: mapped.moneda,
      subject: msg.subject,
      body: msg.plain,
      status: 'skipped',
      error: 'DRY_RUN',
    });
    return { action: 'skipped-dry-run', templateId: decision.template };
  }

  try {
    const result = await sendEmail({
      contactId: mapped.ghlContactId,
      subject: msg.subject,
      html: msg.html,
      attachments: pdfUrl ? [pdfUrl] : undefined,
    });
    await logSend({
      ghlOppId: mapped.ghlOppId,
      ghlContactId: mapped.ghlContactId,
      clienteNombre: nombre,
      templateId: decision.template,
      channel: 'Email',
      diasAlPago: decision.diasAlPago,
      monto: mapped.monto,
      moneda: mapped.moneda,
      subject: msg.subject,
      body: msg.plain,
      ghlMessageId: result.messageId,
      ghlConvId: result.conversationId,
      status: 'queued',
    });
    await addContactNote(
      mapped.ghlContactId,
      `[cobranza:${decision.template}] Email enviado · ${formatMoney(mapped.monto, mapped.moneda)} · días ${decision.diasAlPago} · msg ${result.messageId}`
    );

    // Canal paralelo WhatsApp (si habilitado y template tiene binding)
    if (env.COBRANZA_SEND_WHATSAPP && env.WA_ACCESS_TOKEN && contact.phone) {
      const binding = WA_TEMPLATE_BINDINGS[decision.template];
      if (binding) {
        try {
          const emisor = resolveEmisor(mapped.ghlContactId);
          const invoiceNumber = await computeInvoiceNumber(mapped.ghlOppId, emisor.startingInvoiceNumber);
          const waCtx: CobranzaWaContext = {
            clienteNombre: nombre,
            numeroFactura: String(invoiceNumber),
            mesConcepto: formatDate(today).split(' de ').slice(1).join(' de '),
            montoTexto: formatMoney(mapped.monto, mapped.moneda),
            fechaVencimientoTexto: formatDate(dueDate),
            metodoPagoTexto: `${emisor.banco} ${emisor.numeroCuenta}`,
            diasAtraso: Math.max(0, decision.diasAlPago),
            fechaOriginalTexto: formatDate(dueDate),
          };
          const waRes = await waSendTemplate({
            to: contact.phone,
            templateName: binding.templateName,
            bodyVariables: binding.buildVars(waCtx),
            headerDocumentUrl: binding.withDocument ? pdfUrl : undefined,
            headerDocumentFilename: binding.withDocument ? `CuentaDeCobro_${invoiceNumber}.pdf` : undefined,
          });
          await logSend({
            ghlOppId: mapped.ghlOppId,
            ghlContactId: mapped.ghlContactId,
            clienteNombre: nombre,
            templateId: decision.template,
            channel: 'WhatsApp',
            diasAlPago: decision.diasAlPago,
            monto: mapped.monto,
            moneda: mapped.moneda,
            subject: binding.templateName,
            body: binding.buildVars(waCtx).join(' | '),
            ghlMessageId: waRes.messageId,
            status: 'sent',
          });
          logger.info({ waMessageId: waRes.messageId, to: waRes.to }, 'cobranza: WA template sent');
        } catch (err) {
          logger.warn({ err }, 'cobranza: WA send failed (email ya enviado)');
        }
      }
    }

    if (decision.isCritical) {
      await telegramSend(
        `🚨 <b>Cobranza crítica</b>\n<b>${nombre}</b>\nTemplate: <code>${decision.template}</code>\nDías atraso: <b>${decision.diasAlPago}</b>\nMonto: <b>${formatMoney(mapped.monto, mapped.moneda)}</b>\nOpp: <code>${mapped.ghlOppId}</code>`
      ).catch((err) => logger.warn({ err }, 'cobranza: telegram alert failed'));
    }
    return { action: 'sent', templateId: decision.template };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logSend({
      ghlOppId: mapped.ghlOppId,
      ghlContactId: mapped.ghlContactId,
      clienteNombre: nombre,
      templateId: decision.template,
      channel: 'Email',
      diasAlPago: decision.diasAlPago,
      monto: mapped.monto,
      moneda: mapped.moneda,
      subject: msg.subject,
      body: msg.plain,
      status: 'failed',
      error: message,
    });
    return { action: 'failed', templateId: decision.template, reason: message };
  }
}

/** Corre el engine contra todo el pipeline. dryRun=true no envía email, solo loguea. */
export async function runCobranza(opts: { dryRun?: boolean; today?: Date } = {}): Promise<{
  total: number;
  sent: number;
  skipped: number;
  failed: number;
  details: Array<{ opp: string; action: string; template?: string; reason?: string }>;
}> {
  const dryRun = opts.dryRun ?? env.COBRANZA_DRY_RUN;
  const today = opts.today ?? new Date();
  const opps = await listOpportunitiesInPipeline(env.GHL_PIPELINE_ID);
  logger.info({ count: opps.length, dryRun }, 'cobranza: run started');

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const details: Array<{ opp: string; action: string; template?: string; reason?: string }> = [];

  for (const opp of opps) {
    const res = await processOpportunity(opp, today, { dryRun });
    details.push({ opp: opp.name, action: res.action, template: res.templateId, reason: res.reason });
    if (res.action === 'sent') sent++;
    else if (res.action === 'failed') failed++;
    else skipped++;
    logger.info({ opp: opp.name, ...res }, 'cobranza: opp processed');
  }

  const summary = { total: opps.length, sent, skipped, failed };
  logger.info(summary, 'cobranza: run completed');

  // Daily digest a Wilmar por Telegram
  if (!dryRun && (sent > 0 || failed > 0)) {
    const lines = [
      `📬 <b>Cobranza diaria</b> · ${formatDate(today)}`,
      `Total opps: ${opps.length} · Enviados: <b>${sent}</b> · Skipped: ${skipped} · Failed: ${failed}`,
      '',
      ...details
        .filter((d) => d.action === 'sent' || d.action === 'failed')
        .map((d) => `• ${d.opp} → <code>${d.template ?? '-'}</code> (${d.action}${d.reason ? ': ' + d.reason : ''})`),
    ];
    await telegramSend(lines.join('\n')).catch((err) =>
      logger.warn({ err }, 'cobranza: telegram digest failed')
    );
  }

  return { ...summary, details };
}
