import { env } from '../../infra/env.js';
import { logger } from '../../infra/logger.js';
import type { RawPost, PostFormat, SeedProfile } from './types.js';

const ACTOR_ID = 'harvestapi~linkedin-profile-posts';
const BASE_URL = `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items`;

interface ApifyAuthor {
  publicIdentifier?: string;
  name?: string;
}

interface ApifyPostedAt {
  timestamp?: number;
  date?: string;
}

interface ApifyEngagement {
  likes?: number;
  comments?: number;
  shares?: number;
}

interface ApifyPostImage {
  url?: string;
}

interface ApifyPost {
  type?: string;
  id?: string;
  linkedinUrl?: string;
  content?: string;
  author?: ApifyAuthor;
  postedAt?: ApifyPostedAt;
  postImages?: ApifyPostImage[];
  postVideos?: unknown[];
  postDocuments?: unknown[];
  engagement?: ApifyEngagement;
}

function detectFormat(p: ApifyPost): PostFormat {
  if (p.postVideos && p.postVideos.length > 0) return 'video';
  if (p.postDocuments && p.postDocuments.length > 0) return 'carousel';
  if (p.postImages && p.postImages.length > 0) {
    return p.postImages.length > 1 ? 'carousel' : 'image';
  }
  return 'text';
}

function parsePostedAt(p: ApifyPost): Date | null {
  if (p.postedAt?.date) {
    const d = new Date(p.postedAt.date);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (p.postedAt?.timestamp) {
    return new Date(p.postedAt.timestamp);
  }
  return null;
}

export async function fetchProfilePosts(profile: SeedProfile): Promise<RawPost[]> {
  const profileUrl = `https://www.linkedin.com/in/${profile.handle}/`;
  const input = {
    targetUrls: [profileUrl],
    maxPosts: 20,
    postedLimit: 'month',
    includeQuotePosts: false,
    includeReposts: false,
    scrapeReactions: false,
  };

  logger.info({ handle: profile.handle }, 'apify: fetching posts');

  const response = await fetch(`${BASE_URL}?token=${env.APIFY_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const body = await response.text();
    logger.error(
      { handle: profile.handle, status: response.status, body },
      'apify: request failed'
    );
    throw new Error(`Apify ${response.status} for ${profile.handle}: ${body.slice(0, 200)}`);
  }

  const posts = (await response.json()) as ApifyPost[];

  const mapped: RawPost[] = posts
    .filter((p) => p.type === 'post' && p.content && p.linkedinUrl)
    .map((p) => ({
      postUrl: p.linkedinUrl ?? '',
      authorHandle: p.author?.publicIdentifier ?? profile.handle,
      authorName: p.author?.name ?? profile.name,
      postedAt: parsePostedAt(p),
      body: p.content ?? '',
      likes: p.engagement?.likes ?? 0,
      comments: p.engagement?.comments ?? 0,
      reposts: p.engagement?.shares ?? 0,
      format: detectFormat(p),
    }))
    .filter((p) => p.likes >= profile.minLikes);

  logger.info(
    { handle: profile.handle, total: posts.length, kept: mapped.length },
    'apify: filtered'
  );

  return mapped;
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
