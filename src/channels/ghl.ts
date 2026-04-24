import { env } from '../infra/env.js';
import { logger } from '../infra/logger.js';

const BASE = 'https://services.leadconnectorhq.com';
const H = (): Record<string, string> => ({
  Authorization: `Bearer ${env.GHL_TOKEN}`,
  Version: '2021-07-28',
  'Content-Type': 'application/json',
});

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: H(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    logger.error({ status: res.status, path, text: text.slice(0, 500) }, 'ghl: request failed');
    throw new Error(`GHL ${method} ${path} failed: ${res.status} ${text.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

export interface GhlCustomFieldValue {
  id: string;
  fieldValueString?: string;
  fieldValue?: string | number | boolean;
}

export interface GhlOpportunity {
  id: string;
  name: string;
  pipelineId: string;
  pipelineStageId: string;
  status: string;
  contactId: string;
  monetaryValue?: number;
  customFields?: GhlCustomFieldValue[];
}

export interface GhlContact {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  companyName?: string;
}

export async function listOpportunitiesInPipeline(pipelineId: string): Promise<GhlOpportunity[]> {
  const all: GhlOpportunity[] = [];
  let page = 1;
  for (;;) {
    const res = await request<{ opportunities: GhlOpportunity[]; meta?: { total?: number } }>(
      'GET',
      `/opportunities/search?location_id=${env.GHL_LOCATION_ID}&pipeline_id=${pipelineId}&limit=100&page=${page}`
    );
    const batch = res.opportunities ?? [];
    all.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }
  return all;
}

export async function getContact(contactId: string): Promise<GhlContact | null> {
  const res = await request<{ contact: GhlContact }>('GET', `/contacts/${contactId}`);
  return res.contact ?? null;
}

export interface SendEmailInput {
  contactId: string;
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: string[]; // URLs públicas (p.ej. filesafe.space de GHL media)
}

export interface SendEmailResult {
  conversationId: string;
  messageId: string;
  emailMessageId?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const body: Record<string, unknown> = {
    type: 'Email',
    contactId: input.contactId,
    subject: input.subject,
    html: input.html,
  };
  if (input.replyTo) body.replyTo = input.replyTo;
  if (input.attachments && input.attachments.length > 0) body.attachments = input.attachments;
  const res = await request<{ conversationId: string; messageId: string; emailMessageId?: string }>(
    'POST',
    '/conversations/messages',
    body
  );
  return res;
}

export async function addContactNote(contactId: string, note: string): Promise<void> {
  await request('POST', `/contacts/${contactId}/notes`, { body: note, userId: '' });
}

/** Sube un archivo al storage de la location (filesafe.space). Retorna URL pública. */
export async function uploadMedia(
  fileBuffer: Buffer,
  filename: string,
  mimeType = 'application/pdf'
): Promise<{ fileId: string; url: string }> {
  const form = new FormData();
  form.append('name', filename);
  form.append('hosted', 'false');
  form.append('file', new Blob([new Uint8Array(fileBuffer)], { type: mimeType }), filename);
  const res = await fetch(`${BASE}/medias/upload-file`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GHL_TOKEN}`,
      Version: '2021-07-28',
    },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GHL uploadMedia failed: ${res.status} ${text.slice(0, 300)}`);
  }
  const data = (await res.json()) as { fileId: string; url: string };
  logger.info({ fileId: data.fileId, filename }, 'ghl: media uploaded');
  return data;
}
