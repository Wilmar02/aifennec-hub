function encodedWord(s: string): string {
  return `=?UTF-8?B?${Buffer.from(s, 'utf8').toString('base64')}?=`;
}

function toBase64Url(s: string): string {
  return Buffer.from(s, 'utf8').toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function buildRawMessage(args: {
  fromEmail: string; fromName: string; to: string;
  subject: string; body: string; pdf: Buffer; filename: string;
}): string {
  const { fromEmail, fromName, to, subject, body, pdf, filename } = args;
  const boundary = 'mixed_boundary_cobranza_drafts';
  const pdfB64 = pdf.toString('base64').replace(/(.{76})/g, '$1\r\n');
  const lines = [
    `From: ${encodedWord(fromName)} <${fromEmail}>`,
    `To: ${to}`,
    `Subject: ${encodedWord(subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(body, 'utf8').toString('base64').replace(/(.{76})/g, '$1\r\n'),
    '',
    `--${boundary}`,
    'Content-Type: application/pdf',
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${filename}"`,
    '',
    pdfB64,
    '',
    `--${boundary}--`,
  ];
  return toBase64Url(lines.join('\r\n'));
}
