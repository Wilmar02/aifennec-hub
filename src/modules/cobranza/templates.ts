import type { CobranzaItem, CobranzaOpportunity, TemplateId } from './types.js';

export interface TemplateContext {
  clienteNombre: string;
  opp: CobranzaOpportunity;
  diasAlPago: number;     // negativo = faltan, positivo = atraso
  fechaPagoTexto: string; // "15 de mayo de 2026"
  fechaHoyTexto: string;  // "24 de abril de 2026"
  metodoPagoDetalle: string;
}

export interface RenderedMessage {
  subject: string;
  html: string;
  plain: string;
}

const MES = [
  'enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre',
];

export function formatDate(d: Date): string {
  return `${d.getDate()} de ${MES[d.getMonth()]} de ${d.getFullYear()}`;
}

export function formatMoney(monto: number, moneda: string): string {
  const n = new Intl.NumberFormat('es-CO').format(Math.round(monto));
  return `$${n} ${moneda}`;
}

function renderItemsTable(items: CobranzaItem[], moneda: string): { html: string; plain: string } {
  if (!items.length) return { html: '', plain: '' };
  const rows = items.map(
    (it) =>
      `<tr><td style="padding:6px 10px;border-bottom:1px solid #eee">${it.id}</td>` +
      `<td style="padding:6px 10px;border-bottom:1px solid #eee">${it.concepto}</td>` +
      `<td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right"><strong>${formatMoney(it.monto, moneda)}</strong></td></tr>`
  );
  const html =
    `<table style="border-collapse:collapse;width:100%;margin-top:10px;font-family:Arial,sans-serif;font-size:13px">` +
    `<thead><tr style="background:#f5f5f5"><th style="padding:6px 10px;text-align:left">ID</th><th style="padding:6px 10px;text-align:left">Concepto</th><th style="padding:6px 10px;text-align:right">Monto</th></tr></thead>` +
    `<tbody>${rows.join('')}</tbody></table>`;
  const plain = items.map((it) => `- ${it.id} · ${it.concepto} · ${formatMoney(it.monto, moneda)}`).join('\n');
  return { html, plain };
}

function shell(body: string, footerExtra = ''): string {
  return `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#222;max-width:640px">` +
    `${body}` +
    `<p style="margin-top:24px;font-size:12px;color:#888">— Aifennec LLC · Wilmar Rocha${footerExtra ? '<br>' + footerExtra : ''}</p>` +
    `</div>`;
}

export function renderTemplate(tid: TemplateId, ctx: TemplateContext): RenderedMessage {
  const { clienteNombre, opp, diasAlPago, fechaPagoTexto, metodoPagoDetalle } = ctx;
  const total = formatMoney(opp.monto, opp.moneda);
  const items = renderItemsTable(opp.items, opp.moneda);
  const saludo = `<p>Hola ${clienteNombre},</p>`;

  switch (tid) {
    case 'T_MINUS_3': {
      const subject = `Recordatorio amable · pago ${fechaPagoTexto} · ${total}`;
      const html = shell(
        saludo +
          `<p>Este es un recordatorio amigable: en <strong>3 días (${fechaPagoTexto})</strong> corresponde el pago mensual de los servicios.</p>` +
          `<p><strong>Total a pagar:</strong> ${total}</p>` +
          items.html +
          `<p style="margin-top:12px"><strong>Método:</strong> ${metodoPagoDetalle}</p>` +
          `<p>Si todo está en orden por tu lado no tienes que hacer nada — solo lo dejo en tu radar. 🙌</p>`
      );
      const plain =
        `Hola ${clienteNombre},\n\nRecordatorio: en 3 días (${fechaPagoTexto}) corresponde el pago mensual.\n\nTotal: ${total}\n\n${items.plain}\n\nMétodo: ${metodoPagoDetalle}\n\n— Wilmar, Aifennec LLC`;
      return { subject, html, plain };
    }
    case 'T_ZERO': {
      const subject = `Cuenta de cobro · ${fechaPagoTexto} · ${total}`;
      const html = shell(
        saludo +
          `<p>Hoy es la fecha del pago mensual. Comparto el detalle para tu gestión.</p>` +
          `<p><strong>Total a pagar:</strong> ${total}</p>` +
          items.html +
          `<p style="margin-top:12px"><strong>Método:</strong> ${metodoPagoDetalle}</p>` +
          `<p>Cualquier novedad me cuentas, sin estrés. 👌</p>`
      );
      const plain =
        `Hola ${clienteNombre},\n\nHoy es la fecha del pago mensual. Total: ${total}\n\n${items.plain}\n\nMétodo: ${metodoPagoDetalle}\n\nCualquier novedad me cuentas.\n\n— Wilmar, Aifennec LLC`;
      return { subject, html, plain };
    }
    case 'T_PLUS_3': {
      const subject = `Seguimiento pago · ${diasAlPago} días · ${total}`;
      const html = shell(
        saludo +
          `<p>Hago seguimiento al pago que tenía fecha del ${fechaPagoTexto} (<strong>${diasAlPago} días</strong>).</p>` +
          `<p><strong>Total:</strong> ${total}</p>` +
          items.html +
          `<p>¿Ya lo pudiste gestionar o me puedes pasar una fecha firme? Así coordino por mi lado.</p>`
      );
      const plain =
        `Hola ${clienteNombre},\n\nSeguimiento al pago del ${fechaPagoTexto} (${diasAlPago} días).\n\nTotal: ${total}\n\n${items.plain}\n\n¿Fecha firme de pago?\n\n— Wilmar`;
      return { subject, html, plain };
    }
    case 'T_PLUS_7': {
      const subject = `Pago vencido · ${diasAlPago} días · ${total}`;
      const html = shell(
        saludo +
          `<p>El pago mensual lleva <strong>${diasAlPago} días vencido</strong> (${total}).</p>` +
          items.html +
          `<p>Necesito confirmar una fecha firme para ponernos al día. Si hay algo que impide el pago me cuentas y cuadramos alternativas. De lo contrario, necesito cerrar esto esta semana para seguir operando los servicios.</p>`
      );
      const plain =
        `Hola ${clienteNombre},\n\nPago vencido ${diasAlPago} días (${total}).\n\n${items.plain}\n\nNecesito fecha firme de pago esta semana.\n\n— Wilmar`;
      return { subject, html, plain };
    }
    case 'T_PLUS_11': {
      const subject = `🚨 Aviso previo a pausa · ${diasAlPago} días · ${total}`;
      const html = shell(
        saludo +
          `<p><strong>Aviso urgente:</strong> si no se recibe el pago de ${total} en los próximos días, los servicios quedarán <strong>pausados automáticamente el día 15 de atraso</strong>. No es personal — es política operativa para sostener la continuidad.</p>` +
          items.html +
          `<p>¿Podemos cerrar esto hoy o mañana?</p>`
      );
      const plain =
        `Hola ${clienteNombre},\n\nAviso urgente: pago pendiente ${total} (${diasAlPago} días). Servicios se pausan al día 15 de atraso.\n\n${items.plain}\n\n— Wilmar`;
      return { subject, html, plain };
    }
    case 'T_PAUSA': {
      const subject = `Servicio pausado por falta de pago · ${total}`;
      const html = shell(
        saludo +
          `<p>Los servicios quedan <strong>pausados hoy</strong> por falta de pago (${diasAlPago} días de atraso, ${total} acumulado).</p>` +
          items.html +
          `<p>Cuando se cierre el saldo pendiente retomamos operación en 1–2 días hábiles. Aquí queda abierto cuando puedas.</p>`
      );
      const plain =
        `Hola ${clienteNombre},\n\nServicios pausados hoy por falta de pago (${diasAlPago} días, ${total}).\n\n${items.plain}\n\nCuando se cierre el saldo retomamos en 1-2 días.\n\n— Wilmar`;
      return { subject, html, plain };
    }
    case 'T_PLUS_30': {
      const subject = `Último aviso antes de cierre de relación comercial`;
      const html = shell(
        `<p>Estimado ${clienteNombre},</p>` +
          `<p>Aviso formal: pago pendiente de <strong>${total}</strong>, con <strong>${diasAlPago} días</strong> de atraso desde la fecha acordada (${fechaPagoTexto}).</p>` +
          items.html +
          `<p>El servicio se encuentra pausado desde hace 15 días. De no recibir el pago o un cronograma firme en los próximos 15 días, procederé a cerrar definitivamente la relación comercial y entregar los accesos al cliente final según corresponda.</p>`,
        'Wilmar Rocha López · CC 1.019.031.051 · Aifennec LLC'
      );
      const plain =
        `Estimado ${clienteNombre},\n\nPago pendiente ${total} con ${diasAlPago} días de atraso desde ${fechaPagoTexto}.\n\n${items.plain}\n\nServicio pausado desde hace 15 días. Sin pago o cronograma firme en 15 días, procederé a cerrar la relación comercial.\n\n— Wilmar Rocha López, Aifennec LLC`;
      return { subject, html, plain };
    }
    case 'T_PLUS_45': {
      const subject = `Cierre de relación comercial`;
      const html = shell(
        `<p>Estimado ${clienteNombre},</p>` +
          `<p>Dado el no pago de <strong>${total}</strong> tras ${diasAlPago} días de atraso y múltiples solicitudes, procedo a cerrar la relación comercial a partir de esta fecha.</p>` +
          items.html +
          `<p>Los accesos y entregables correspondientes se mantienen disponibles mientras se regularice el saldo. Cualquier conversación futura se gestionará desde cero con nueva propuesta y depósito inicial.</p>`,
        'Wilmar Rocha López · CC 1.019.031.051 · Aifennec LLC'
      );
      const plain =
        `Estimado ${clienteNombre},\n\nDado el no pago de ${total} tras ${diasAlPago} días, cierro la relación comercial. Accesos disponibles mientras se regularice el saldo.\n\n${items.plain}\n\n— Wilmar Rocha López, Aifennec LLC`;
      return { subject, html, plain };
    }
  }
}
