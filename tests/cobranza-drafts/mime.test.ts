import { describe, it, expect } from 'vitest';
import { buildRawMessage } from '../../src/modules/cobranza-drafts/mime.js';

function decode(b64url: string): string {
  return Buffer.from(b64url.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
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
});
