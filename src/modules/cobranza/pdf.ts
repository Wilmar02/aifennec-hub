import PDFDocument from 'pdfkit';
import type { CobranzaOpportunity } from './types.js';

const BRAND = '#0E4878';

const MES = [
  'enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre',
];

function formatDate(d: Date): string {
  return `${d.getDate()} de ${MES[d.getMonth()]} de ${d.getFullYear()}`;
}

function formatMoney(monto: number, moneda: string): string {
  const n = new Intl.NumberFormat('es-CO').format(Math.round(monto));
  return `$${n} ${moneda}`;
}

export interface PdfInput {
  numeroFactura: string;
  fechaFactura: Date;
  fechaVencimiento: Date;
  cliente: {
    razonSocial: string;
    nit?: string;
    direccion?: string;
    email?: string;
    telefono?: string;
  };
  emisor: {
    nombre: string;          // "Ángela Patricia García Cruz" o "Wilmar Rocha Lopez"
    cedula: string;          // "53.131.435"
    direccion: string;       // "Kr 81h sur 75 85 t21 303, Bogotá"
    banco: string;           // "NU BANK" o "Bancolombia"
    tipoCuenta: string;      // "cuenta de ahorros"
    numeroCuenta: string;    // "67603830"
  };
  concepto: string;          // "Servicios de marketing digital y operación CRM — abril 2026"
  opp: CobranzaOpportunity;
}

/**
 * Genera la cuenta de cobro en memoria. Retorna Buffer del PDF.
 * Estilo consistente con los templates históricos (tabla con brand color, firma, disclaimer ley 1819).
 */
export function generateCobranzaPdf(input: PdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 60, bottom: 55, left: 70, right: 70 },
    });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header title
    doc
      .fillColor(BRAND)
      .font('Helvetica-Bold')
      .fontSize(20)
      .text(`CUENTA DE COBRO N° ${input.numeroFactura}`, { align: 'center' });
    doc.moveDown(0.3);
    doc.strokeColor(BRAND).lineWidth(1.5).moveTo(70, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.8);

    // Fecha factura
    doc.fillColor('#222').font('Helvetica-Bold').fontSize(11).text('Fecha factura: ', { continued: true });
    doc.font('Helvetica').text(formatDate(input.fechaFactura));
    doc.moveDown(0.8);

    // Cliente block
    const kvLine = (k: string, v?: string): void => {
      if (!v) return;
      doc.font('Helvetica-Bold').text(`${k} `, { continued: true });
      doc.font('Helvetica').text(v);
    };
    kvLine('Cliente:', input.cliente.razonSocial);
    kvLine('NIT:', input.cliente.nit);
    kvLine('Dirección:', input.cliente.direccion);
    kvLine('Email:', input.cliente.email);
    kvLine('Teléfono:', input.cliente.telefono);
    doc.moveDown(0.6);

    kvLine('Concepto:', input.concepto);
    doc.moveDown(0.6);

    // Tabla items
    const tableX = 70;
    const colWidths = [60, 310, 105];
    const tableW = colWidths.reduce((a, b) => a + b, 0);

    // Header
    let y = doc.y;
    doc.rect(tableX, y, tableW, 22).fill(BRAND);
    doc.fillColor('white').font('Helvetica-Bold').fontSize(10);
    doc.text('ID', tableX + 8, y + 7, { width: colWidths[0] - 8 });
    doc.text('Concepto', tableX + colWidths[0] + 8, y + 7, { width: colWidths[1] - 8 });
    doc.text('Valor', tableX + colWidths[0] + colWidths[1] + 8, y + 7, {
      width: colWidths[2] - 16,
      align: 'right',
    });
    y += 22;

    doc.fillColor('#222').font('Helvetica').fontSize(10);
    let rowIdx = 0;
    for (const item of input.opp.items) {
      const rowH = 22;
      if (rowIdx % 2 === 1) {
        doc.rect(tableX, y, tableW, rowH).fill('#F5F5F5');
        doc.fillColor('#222');
      }
      doc.font('Helvetica').text(item.id, tableX + 8, y + 7, { width: colWidths[0] - 8 });
      doc.text(item.concepto, tableX + colWidths[0] + 8, y + 7, { width: colWidths[1] - 8 });
      doc.text(formatMoney(item.monto, input.opp.moneda), tableX + colWidths[0] + colWidths[1] + 8, y + 7, {
        width: colWidths[2] - 16,
        align: 'right',
      });
      y += rowH;
      rowIdx += 1;
    }

    // Total row
    doc.rect(tableX, y, tableW, 28).fill('#E8F0F8');
    doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(11);
    doc.text('TOTAL A PAGAR', tableX + colWidths[0] + 8, y + 9, { width: colWidths[1] - 8 });
    doc.fontSize(12).text(
      formatMoney(input.opp.monto, input.opp.moneda),
      tableX + colWidths[0] + colWidths[1] + 8,
      y + 8,
      { width: colWidths[2] - 16, align: 'right' }
    );
    y += 34;

    doc.y = y;
    doc.moveDown(1);

    // Payment block
    doc.fillColor('#222').fontSize(11);
    kvLine('Fecha de vencimiento:', formatDate(input.fechaVencimiento));
    kvLine('Banco:', input.emisor.banco);
    kvLine('Tipo:', `${input.emisor.tipoCuenta} — N° ${input.emisor.numeroCuenta}`);
    kvLine('A nombre de:', `${input.emisor.nombre} — CC ${input.emisor.cedula}`);

    doc.moveDown(2.5);
    doc.font('Helvetica').text('Cordialmente,');
    doc.moveDown(2.8);
    doc.font('Helvetica').text(input.emisor.nombre);
    doc
      .fillColor('#888')
      .fontSize(9)
      .font('Helvetica-Oblique')
      .text(`C.C. ${input.emisor.cedula} — ${input.emisor.direccion}`);
    doc.moveDown(1);
    doc.text(
      'De acuerdo con el parágrafo 2 del Artículo 17 de la ley 1819 de 2016, certifico que no me ' +
        'debe ser aplicada la retención en la fuente según el artículo 383 del Estatuto Tributario, ' +
        'ya que presto servicios de forma personal sin empleados vinculados.'
    );

    doc.end();
  });
}
