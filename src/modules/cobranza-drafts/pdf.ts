import PDFDocument from 'pdfkit';
import type { Emisor, Item } from './types.js';
import { formatMoney, formatDate } from './format.js';

const BRAND = '#0F2A4A';
const ACCENT = '#2563EB';

export interface PdfInput {
  numeroFactura: string;
  fechaFactura: Date;
  fechaVencimiento: Date;
  concepto: string;
  moneda: string;
  cliente: { razonSocial: string; email?: string };
  emisor: Emisor;
  items: Item[];
}

export function generateCobranzaPdf(input: PdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margins: { top: 55, bottom: 55, left: 60, right: 60 } });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const width = right - left;

    // Header
    doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(22)
      .text(`CUENTA DE COBRO N° ${input.numeroFactura}`, left, doc.y, { align: 'left' });
    doc.moveDown(0.2);
    doc.fillColor('#6B7280').font('Helvetica').fontSize(10)
      .text(`Fecha de emisión: ${formatDate(input.fechaFactura)}`);
    doc.moveDown(0.4);
    doc.strokeColor(BRAND).lineWidth(1.2).moveTo(left, doc.y).lineTo(right, doc.y).stroke();
    doc.moveDown(1);

    // Paneles DE / FACTURAR A
    const panelTop = doc.y;
    const colW = width / 2 - 8;
    doc.fillColor('#6B7280').font('Helvetica-Bold').fontSize(8).text('DE', left, panelTop);
    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(11).text(input.emisor.nombre, left, doc.y);
    doc.fillColor('#1F2937').font('Helvetica').fontSize(9.5)
      .text(`C.C. ${input.emisor.cedula}\n${input.emisor.direccion}`, { width: colW });

    const rightX = left + width / 2 + 8;
    doc.fillColor('#6B7280').font('Helvetica-Bold').fontSize(8).text('FACTURAR A', rightX, panelTop);
    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(11).text(input.cliente.razonSocial, rightX, doc.y, { width: colW });
    if (input.cliente.email) {
      doc.fillColor('#1F2937').font('Helvetica').fontSize(9.5).text(input.cliente.email, rightX, doc.y, { width: colW });
    }
    doc.moveDown(1.2);
    doc.x = left;

    // Concepto
    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(10).text('Concepto: ', { continued: true });
    doc.font('Helvetica').text(input.concepto);
    doc.moveDown(0.8);

    // Tabla
    const colId = 55, colVal = 110;
    const colDesc = width - colId - colVal;
    let y = doc.y;
    doc.rect(left, y, width, 22).fill(BRAND);
    doc.fillColor('white').font('Helvetica-Bold').fontSize(9.5);
    doc.text('ID', left + 8, y + 7, { width: colId - 8 });
    doc.text('Concepto', left + colId + 8, y + 7, { width: colDesc - 8 });
    doc.text('Valor', left + colId + colDesc, y + 7, { width: colVal - 8, align: 'right' });
    y += 22;

    doc.font('Helvetica').fontSize(9.5);
    input.items.forEach((it, i) => {
      const descText = it.descripcion ? `${it.concepto}\n${it.descripcion}` : it.concepto;
      const descHeight = doc.heightOfString(descText, { width: colDesc - 16 });
      const rowH = Math.max(24, descHeight + 12);
      if (i % 2 === 1) { doc.rect(left, y, width, rowH).fill('#F5F7FA'); }
      doc.fillColor('#111827').font('Helvetica').fontSize(9.5).text(it.id, left + 8, y + 6, { width: colId - 8 });
      doc.text(descText, left + colId + 8, y + 6, { width: colDesc - 16 });
      doc.font('Helvetica-Bold').text(formatMoney(it.monto, input.moneda), left + colId + colDesc, y + 6, { width: colVal - 8, align: 'right' });
      y += rowH;
    });

    // Total
    const total = input.items.reduce((a, it) => a + it.monto, 0);
    doc.rect(left, y, width, 30).fill(BRAND);
    doc.fillColor('white').font('Helvetica-Bold').fontSize(11).text('TOTAL A PAGAR', left + colId + 8, y + 9, { width: colDesc - 8 });
    doc.fontSize(13).text(formatMoney(total, input.moneda), left + colId + colDesc, y + 8, { width: colVal - 8, align: 'right' });
    y += 42;

    doc.y = y; doc.x = left;

    // Datos de pago
    doc.fillColor(ACCENT).font('Helvetica-Bold').fontSize(11).text('DATOS PARA EL PAGO');
    doc.moveDown(0.3);
    doc.fillColor('#1F2937').font('Helvetica').fontSize(10);
    doc.text(`Banco: ${input.emisor.banco}`);
    doc.text(`Tipo de cuenta: ${input.emisor.tipoCuenta} N° ${input.emisor.numeroCuenta}`);
    doc.text(`A nombre de: ${input.emisor.nombre} — C.C. ${input.emisor.cedula}`);
    doc.text(`Fecha de vencimiento: ${formatDate(input.fechaVencimiento)}`);
    doc.moveDown(1.6);

    // Firma + disclaimer
    doc.font('Helvetica').fontSize(10).text('Cordialmente,');
    doc.moveDown(2);
    doc.font('Helvetica-Bold').text(input.emisor.nombre);
    doc.fillColor('#6B7280').font('Helvetica-Oblique').fontSize(9)
      .text(`C.C. ${input.emisor.cedula} — ${input.emisor.direccion}`);
    doc.moveDown(1);
    doc.fillColor('#6B7280').fontSize(7.5).text(
      'De acuerdo con el parágrafo 2 del Artículo 17 de la ley 1819 de 2016, certifico que no me ' +
      'debe ser aplicada la retención en la fuente según el artículo 383 del Estatuto Tributario, ' +
      'ya que presto servicios de forma personal sin empleados vinculados.'
    );

    doc.end();
  });
}
