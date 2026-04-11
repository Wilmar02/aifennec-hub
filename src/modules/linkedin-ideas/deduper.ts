import { query } from '../../db/connection.js';
import type { RawPost } from './types.js';

export async function filterNewPosts(posts: RawPost[]): Promise<RawPost[]> {
  if (posts.length === 0) return [];

  const urls = posts.map((p) => p.postUrl);
  const existing = await query<{ post_url: string }>(
    'SELECT post_url FROM linkedin_posts WHERE post_url = ANY($1::text[])',
    [urls]
  );

  const existingSet = new Set(existing.map((r) => r.post_url));
  return posts.filter((p) => !existingSet.has(p.postUrl));
}
