import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../infra/env.js';
import { logger } from '../../infra/logger.js';
import type { RawPost, ClassifiedPost } from './types.js';

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You classify LinkedIn posts. For each post you receive, return a JSON object with these fields:

- "topic": one of [sales, marketing, automation, branding, personal-growth, agency, ai, content-creation, finance, sales-copy, leadership, productivity, other]
- "language": ISO code [en, es, pt, other]
- "hook": the first sentence of the post, max 200 chars (the attention-grabbing line)

Return ONLY a JSON array, no preamble, no explanation. Example:
[{"topic":"sales","language":"en","hook":"I quit my job to make $0..."},{"topic":"branding","language":"es","hook":"La marca personal no es..."}]`;

interface ClassifierOutput {
  topic: string;
  language: string;
  hook: string;
}

function extractFirstSentence(body: string): string {
  const trimmed = body.trim().split('\n')[0];
  return trimmed.length > 200 ? trimmed.slice(0, 197) + '...' : trimmed;
}

export async function classifyBatch(posts: RawPost[]): Promise<ClassifiedPost[]> {
  if (posts.length === 0) return [];

  const numbered = posts
    .map((p, i) => `[${i}] ${p.body.slice(0, 800)}`)
    .join('\n\n---\n\n');

  logger.info({ count: posts.length }, 'classifier: calling Claude');

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Classify these ${posts.length} LinkedIn posts:\n\n${numbered}`,
        },
      ],
    });

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { text: string }).text)
      .join('');

    const jsonStart = text.indexOf('[');
    const jsonEnd = text.lastIndexOf(']');
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error('classifier: no JSON array in response');
    }

    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as ClassifierOutput[];

    return posts.map((post, i) => {
      const c = parsed[i];
      return {
        ...post,
        topic: c?.topic ?? 'other',
        language: c?.language ?? 'en',
        hook: c?.hook ?? extractFirstSentence(post.body),
      };
    });
  } catch (err) {
    logger.error({ err }, 'classifier: failed, falling back to defaults');
    return posts.map((post) => ({
      ...post,
      topic: 'other',
      language: 'en',
      hook: extractFirstSentence(post.body),
    }));
  }
}
