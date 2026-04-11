import { google } from 'googleapis';
import { env } from '../../infra/env.js';
import { logger } from '../../infra/logger.js';
import type { PersistedPost } from './types.js';

const SHEET_NAME = 'Ideas';
const HEADER_ROW = [
  'Fecha scrape',
  'Autor',
  'Handle',
  'Fecha post',
  'URL',
  'Hook',
  'Cuerpo',
  'Formato',
  'Likes',
  'Comentarios',
  'Reposts',
  'Engagement Score',
  'Tema',
  'Idioma',
  'Estado',
  'Notas',
];

async function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: env.GOOGLE_SERVICE_ACCOUNT_JSON_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const authClient = await auth.getClient();
  return google.sheets({ version: 'v4', auth: authClient as never });
}

export async function ensureHeaderRow(): Promise<void> {
  const sheets = await getSheetsClient();
  const range = `${SHEET_NAME}!A1:P1`;
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: env.GOOGLE_SHEET_ID,
    range,
  });

  if (!existing.data.values || existing.data.values.length === 0) {
    logger.info('sheets: writing header row');
    await sheets.spreadsheets.values.update({
      spreadsheetId: env.GOOGLE_SHEET_ID,
      range,
      valueInputOption: 'RAW',
      requestBody: { values: [HEADER_ROW] },
    });
  }
}

function postToRow(p: PersistedPost): (string | number)[] {
  return [
    p.scrapedAt.toISOString().slice(0, 10),
    p.authorName,
    p.authorHandle,
    p.postedAt ? p.postedAt.toISOString().slice(0, 10) : '',
    p.postUrl,
    p.hook,
    p.body.length > 1000 ? p.body.slice(0, 997) + '...' : p.body,
    p.format,
    p.likes,
    p.comments,
    p.reposts,
    p.engagementScore,
    p.topic,
    p.language,
    'Nueva',
    '',
  ];
}

export async function appendPosts(posts: PersistedPost[]): Promise<void> {
  if (posts.length === 0) return;
  await ensureHeaderRow();

  const sheets = await getSheetsClient();
  const values = posts.map(postToRow);

  logger.info({ count: posts.length }, 'sheets: appending rows');

  await sheets.spreadsheets.values.append({
    spreadsheetId: env.GOOGLE_SHEET_ID,
    range: `${SHEET_NAME}!A:P`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values },
  });
}
