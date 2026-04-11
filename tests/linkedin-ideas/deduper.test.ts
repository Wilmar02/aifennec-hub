import { describe, it, expect, vi, beforeEach } from 'vitest';
import { filterNewPosts } from '../../src/modules/linkedin-ideas/deduper.js';
import type { RawPost } from '../../src/modules/linkedin-ideas/types.js';

vi.mock('../../src/db/connection.js', () => ({
  query: vi.fn(),
}));

import { query } from '../../src/db/connection.js';

const makePost = (url: string): RawPost => ({
  postUrl: url,
  authorHandle: 'test',
  authorName: 'Test User',
  postedAt: new Date(),
  body: 'body',
  likes: 100,
  comments: 10,
  reposts: 1,
  format: 'text',
});

describe('filterNewPosts', () => {
  beforeEach(() => {
    vi.mocked(query).mockReset();
  });

  it('returns all posts when none exist in db', async () => {
    vi.mocked(query).mockResolvedValue([]);
    const posts = [makePost('a'), makePost('b'), makePost('c')];
    const result = await filterNewPosts(posts);
    expect(result).toHaveLength(3);
  });

  it('filters out posts already in db', async () => {
    vi.mocked(query).mockResolvedValue([{ post_url: 'b' }]);
    const posts = [makePost('a'), makePost('b'), makePost('c')];
    const result = await filterNewPosts(posts);
    expect(result.map((p) => p.postUrl)).toEqual(['a', 'c']);
  });

  it('returns empty array when all posts exist', async () => {
    vi.mocked(query).mockResolvedValue([
      { post_url: 'a' },
      { post_url: 'b' },
    ]);
    const posts = [makePost('a'), makePost('b')];
    const result = await filterNewPosts(posts);
    expect(result).toHaveLength(0);
  });

  it('handles empty input', async () => {
    const result = await filterNewPosts([]);
    expect(result).toEqual([]);
    expect(query).not.toHaveBeenCalled();
  });
});
