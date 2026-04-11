import { env } from '../../infra/env.js';
import { logger } from '../../infra/logger.js';
import type { RawPost, PostFormat, SeedProfile } from './types.js';

const BASE_URL = 'https://nubela.co/proxycurl/api/v2/linkedin';

interface ProxycurlPost {
  urn?: string;
  text?: string;
  total_reaction_count?: number;
  comments_count?: number;
  reshare_count?: number;
  posted_on?: { day?: number; month?: number; year?: number };
  media_type?: string;
  post_url?: string;
}

interface ProxycurlPostsResponse {
  posts?: ProxycurlPost[];
}

function detectFormat(mediaType?: string): PostFormat {
  if (!mediaType) return 'text';
  const m = mediaType.toLowerCase();
  if (m.includes('video')) return 'video';
  if (m.includes('image')) return 'image';
  if (m.includes('document') || m.includes('carousel')) return 'carousel';
  if (m.includes('poll')) return 'poll';
  if (m.includes('article')) return 'article';
  return 'unknown';
}

function parsePostedAt(p: ProxycurlPost): Date | null {
  if (!p.posted_on?.year) return null;
  return new Date(
    p.posted_on.year,
    (p.posted_on.month ?? 1) - 1,
    p.posted_on.day ?? 1
  );
}

export async function fetchProfilePosts(profile: SeedProfile): Promise<RawPost[]> {
  const profileUrl = `https://www.linkedin.com/in/${profile.handle}/`;
  const url = `${BASE_URL}/profile/posts?linkedin_profile_url=${encodeURIComponent(profileUrl)}`;

  logger.info({ handle: profile.handle }, 'proxycurl: fetching posts');

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${env.PROXYCURL_API_KEY}` },
  });

  if (!response.ok) {
    const body = await response.text();
    logger.error(
      { handle: profile.handle, status: response.status, body },
      'proxycurl: request failed'
    );
    throw new Error(`Proxycurl ${response.status} for ${profile.handle}: ${body}`);
  }

  const data = (await response.json()) as ProxycurlPostsResponse;
  const posts = data.posts ?? [];

  const mapped: RawPost[] = posts
    .filter((p) => p.text && (p.post_url || p.urn))
    .map((p) => ({
      postUrl: p.post_url ?? `https://www.linkedin.com/feed/update/${p.urn}/`,
      authorHandle: profile.handle,
      authorName: profile.name,
      postedAt: parsePostedAt(p),
      body: p.text ?? '',
      likes: p.total_reaction_count ?? 0,
      comments: p.comments_count ?? 0,
      reposts: p.reshare_count ?? 0,
      format: detectFormat(p.media_type),
    }))
    .filter((p) => p.likes >= profile.minLikes);

  logger.info(
    { handle: profile.handle, total: posts.length, kept: mapped.length },
    'proxycurl: filtered'
  );

  return mapped;
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
