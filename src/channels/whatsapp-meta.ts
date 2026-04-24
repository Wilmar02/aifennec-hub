import { readFile } from 'fs/promises';
import { basename } from 'path';
import { env } from '../infra/env.js';
import { logger } from '../infra/logger.js';

const BASE = (): string =>
  `https://graph.facebook.com/${env.WA_GRAPH_VERSION}`;

function headers(): Record<string, string> {
  if (!env.WA_ACCESS_TOKEN) {
    throw new Error('whatsapp-meta: WA_ACCESS_TOKEN not configured');
  }
  return {
    Authorization: `Bearer ${env.WA_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

async function jsonRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE()}${path}`, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    logger.error({ status: res.status, path, text: text.slice(0, 500) }, 'whatsapp-meta: request failed');
    throw new Error(`WA Meta ${method} ${path} failed: ${res.status} ${text.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

/** Sube un archivo (PDF, imagen) a /{phone_number_id}/media y retorna media_id (válido 30 días). */
export async function uploadMedia(filePath: string, mimeType: string): Promise<string> {
  const buf = await readFile(filePath);
  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('type', mimeType);
  form.append(
    'file',
    new Blob([new Uint8Array(buf)], { type: mimeType }),
    basename(filePath)
  );
  const res = await fetch(`${BASE()}/${env.WA_PHONE_NUMBER_ID}/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.WA_ACCESS_TOKEN}` },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WA Meta upload failed: ${res.status} ${text.slice(0, 300)}`);
  }
  const data = (await res.json()) as { id: string };
  logger.info({ mediaId: data.id, filePath }, 'whatsapp-meta: media uploaded');
  return data.id;
}

export interface SendTemplateInput {
  to: string;                    // E.164 sin '+' (ej 573004046740)
  templateName: string;
  languageCode?: string;         // default 'es'
  bodyVariables: string[];       // {{1}}, {{2}}, ... en orden
  headerDocumentMediaId?: string; // media_id si se subió antes a /{phone_id}/media
  headerDocumentUrl?: string;     // o URL pública (GHL filesafe.space URL sirve)
  headerDocumentFilename?: string;
}

export interface SendTemplateResult {
  messageId: string;
  to: string;
}

export async function sendTemplate(input: SendTemplateInput): Promise<SendTemplateResult> {
  const components: Array<Record<string, unknown>> = [];
  if (input.headerDocumentMediaId || input.headerDocumentUrl) {
    const doc: Record<string, unknown> = {
      filename: input.headerDocumentFilename ?? 'cuenta_de_cobro.pdf',
    };
    if (input.headerDocumentMediaId) doc.id = input.headerDocumentMediaId;
    else if (input.headerDocumentUrl) doc.link = input.headerDocumentUrl;
    components.push({
      type: 'header',
      parameters: [{ type: 'document', document: doc }],
    });
  }
  if (input.bodyVariables.length > 0) {
    components.push({
      type: 'body',
      parameters: input.bodyVariables.map((v) => ({ type: 'text', text: v })),
    });
  }

  const body = {
    messaging_product: 'whatsapp',
    to: input.to.replace(/^\+/, ''),
    type: 'template',
    template: {
      name: input.templateName,
      language: { code: input.languageCode ?? 'es' },
      ...(components.length > 0 ? { components } : {}),
    },
  };

  const res = await jsonRequest<{ messages: Array<{ id: string }> }>(
    'POST',
    `/${env.WA_PHONE_NUMBER_ID}/messages`,
    body
  );
  const messageId = res.messages?.[0]?.id ?? '';
  return { messageId, to: body.to };
}

/** Texto libre (solo dentro de ventana 24h tras respuesta del cliente). */
export async function sendText(to: string, text: string): Promise<SendTemplateResult> {
  const body = {
    messaging_product: 'whatsapp',
    to: to.replace(/^\+/, ''),
    type: 'text',
    text: { preview_url: false, body: text },
  };
  const res = await jsonRequest<{ messages: Array<{ id: string }> }>(
    'POST',
    `/${env.WA_PHONE_NUMBER_ID}/messages`,
    body
  );
  return { messageId: res.messages?.[0]?.id ?? '', to: body.to };
}

/** Mapping: template cobranza id -> nombre plantilla Meta + builder de variables. */
export interface CobranzaWaTemplateBinding {
  templateName: string;
  /** Construye el array de variables {{1}}..{{n}} en orden. */
  buildVars: (ctx: CobranzaWaContext) => string[];
  /** Si usa header DOCUMENT (adjunta el PDF de la cuenta). */
  withDocument: boolean;
}

export interface CobranzaWaContext {
  clienteNombre: string;
  numeroFactura: string;           // ej "74"
  mesConcepto: string;             // ej "abril 2026"
  montoTexto: string;              // ej "$4.900.000 COP"
  fechaVencimientoTexto: string;   // ej "30 de abril de 2026"
  metodoPagoTexto: string;         // ej "Transferencia NU Bank 67603830"
  diasAtraso: number;              // positivo
  fechaOriginalTexto: string;      // fecha esperada
}

export const WA_TEMPLATE_BINDINGS: Record<string, CobranzaWaTemplateBinding> = {
  T_MINUS_3: {
    templateName: 'aifennec_cobranza_previo',
    withDocument: false,
    buildVars: (c) => [c.clienteNombre, c.fechaVencimientoTexto, c.montoTexto, c.metodoPagoTexto],
  },
  T_ZERO: {
    templateName: 'aifennec_cobranza_dia',
    withDocument: true,
    buildVars: (c) => [
      c.clienteNombre,
      c.numeroFactura,
      c.mesConcepto,
      c.montoTexto,
      c.fechaVencimientoTexto,
      c.metodoPagoTexto,
    ],
  },
  T_PLUS_3: {
    templateName: 'aifennec_cobranza_seguimiento',
    withDocument: false,
    buildVars: (c) => [c.clienteNombre, c.fechaOriginalTexto, String(c.diasAtraso), c.montoTexto],
  },
  T_PLUS_7: {
    templateName: 'aifennec_cobranza_seguimiento',
    withDocument: false,
    buildVars: (c) => [c.clienteNombre, c.fechaOriginalTexto, String(c.diasAtraso), c.montoTexto],
  },
  T_PLUS_11: {
    templateName: 'aifennec_cobranza_urgente',
    withDocument: false,
    buildVars: (c) => [c.clienteNombre, c.montoTexto],
  },
  T_PAUSA: {
    templateName: 'aifennec_cobranza_pausa',
    withDocument: false,
    buildVars: (c) => [c.clienteNombre, String(c.diasAtraso), c.montoTexto],
  },
};
