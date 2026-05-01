import { env } from '../../infra/env.js';
import { logger } from '../../infra/logger.js';
import { fetchCreditos, resolveUserId } from './supabase.js';

function formatMoney(n: number): string {
  return `$${new Intl.NumberFormat('es-CO').format(Math.round(n))}`;
}

function esc(s: string | number | null | undefined): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Calcula el día del mes en que vence la cuota a partir de fecha_apertura. */
function diaPagoFromApertura(fechaApertura: string | null): number | null {
  if (!fechaApertura) return null;
  const d = new Date(fechaApertura);
  if (isNaN(d.getTime())) return null;
  return d.getUTCDate();
}

async function sendTelegramHTML(chatId: string, text: string): Promise<void> {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Telegram sendMessage failed ${res.status}: ${errText.slice(0, 200)}`);
  }
}

/**
 * Job mensual (día 1, 8 AM Bogotá): resumen de las cuotas que vencen este mes.
 */
export async function runCuotasResumenMensual(): Promise<void> {
  const ownerTgId = Number(env.TELEGRAM_DIGEST_CHAT_ID);
  const userId = await resolveUserId(ownerTgId);
  if (!userId) {
    logger.warn('cuotas-cron: no userId for owner');
    return;
  }
  const creditos = await fetchCreditos(userId);
  if (creditos.length === 0) {
    logger.info('cuotas-cron: sin créditos vivos, skip');
    return;
  }

  const ahora = new Date();
  const mes = ahora.toLocaleDateString('es-CO', { month: 'long', year: 'numeric', timeZone: 'America/Bogota' });

  let totalCuota = 0;
  const lines: string[] = [`<b>📅 Cuotas de ${esc(mes)}</b>`, ''];

  // Ordenar por día de pago ascendente
  const enriched = creditos
    .map(c => ({ c, dia: diaPagoFromApertura(c.fecha_apertura) }))
    .sort((a, b) => (a.dia ?? 99) - (b.dia ?? 99));

  for (const { c, dia } of enriched) {
    if (!c.cuota_mensual) continue;
    totalCuota += Number(c.cuota_mensual);
    const diaTxt = dia != null ? `día ${dia}` : 'fecha por definir';
    lines.push(`<b>${esc(c.nombre)}</b>`);
    lines.push(`💸 ${formatMoney(c.cuota_mensual)} · vence ${diaTxt}`);
    lines.push(`Saldo actual: ${formatMoney(c.saldo_actual)}`);
    lines.push('');
  }

  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push(`💰 <b>Total cuotas/mes:</b> ${formatMoney(totalCuota)}`);
  lines.push('');
  lines.push('Usá /deudas para ver detalle de cada crédito.');

  await sendTelegramHTML(env.TELEGRAM_DIGEST_CHAT_ID, lines.join('\n'));
  logger.info({ creditos: creditos.length, totalCuota }, 'cuotas-cron: resumen mensual enviado');
}

/**
 * Job diario (8 AM Bogotá): recordatorio si hay cuota que vence en 3 días.
 */
export async function runCuotasRecordatorioDiario(): Promise<void> {
  const ownerTgId = Number(env.TELEGRAM_DIGEST_CHAT_ID);
  const userId = await resolveUserId(ownerTgId);
  if (!userId) return;
  const creditos = await fetchCreditos(userId);
  if (creditos.length === 0) return;

  const hoy = new Date();
  // Día actual en Bogotá
  const diaHoyBogota = Number(
    new Intl.DateTimeFormat('es-CO', { day: 'numeric', timeZone: 'America/Bogota' }).format(hoy)
  );

  const proximas: { c: typeof creditos[0]; dia: number; diasRestantes: number }[] = [];
  for (const c of creditos) {
    const dia = diaPagoFromApertura(c.fecha_apertura);
    if (dia == null || !c.cuota_mensual) continue;
    let diasRestantes = dia - diaHoyBogota;
    // Si ya pasó este mes, calcular para el próximo
    if (diasRestantes < 0) {
      // Próximo mes — días restantes hasta fin de mes + dia del próximo mes
      const ultimoDiaDelMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
      diasRestantes = (ultimoDiaDelMes - diaHoyBogota) + dia;
    }
    if (diasRestantes === 3) {
      proximas.push({ c, dia, diasRestantes });
    }
  }

  if (proximas.length === 0) return;

  const lines: string[] = ['<b>⏰ Recordatorio de cuota</b>', ''];
  for (const { c, dia, diasRestantes } of proximas) {
    lines.push(`<b>${esc(c.nombre)}</b>`);
    lines.push(`💸 ${formatMoney(c.cuota_mensual!)} · vence en ${diasRestantes} días (día ${dia})`);
    lines.push('');
  }
  lines.push('Pagá antes para evitar mora 🤝');

  await sendTelegramHTML(env.TELEGRAM_DIGEST_CHAT_ID, lines.join('\n'));
  logger.info({ count: proximas.length }, 'cuotas-cron: recordatorio enviado');
}
