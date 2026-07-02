import { describe, it, expect } from 'vitest';
import { buildRawMessage } from '../../src/modules/cobranza-drafts/mime.js';

function decode(b64url: string): string {
  return Buffer.from(b64url.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

function decodeBase64(b64: string): string {
  return Buffer.from(b64, 'base64').toString('utf8');
}

describe('buildRawMessage', () => {
  const raw = buildRawMessage({
    fromEmail: 'wilmar@aifennecia.com', fromName: 'Wilmar Rocha López · Aifennec',
    to: 'y@x.com', subject: 'Cuenta de Cobro N°85 — julio', body: 'Hola',
    pdf: Buffer.from('%PDF-1.4 fake'), filename: 'cuenta-85.pdf',
  });
  const text = decode(raw);

  it('es base64url (sin +, / ni =)', () => {
    expect(raw).not.toMatch(/[+/=]/);
  });
  it('incluye To y el From con encoded-word RFC 2047', () => {
    expect(text).toContain('To: y@x.com');
    expect(text).toMatch(/From: =\?UTF-8\?B\?[^?]+\?= <wilmar@aifennecia\.com>/);
  });
  it('es multipart/mixed con adjunto application/pdf', () => {
    expect(text).toContain('multipart/mixed');
    expect(text).toContain('Content-Type: application/pdf');
    expect(text).toContain('Content-Disposition: attachment; filename="cuenta-85.pdf"');
    expect(text).toContain('Content-Transfer-Encoding: base64');
  });

  it('rechaza CRLF en to (header injection)', () => {
    expect(() => buildRawMessage({
      fromEmail: 'wilmar@aifennecia.com',
      fromName: 'Wilmar Rocha López · Aifennec',
      to: 'victim@x.com\r\nBcc: evil@x.com',
      subject: 'Cuenta de Cobro N°85 — julio',
      body: 'Hola',
      pdf: Buffer.from('%PDF-1.4 fake'),
      filename: 'cuenta-85.pdf',
    })).toThrow(/Valor de cabecera inválido \(CRLF\) en to/);
  });

  it('rechaza CRLF en fromEmail (header injection)', () => {
    expect(() => buildRawMessage({
      fromEmail: 'wilmar@aifennecia.com\r\nBcc: evil@x.com',
      fromName: 'Wilmar Rocha López · Aifennec',
      to: 'y@x.com',
      subject: 'Cuenta de Cobro N°85 — julio',
      body: 'Hola',
      pdf: Buffer.from('%PDF-1.4 fake'),
      filename: 'cuenta-85.pdf',
    })).toThrow(/Valor de cabecera inválido \(CRLF\) en fromEmail/);
  });

  it('round-trip: body y PDF se decodifican correctamente', () => {
    const pdfBuffer = Buffer.from('%PDF-1.4 ROUNDTRIP');
    const bodyText = 'Hola, prueba round-trip';
    const raw2 = buildRawMessage({
      fromEmail: 'wilmar@aifennecia.com',
      fromName: 'Wilmar Rocha López · Aifennec',
      to: 'y@x.com',
      subject: 'Test Round-Trip',
      body: bodyText,
      pdf: pdfBuffer,
      filename: 'test.pdf',
    });

    const decoded = decode(raw2);

    // Extract boundary
    const boundaryMatch = decoded.match(/boundary="([^"]+)"/);
    expect(boundaryMatch).toBeTruthy();
    const boundary = boundaryMatch![1];

    // Split by boundary
    const parts = decoded.split(`--${boundary}`);

    // Find text/plain part and extract body
    const textPart = parts.find(p => p.includes('Content-Type: text/plain'));
    expect(textPart).toBeTruthy();
    const [, bodyB64RawWithTrail] = textPart!.split('\r\n\r\n');
    const bodyB64 = bodyB64RawWithTrail.replace(/\s/g, '');
    const bodyDecoded = decodeBase64(bodyB64);
    expect(bodyDecoded).toBe(bodyText);

    // Find PDF part and extract attachment
    const pdfPart = parts.find(p => p.includes('Content-Type: application/pdf'));
    expect(pdfPart).toBeTruthy();
    const [, pdfB64RawWithTrail] = pdfPart!.split('\r\n\r\n');
    const pdfB64 = pdfB64RawWithTrail.replace(/\s/g, '');
    const pdfDecoded = Buffer.from(pdfB64, 'base64');
    expect(pdfDecoded.equals(pdfBuffer)).toBe(true);
  });

  it('sin pdf produce un mensaje válido sin parte adjunta', () => {
    const raw3 = buildRawMessage({
      fromEmail: 'wilmar@aifennecia.com',
      fromName: 'Wilmar Rocha López · Aifennec',
      to: 'y@x.com',
      subject: 'Recordatorio de pago',
      body: 'Hola, se acerca la fecha de pago.',
    });
    expect(raw3).not.toMatch(/[+/=]/);
    const decoded = decode(raw3);
    expect(decoded).toContain('To: y@x.com');
    expect(decoded).not.toContain('multipart/mixed');
    expect(decoded).not.toContain('application/pdf');
    expect(decoded).not.toContain('Content-Disposition: attachment');
    expect(decoded).toContain('Content-Type: text/plain; charset="UTF-8"');

    // round-trip body
    const [, bodyB64RawWithTrail] = decoded.split('\r\n\r\n');
    const bodyB64 = bodyB64RawWithTrail.replace(/\s/g, '');
    expect(decodeBase64(bodyB64)).toBe('Hola, se acerca la fecha de pago.');
  });

  it('rechaza CRLF en to incluso sin pdf', () => {
    expect(() => buildRawMessage({
      fromEmail: 'wilmar@aifennecia.com',
      fromName: 'Wilmar Rocha López · Aifennec',
      to: 'victim@x.com\r\nBcc: evil@x.com',
      subject: 'Recordatorio',
      body: 'Hola',
    })).toThrow(/Valor de cabecera inválido \(CRLF\) en to/);
  });
});
