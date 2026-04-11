export interface SeedProfile {
  handle: string;
  name: string;
  minLikes: number;
}

export interface RawPost {
  postUrl: string;
  authorHandle: string;
  authorName: string;
  postedAt: Date | null;
  body: string;
  likes: number;
  comments: number;
  reposts: number;
  format: PostFormat;
}

export type PostFormat = 'text' | 'image' | 'video' | 'carousel' | 'poll' | 'article' | 'unknown';

export interface ClassifiedPost extends RawPost {
  hook: string;
  topic: string;
  language: string;
}

export interface PersistedPost extends ClassifiedPost {
  id: number;
  engagementScore: number;
  scrapedAt: Date;
}
