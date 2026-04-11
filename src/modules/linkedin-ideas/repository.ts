import { query } from '../../db/connection.js';
import { logger } from '../../infra/logger.js';
import type { ClassifiedPost, PersistedPost } from './types.js';

export async function insertPosts(posts: ClassifiedPost[]): Promise<PersistedPost[]> {
  if (posts.length === 0) return [];

  const inserted: PersistedPost[] = [];

  for (const p of posts) {
    const rows = await query<{
      id: number;
      engagement_score: number;
      scraped_at: Date;
    }>(
      `INSERT INTO linkedin_posts
        (post_url, author_handle, author_name, posted_at, hook, body, format,
         likes, comments, reposts, topic, language)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (post_url) DO NOTHING
       RETURNING id, engagement_score, scraped_at`,
      [
        p.postUrl,
        p.authorHandle,
        p.authorName,
        p.postedAt,
        p.hook,
        p.body,
        p.format,
        p.likes,
        p.comments,
        p.reposts,
        p.topic,
        p.language,
      ]
    );
    if (rows[0]) {
      inserted.push({
        ...p,
        id: rows[0].id,
        engagementScore: rows[0].engagement_score,
        scrapedAt: rows[0].scraped_at,
      });
    }
  }

  logger.info({ inserted: inserted.length, attempted: posts.length }, 'repository: inserted');
  return inserted;
}

export async function fetchUnsyncedPosts(): Promise<PersistedPost[]> {
  const rows = await query<{
    id: number;
    post_url: string;
    author_handle: string;
    author_name: string;
    posted_at: Date | null;
    hook: string;
    body: string;
    format: string;
    likes: number;
    comments: number;
    reposts: number;
    engagement_score: number;
    topic: string;
    language: string;
    scraped_at: Date;
  }>(
    `SELECT id, post_url, author_handle, author_name, posted_at, hook, body,
            format, likes, comments, reposts, engagement_score, topic, language, scraped_at
     FROM linkedin_posts
     WHERE sheet_synced = false
     ORDER BY engagement_score DESC
     LIMIT 200`
  );

  return rows.map((r) => ({
    id: r.id,
    postUrl: r.post_url,
    authorHandle: r.author_handle,
    authorName: r.author_name,
    postedAt: r.posted_at,
    hook: r.hook,
    body: r.body,
    format: r.format as PersistedPost['format'],
    likes: r.likes,
    comments: r.comments,
    reposts: r.reposts,
    engagementScore: r.engagement_score,
    topic: r.topic,
    language: r.language,
    scrapedAt: r.scraped_at,
  }));
}

export async function markSynced(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  await query('UPDATE linkedin_posts SET sheet_synced = true, sheet_synced_at = NOW() WHERE id = ANY($1::int[])', [ids]);
}

export async function fetchTodayTop(limit: number): Promise<PersistedPost[]> {
  const rows = await query<{
    id: number;
    post_url: string;
    author_handle: string;
    author_name: string;
    posted_at: Date | null;
    hook: string;
    body: string;
    format: string;
    likes: number;
    comments: number;
    reposts: number;
    engagement_score: number;
    topic: string;
    language: string;
    scraped_at: Date;
  }>(
    `SELECT id, post_url, author_handle, author_name, posted_at, hook, body,
            format, likes, comments, reposts, engagement_score, topic, language, scraped_at
     FROM linkedin_posts
     WHERE scraped_at::date = CURRENT_DATE
     ORDER BY engagement_score DESC
     LIMIT $1`,
    [limit]
  );

  return rows.map((r) => ({
    id: r.id,
    postUrl: r.post_url,
    authorHandle: r.author_handle,
    authorName: r.author_name,
    postedAt: r.posted_at,
    hook: r.hook,
    body: r.body,
    format: r.format as PersistedPost['format'],
    likes: r.likes,
    comments: r.comments,
    reposts: r.reposts,
    engagementScore: r.engagement_score,
    topic: r.topic,
    language: r.language,
    scrapedAt: r.scraped_at,
  }));
}
