import { env } from '../../infra/env.js';
import { sendMessage } from '../../channels/telegram.js';
import { logger } from '../../infra/logger.js';
import type { PersistedPost } from './types.js';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

export function formatDigest(posts: PersistedPost[], sheetUrl: string): string {
  const date = new Date().toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const lines: string[] = [
    `🔥 <b>LinkedIn Viral Digest — ${escapeHtml(date)}</b>`,
    '',
    `${posts.length} ideas nuevas hoy${posts.length > 0 ? '. Top por engagement:' : '.'}`,
    '',
  ];

  posts.forEach((p, i) => {
    lines.push(
      `${i + 1}. <b>${escapeHtml(p.authorName)}</b> — ${formatNumber(p.likes)} likes | ${formatNumber(p.comments)} comments`
    );
    lines.push(`   <i>"${escapeHtml(p.hook)}"</i>`);
    lines.push(`   📎 ${escapeHtml(p.postUrl)}`);
    lines.push('');
  });

  lines.push(`📊 Sheet completa: ${escapeHtml(sheetUrl)}`);
  return lines.join('\n');
}

export async function sendDigest(posts: PersistedPost[]): Promise<void> {
  const sheetUrl = `https://docs.google.com/spreadsheets/d/${env.GOOGLE_SHEET_ID}`;
  const text = formatDigest(posts, sheetUrl);
  logger.info({ count: posts.length }, 'digest: sending to telegram');
  await sendMessage(text);
}
