import { readFileSync } from 'node:fs';
import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/gmail.compose'];

export async function createDraft(args: {
  saJsonPath: string;
  impersonate: string;
  raw: string;
}): Promise<string> {
  const sa = JSON.parse(readFileSync(args.saJsonPath, 'utf8')) as {
    client_email: string;
    private_key: string;
  };
  const auth = new google.auth.JWT({
    email: sa.client_email,
    key: sa.private_key,
    scopes: SCOPES,
    subject: args.impersonate,
  });
  const gmail = google.gmail({ version: 'v1', auth });
  const res = await gmail.users.drafts.create({
    userId: 'me',
    requestBody: { message: { raw: args.raw } },
  });
  const id = res.data.id;
  if (!id) throw new Error('Gmail no devolvió id de borrador');
  return id;
}
