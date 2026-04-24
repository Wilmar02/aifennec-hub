import type { Bot, Context } from 'grammy';
import { InlineKeyboard } from 'grammy';
import { env } from '../../infra/env.js';
import { logger } from '../../infra/logger.js';
import { query } from '../../db/connection.js';

const GHL_BASE = 'https://services.leadconnectorhq.com';

/** Aliases cortos → GHL opportunity ID. */
const CLIENT_ALIASES: Record<string, { oppId: string; label: string }> = {
  bluebox:          { oppId: 'WxXF6LrTcj3xGNsbTa7m', label: 'Blue Box' },
  'blue-box':       { oppId: 'WxXF6LrTcj3xGNsbTa7m', label: 'Blue Box' },
  yenny:            { oppId: 'MCVaO3cXzNAdKyEkSN0l', label: 'Yenny' },
  'yenny-bio':      { oppId: 'MCVaO3cXzNAdKyEkSN0l', label: 'Yenny' },
  classic:          { oppId: 'Zh5ex8Z2xhuNOlyPcpW1', label: 'Classic Metals' },
  'classic-metals': { oppId: 'Zh5ex8Z2xhuNOlyPcpW1', label: 'Classic Metals' },
  miami:            { oppId: 'GiHTWtM83pUwuruHJ9im', label: 'Miami Viral' },
  'miami-viral':    { oppId: 'GiHTWtM83pUwuruHJ9im', label: 'Miami Viral' },
  felipe:           { oppId: 'pu27sDGbViNwdF9M1XXe', label: 'Felipe (Riva Group)' },
  riva:             { oppId: 'pu27sDGbViNwdF9M1XXe', label: 'Felipe (Riva Group)' },
};

const CF_MONTO = '9K5H7X9M9nTXAuyJVHdY';
const CF_DIA_PAGO = 'V4XZRHf9i71vODEshfyH';
const CF_ULTIMO_PAGO = 'JDnqILhK43XhKMJBOVZ1';

function isAuthorized(ctx: Context): boolean {
  const expected = env.TELEGRAM_DIGEST_CHAT_ID;
  return String(ctx.chat?.id ?? '') === String(expected);
}

function ghlHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${env.GHL_TOKEN ?? ''}`,
    Version: '2021-07-28',
    'Content-Type': 'application/json; charset=utf-8',
  };
}

interface OppSnapshot {
  id: string;
  name: string;
  contactId: string;
  monto: number;
  diaPago: number;
  ultimoPagoCubreHasta: string;
}

async function fetchOpp(oppId: string): Promise<OppSnapshot | null> {
  const res = await fetch(`${GHL_BASE}/opportunities/${oppId}`, { headers: ghlHeaders() });
  if (!res.ok) return null;
  const raw = (await res.json()) as { opportunity?: Record<string, unknown> };
  const o = (raw.opportunity ?? raw) as Record<string, unknown>;
  const cfs = ((o.customFields ?? []) as Array<{ id: string; fieldValue?: unknown }>);
  const byId = Object.fromEntries(cfs.map((c) => [c.id, c.fieldValue]));
  return {
    id: o.id as string,
    name: o.name as string,
    contactId: o.contactId as string,
    monto: Number(byId[CF_MONTO] ?? (o.monetaryValue as number) ?? 0),
    diaPago: Number(byId[CF_DIA_PAGO] ?? 0),
    ultimoPagoCubreHasta: String(byId[CF_ULTIMO_PAGO] ?? ''),
  };
}

async function updateUltimoPago(oppId: string, cubreHasta: string): Promise<void> {
  const body = {
    customFields: [
      { id: CF_ULTIMO_PAGO, key: 'ultimo_pago_cubre_hasta', field_value: cubreHasta },
    ],
  };
  const res = await fetch(`${GHL_BASE}/opportunities/${oppId}`, {
    method: 'PUT',
    headers: ghlHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GHL update failed: ${res.status} ${text.slice(0, 200)}`);
  }
}

async function addContactNote(contactId: string, note: string): Promise<void> {
  await fetch(`${GHL_BASE}/contacts/${contactId}/notes`, {
    method: 'POST',
    headers: ghlHeaders(),
    body: JSON.stringify({ body: note, userId: '' }),
  });
}

function formatMoney(n: number): string {
  return `$${new Intl.NumberFormat('es-CO').format(Math.round(n))}`;
}

function nextMonth(yyyymm: string): string {
  const [y, m] = yyyymm.split('-').map(Number);
  if (!y || !m) return yyyymm;
  const nm = m === 12 ? 1 : m + 1;
  const ny = m === 12 ? y + 1 : y;
  return `${ny}-${String(nm).padStart(2, '0')}`;
}

function currentCycleYYYYMM(today: Date): string {
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
}

function resolveAlias(arg: string | undefined): { oppId: string; label: string } | null {
  if (!arg) return null;
  return CLIENT_ALIASES[arg.toLowerCase()] ?? null;
}

function aliasList(): string {
  const seen = new Set<string>();
  const rows: string[] = [];
  for (const [k, v] of Object.entries(CLIENT_ALIASES)) {
    if (seen.has(v.oppId)) continue;
    seen.add(v.oppId);
    rows.push(`<code>${k}</code> — ${v.label}`);
  }
  return rows.join('\n');
}

export function registerCobranzaCommands(bot: Bot): void {
  bot.command('start', async (ctx) => {
    if (!isAuthorized(ctx)) return;
    await ctx.reply(
      [
        '<b>Aifennec Cobranza Bot</b>',
        '',
        '<b>Comandos:</b>',
        '<code>/pago &lt;alias&gt;</code> — marca pago del ciclo actual (pregunta confirmación)',
        '<code>/pago &lt;alias&gt; &lt;YYYY-MM&gt;</code> — marca directo el mes cubierto',
        '<code>/estado</code> — tabla con estado de todos los clientes',
        '<code>/pendientes</code> — solo clientes que deben ahora',
        '<code>/pagos</code> — últimos 10 envíos de cobranza',
        '',
        '<b>Aliases válidos:</b>',
        aliasList(),
      ].join('\n'),
      { parse_mode: 'HTML' }
    );
  });

  bot.command('pago', async (ctx) => {
    if (!isAuthorized(ctx)) return;
    const argsText = (ctx.match ?? '').toString().trim();
    const parts = argsText.split(/\s+/).filter(Boolean);
    const alias = parts[0];
    const cubreHastaArg = parts[1];
    const resolved = resolveAlias(alias);
    if (!resolved) {
      await ctx.reply(
        `❌ alias inválido. Usa uno de:\n${aliasList()}`,
        { parse_mode: 'HTML' }
      );
      return;
    }
    const opp = await fetchOpp(resolved.oppId);
    if (!opp) {
      await ctx.reply(`❌ No pude leer la opp de ${resolved.label}`);
      return;
    }

    if (cubreHastaArg && /^\d{4}-\d{2}$/.test(cubreHastaArg)) {
      // Directo sin confirmación
      await updateUltimoPago(resolved.oppId, cubreHastaArg);
      await addContactNote(
        opp.contactId,
        `[cobranza:pago] Marcado pagado. Cubre hasta ${cubreHastaArg}. Monto ${formatMoney(opp.monto)}. Registrado via Telegram.`
      );
      await ctx.reply(
        `✅ <b>${resolved.label}</b>\n` +
          `Pago registrado. Cubre hasta <b>${cubreHastaArg}</b>.\n` +
          `Monto: ${formatMoney(opp.monto)}\n` +
          `Próximo ciclo: ${nextMonth(cubreHastaArg)}-01`,
        { parse_mode: 'HTML' }
      );
      return;
    }

    // Pregunta confirmación con keyboard
    const today = new Date();
    const suggested = currentCycleYYYYMM(today);
    const keyboard = new InlineKeyboard()
      .text('✅ Confirmar', `pago:${resolved.oppId}:${suggested}`)
      .text('❌ Cancelar', 'pago:cancel');
    await ctx.reply(
      `¿Registrar pago de <b>${resolved.label}</b>?\n\n` +
        `Monto: <b>${formatMoney(opp.monto)}</b>\n` +
        `Cubre hasta: <b>${suggested}</b>\n` +
        `Actualmente: ${opp.ultimoPagoCubreHasta || '(sin registro)'}`,
      { parse_mode: 'HTML', reply_markup: keyboard }
    );
  });

  bot.callbackQuery(/^pago:(cancel|[^:]+):?(.*)?$/, async (ctx) => {
    if (!isAuthorized(ctx)) return;
    const match = ctx.match as RegExpMatchArray;
    const first = match[1];
    if (first === 'cancel') {
      await ctx.answerCallbackQuery('Cancelado');
      await ctx.editMessageText('❌ Cancelado.');
      return;
    }
    const oppId = first;
    const cubreHasta = match[2] ?? '';
    if (!oppId || !cubreHasta) {
      await ctx.answerCallbackQuery('Callback inválido');
      return;
    }
    const opp = await fetchOpp(oppId);
    const label = Object.values(CLIENT_ALIASES).find((v) => v.oppId === oppId)?.label ?? 'cliente';
    try {
      await updateUltimoPago(oppId, cubreHasta);
      if (opp?.contactId) {
        await addContactNote(
          opp.contactId,
          `[cobranza:pago] Marcado pagado. Cubre hasta ${cubreHasta}. Monto ${formatMoney(opp?.monto ?? 0)}. Registrado via Telegram.`
        );
      }
      await ctx.answerCallbackQuery('Registrado');
      await ctx.editMessageText(
        `✅ <b>${label}</b>\n` +
          `Pago registrado. Cubre hasta <b>${cubreHasta}</b>.\n` +
          `Próximo ciclo: ${nextMonth(cubreHasta)}-01`,
        { parse_mode: 'HTML' }
      );
    } catch (err) {
      logger.error({ err }, 'cobranza: /pago callback failed');
      await ctx.answerCallbackQuery('Error — ver logs');
      await ctx.editMessageText(`❌ Error actualizando ${label}. Revisa logs.`);
    }
  });

  bot.command('estado', async (ctx) => {
    if (!isAuthorized(ctx)) return;
    const unique = Array.from(new Set(Object.values(CLIENT_ALIASES).map((v) => v.oppId)));
    const today = new Date();
    const currentCycle = currentCycleYYYYMM(today);
    const rows: string[] = ['<b>Estado cobranza</b>', ''];
    rows.push(`<code>Cliente          Día  Cubre    Debe ciclo</code>`);
    for (const oppId of unique) {
      const opp = await fetchOpp(oppId);
      if (!opp) continue;
      const label = Object.values(CLIENT_ALIASES).find((v) => v.oppId === oppId)?.label ?? '?';
      const cubre = opp.ultimoPagoCubreHasta || '—';
      const debe = cubre && cubre < currentCycle ? '🔴 sí' : '✅ no';
      rows.push(
        `<code>${label.padEnd(16).slice(0, 16)} ${String(opp.diaPago).padEnd(4)} ${cubre.padEnd(8)} ${debe}</code>`
      );
    }
    await ctx.reply(rows.join('\n'), { parse_mode: 'HTML' });
  });

  bot.command('pendientes', async (ctx) => {
    if (!isAuthorized(ctx)) return;
    const unique = Array.from(new Set(Object.values(CLIENT_ALIASES).map((v) => v.oppId)));
    const currentCycle = currentCycleYYYYMM(new Date());
    const rows: string[] = [];
    for (const oppId of unique) {
      const opp = await fetchOpp(oppId);
      if (!opp) continue;
      const label = Object.values(CLIENT_ALIASES).find((v) => v.oppId === oppId)?.label ?? '?';
      const cubre = opp.ultimoPagoCubreHasta;
      if (!cubre || cubre < currentCycle) {
        rows.push(`🔴 <b>${label}</b> — ${formatMoney(opp.monto)} · cubre ${cubre || '(nunca)'} · debe ${currentCycle}`);
      }
    }
    if (rows.length === 0) {
      await ctx.reply('✅ Nadie debe ahora — todos al día para ' + currentCycle);
    } else {
      await ctx.reply(['<b>Pendientes hoy:</b>', '', ...rows].join('\n'), { parse_mode: 'HTML' });
    }
  });

  bot.command('pagos', async (ctx) => {
    if (!isAuthorized(ctx)) return;
    try {
      const rows = await query<{ cliente_nombre: string; template_id: string; channel: string; monto: number; moneda: string; sent_at: string }>(
        `SELECT cliente_nombre, template_id, channel, monto, moneda, sent_at
           FROM cobranza_sends
          WHERE status IN ('sent','queued')
          ORDER BY sent_at DESC
          LIMIT 10`
      );
      if (rows.length === 0) {
        await ctx.reply('Sin envíos de cobranza aún.');
        return;
      }
      const lines = rows.map((r) => {
        const d = new Date(r.sent_at);
        const date = d.toISOString().slice(0, 10);
        return `${date} · <b>${r.cliente_nombre}</b> · <code>${r.template_id}</code> · ${r.channel} · ${formatMoney(r.monto)} ${r.moneda}`;
      });
      await ctx.reply(['<b>Últimos 10 envíos:</b>', '', ...lines].join('\n'), { parse_mode: 'HTML' });
    } catch (err) {
      logger.error({ err }, 'cobranza: /pagos failed');
      await ctx.reply('❌ Error leyendo historial.');
    }
  });
}
