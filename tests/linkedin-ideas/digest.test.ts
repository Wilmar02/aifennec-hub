import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/infra/env.js', () => ({
  env: {
    TELEGRAM_BOT_TOKEN: '123456:ABCDEFabcdef',
    TELEGRAM_DIGEST_CHAT_ID: '-100123456',
    GOOGLE_SHEET_ID: 'fake-sheet-id',
  },
}));

vi.mock('../../src/channels/telegram.js', () => ({
  bot: {},
  sendMessage: vi.fn(),
}));

vi.mock('../../src/infra/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { formatDigest } from '../../src/modules/linkedin-ideas/digest.js';
import type { PersistedPost } from '../../src/modules/linkedin-ideas/types.js';

const makePost = (overrides: Partial<PersistedPost> = {}): PersistedPost => ({
  id: 1,
  postUrl: 'https://www.linkedin.com/posts/x',
  authorHandle: 'justinwelsh',
  authorName: 'Justin Welsh',
  postedAt: new Date('2026-04-11'),
  hook: 'I quit my $300k job to make $0',
  body: 'long body',
  format: 'text',
  likes: 2341,
  comments: 89,
  reposts: 12,
  engagementScore: 2668,
  topic: 'sales',
  language: 'en',
  scrapedAt: new Date('2026-04-11'),
  ...overrides,
});

describe('formatDigest', () => {
  it('renders title with post count and date', () => {
    const text = formatDigest([makePost()], 'https://sheet');
    expect(text).toContain('LinkedIn Viral Digest');
    expect(text).toContain('1 ideas');
  });

  it('includes author, likes, hook, and url for each post', () => {
    const text = formatDigest([makePost()], 'https://sheet');
    expect(text).toContain('Justin Welsh');
    expect(text).toContain('2,341');
    expect(text).toContain('I quit my $300k job');
    expect(text).toContain('https://www.linkedin.com/posts/x');
  });

  it('numbers posts starting from 1', () => {
    const text = formatDigest(
      [makePost({ id: 1 }), makePost({ id: 2, hook: 'Second post' })],
      'https://sheet'
    );
    expect(text).toMatch(/1\.\s/);
    expect(text).toMatch(/2\.\s/);
  });

  it('includes sheet link', () => {
    const text = formatDigest([makePost()], 'https://sheet-url-here');
    expect(text).toContain('https://sheet-url-here');
  });

  it('handles empty list', () => {
    const text = formatDigest([], 'https://sheet');
    expect(text).toContain('0 ideas');
  });
});
