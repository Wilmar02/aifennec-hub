import { env } from '../../infra/env.js';
import { sendMessage } from '../../channels/telegram.js';
import { logger } from '../../infra/logger.js';
import type { PersistedPost } from './types.js';

function escapeMarkdown(text: string): string {
  return text.replace(/([_*[\]()~`>#+=|{}.!\\-])/g, '\\$1');
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
    `🔥 *LinkedIn Viral Digest — ${date}*`,
    '',
    `${posts.length} ideas nuevas hoy${posts.length > 0 ? '. Top por engagement:' : '.'}`,
    '',
  ];

  posts.forEach((p, i) => {
    lines.push(
      `${i + 1}. *${p.authorName}* — ${formatNumber(p.likes)} likes | ${formatNumber(p.comments)} comments`
    );
    lines.push(`   _"${p.hook}"_`);
    lines.push(`   📎 ${p.postUrl}`);
    lines.push('');
  });

  lines.push(`📊 Sheet completa: ${sheetUrl}`);
  return lines.join('\n');
}

export async function sendDigest(posts: PersistedPost[]): Promise<void> {
  const sheetUrl = `https://docs.google.com/spreadsheets/d/${env.GOOGLE_SHEET_ID}`;
  const text = formatDigest(posts, sheetUrl);
  logger.info({ count: posts.length }, 'digest: sending to telegram');
  await sendMessage(text);
}
