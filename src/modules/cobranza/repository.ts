import { query } from '../../db/connection.js';
import type { TemplateId } from './types.js';

export interface CobranzaSendRow {
  id: number;
  ghl_opp_id: string;
  ghl_contact_id: string;
  cliente_nombre: string;
  template_id: string;
  channel: string;
  dias_al_pago: number;
  monto: number | null;
  moneda: string | null;
  subject: string | null;
  body: string | null;
  ghl_message_id: string | null;
  ghl_conv_id: string | null;
  status: string;
  error: string | null;
  sent_at: string;
}

export interface LogSendInput {
  ghlOppId: string;
  ghlContactId: string;
  clienteNombre: string;
  templateId: TemplateId;
  channel: 'Email' | 'SMS' | 'WhatsApp' | 'Telegram' | 'manual';
  diasAlPago: number;
  monto: number;
  moneda: string;
  subject?: string;
  body?: string;
  ghlMessageId?: string;
  ghlConvId?: string;
  status: 'sent' | 'queued' | 'failed' | 'skipped';
  error?: string;
}

export interface LastSendRecord {
  template: TemplateId;
  sentAt: Date;
}

/**
 * Última plantilla enviada para esta opp dentro de la ventana de N días
 * (usado para escalation gating — limita "regreso al inicio" entre ciclos).
 */
export async function getLastSentInWindow(
  ghlOppId: string,
  windowDays = 35
): Promise<LastSendRecord | null> {
  const rows = await query<{ template_id: string; sent_at: string }>(
    `SELECT template_id, sent_at
       FROM cobranza_sends
      WHERE ghl_opp_id = $1
        AND status IN ('sent','queued')
        AND sent_at >= now() - ($2 || ' days')::interval
      ORDER BY sent_at DESC
      LIMIT 1`,
    [ghlOppId, String(windowDays)]
  );
  if (rows.length === 0) return null;
  return { template: rows[0]!.template_id as TemplateId, sentAt: new Date(rows[0]!.sent_at) };
}

/** ¿Ya se envió este template para esta opp en el mes actual? (evita duplicados) */
export async function alreadySentThisMonth(
  ghlOppId: string,
  templateId: TemplateId
): Promise<boolean> {
  const rows = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM cobranza_sends
     WHERE ghl_opp_id = $1
       AND template_id = $2
       AND status IN ('sent','queued')
       AND sent_at >= date_trunc('month', now())`,
    [ghlOppId, templateId]
  );
  return Number(rows[0]?.count ?? 0) > 0;
}

export async function logSend(input: LogSendInput): Promise<number> {
  const rows = await query<{ id: number }>(
    `INSERT INTO cobranza_sends
       (ghl_opp_id, ghl_contact_id, cliente_nombre, template_id, channel,
        dias_al_pago, monto, moneda, subject, body, ghl_message_id, ghl_conv_id,
        status, error)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING id`,
    [
      input.ghlOppId,
      input.ghlContactId,
      input.clienteNombre,
      input.templateId,
      input.channel,
      input.diasAlPago,
      input.monto,
      input.moneda,
      input.subject ?? null,
      input.body ?? null,
      input.ghlMessageId ?? null,
      input.ghlConvId ?? null,
      input.status,
      input.error ?? null,
    ]
  );
  return rows[0]!.id;
}
