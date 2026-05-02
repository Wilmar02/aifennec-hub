import { env } from '../../infra/env.js';
import { logger } from '../../infra/logger.js';
import { fetchCreditos, getOwnerUserId } from './supabase.js';
import { getMonthOverview, TIER_EMOJI } from './budget-status.js';

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
  const userId = await getOwnerUserId();
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
  const userId = await getOwnerUserId();
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

/**
 * Job diario (8 PM Bogotá): resumen del día y del mes corriente.
 * Pensado para "conciencia financiera" pasiva — un solo mensaje al cierre.
 *
 * Solo se manda al OWNER (TELEGRAM_DIGEST_CHAT_ID). Si los datos están
 * compartidos con esposa, ella ve el mensaje porque comparten chat o
 * Wilmar lo comenta. Multi-recipient queda para futuro.
 *
 * Si no hubo movimientos en el día Y el mes va dentro de presupuesto,
 * NO mandamos nada para no agregar ruido.
 */
export async function runResumenDiario(): Promise<void> {
  const userId = await getOwnerUserId();
  if (!userId) {
    logger.warn('resumen-diario: no userId for owner, skip');
    return;
  }

  const overview = await getMonthOverview(userId);

  // Para MVP mostramos el estado del mes (no detalle "hoy"). El detalle de hoy
  // queda como v2 — requiere una query adicional con filtro fecha=eq.hoy.

  const lines: string[] = [];
  lines.push('<b>🌙 Cierre del día</b>');
  lines.push('');

  if (overview.totalBudget > 0) {
    const pct = Math.round(overview.pct);
    lines.push(`${TIER_EMOJI[overview.tier]} <b>Mes va:</b> ${formatMoney(overview.totalSpent)} de ${formatMoney(overview.totalBudget)} (${pct}%)`);
    lines.push(`📅 Día ${overview.daysInMonth - overview.daysRemaining + 1}/${overview.daysInMonth}`);
  } else {
    lines.push(`<b>Mes va:</b> ${formatMoney(overview.totalSpent)} en gastos (sin presupuesto seteado)`);
  }

  // Top 3 categorías más cargadas (con presupuesto)
  const top = overview.categories.filter(c => c.budget > 0).slice(0, 3);
  if (top.length > 0) {
    lines.push('');
    lines.push('<b>Top categorías:</b>');
    for (const c of top) {
      const pct = Math.round(c.pct);
      lines.push(`${TIER_EMOJI[c.tier]} ${esc(c.categoria)} · ${formatMoney(c.spent)} de ${formatMoney(c.budget)} (${pct}%)`);
    }
  }

  // Insight: cuánto pueden gastar al día sin pasarse
  if (overview.totalBudget > 0 && overview.totalBudget - overview.totalSpent > 0) {
    const sustainable = (overview.totalBudget - overview.totalSpent) / overview.daysRemaining;
    lines.push('');
    lines.push(`💡 Para terminar el mes en azul: ${formatMoney(sustainable)}/día (${overview.daysRemaining} día${overview.daysRemaining === 1 ? '' : 's'} restantes).`);
  } else if (overview.totalBudget > 0) {
    const over = overview.totalSpent - overview.totalBudget;
    lines.push('');
    lines.push(`⚠️ Mes excedido por ${formatMoney(over)}.`);
  }

  await sendTelegramHTML(env.TELEGRAM_DIGEST_CHAT_ID, lines.join('\n'));
  logger.info({ yyyymm: overview.yyyymm, totalSpent: overview.totalSpent, pct: overview.pct }, 'resumen-diario: enviado');
}
