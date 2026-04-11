# LinkedIn Viral Ideas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first module of `aifennec-hub` — a daily cron that fetches viral LinkedIn posts from 16 curated creators via Proxycurl, classifies them with Claude Haiku, persists to Postgres + Google Sheets, and sends a top-10 digest via Telegram.

**Architecture:** Standalone Node.js process. node-cron triggers daily at 06:00 Bogotá. Pipeline: Proxycurl → dedupe in Postgres → Claude classify → write to Postgres + Google Sheets → Telegram digest. No browsers, no scraping, all HTTP/JSON.

**Tech Stack:** Node.js 22, TypeScript 5, Postgres (existing VPS), Proxycurl API, Anthropic SDK (Claude Haiku 4.5), googleapis (Sheets), grammy (Telegram), node-cron, pino, zod, vitest, Docker, Easypanel.

**Spec:** `docs/superpowers/specs/2026-04-11-linkedin-ideas-design.md`

---

## Task 1: Initialize repo + scaffold project

**Files:**
- Create: `aifennec-hub/.gitignore`
- Create: `aifennec-hub/package.json`
- Create: `aifennec-hub/tsconfig.json`
- Create: `aifennec-hub/.env.example`
- Create: `aifennec-hub/README.md`

- [ ] **Step 1: Init git repo**

```bash
cd /c/Users/wilma/Desktop/aifennec-hub
git init
git branch -M main
```

Expected: `Initialized empty Git repository in C:/Users/wilma/Desktop/aifennec-hub/.git/`

- [ ] **Step 2: Create `.gitignore`**

```
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
coverage/
.vitest-cache/
google-service-account.json
```

- [ ] **Step 3: Create `package.json`**

```json
{
  "name": "aifennec-hub",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx watch src/index.ts",
    "scrape:once": "tsx src/modules/linkedin-ideas/index.ts --once",
    "migrate": "tsx src/db/migrate.ts",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.32.0",
    "googleapis": "^144.0.0",
    "grammy": "^1.30.0",
    "node-cron": "^3.0.3",
    "pg": "^8.13.0",
    "pino": "^9.5.0",
    "pino-pretty": "^11.3.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/node": "^22.7.0",
    "@types/node-cron": "^3.0.11",
    "@types/pg": "^8.11.10",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 4: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "resolveJsonModule": true,
    "declaration": false,
    "sourceMap": true,
    "forceConsistentCasingInFileNames": true,
    "noUnusedLocals": false,
    "noImplicitReturns": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 5: Create `.env.example`**

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/aifennec_hub

# Proxycurl
PROXYCURL_API_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# Google Sheets
GOOGLE_SHEET_ID=
GOOGLE_SERVICE_ACCOUNT_JSON_PATH=./google-service-account.json

# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_DIGEST_CHAT_ID=

# Scheduler
LINKEDIN_IDEAS_CRON=0 6 * * *
LINKEDIN_IDEAS_TIMEZONE=America/Bogota

# General
NODE_ENV=production
LOG_LEVEL=info
```

- [ ] **Step 6: Create `README.md`**

```markdown
# Aifennec Hub

Motor central de la agencia Aifennec. Módulos:

- `linkedin-ideas` — scrape diario de posts virales de LinkedIn → Google Sheet + Telegram digest

## Quick start

```bash
pnpm install
cp .env.example .env
# Llenar .env con credenciales
pnpm migrate
pnpm scrape:once  # test manual
pnpm dev          # cron en vivo
```

Ver `docs/superpowers/specs/` para diseño detallado.
```

- [ ] **Step 7: Install dependencies**

```bash
cd /c/Users/wilma/Desktop/aifennec-hub
npm install
```

Expected: `added XXX packages` (no errors)

- [ ] **Step 8: Commit**

```bash
git add .gitignore package.json package-lock.json tsconfig.json .env.example README.md docs/
git commit -m "chore: scaffold aifennec-hub with linkedin-ideas spec"
```

---

## Task 2: Environment validation + logger

**Files:**
- Create: `src/infra/env.ts`
- Create: `src/infra/logger.ts`

- [ ] **Step 1: Create `src/infra/env.ts`**

```typescript
import { z } from 'zod';
import { config } from 'dotenv';

config();

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  PROXYCURL_API_KEY: z.string().min(20),
  ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-'),
  GOOGLE_SHEET_ID: z.string().min(10),
  GOOGLE_SERVICE_ACCOUNT_JSON_PATH: z.string().default('./google-service-account.json'),
  TELEGRAM_BOT_TOKEN: z.string().regex(/^\d+:[A-Za-z0-9_-]+$/),
  TELEGRAM_DIGEST_CHAT_ID: z.string(),
  LINKEDIN_IDEAS_CRON: z.string().default('0 6 * * *'),
  LINKEDIN_IDEAS_TIMEZONE: z.string().default('America/Bogota'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = (() => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.flatten().fieldErrors);
    process.exit(1);
  }
  return result.data;
})();
```

- [ ] **Step 2: Add dotenv dependency**

```bash
npm install dotenv
```

- [ ] **Step 3: Create `src/infra/logger.ts`**

```typescript
import pino from 'pino';
import { env } from './env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  transport: env.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
  base: { service: 'aifennec-hub' },
});
```

- [ ] **Step 4: Commit**

```bash
git add src/infra/ package.json package-lock.json
git commit -m "feat(infra): add zod env validation and pino logger"
```

---

## Task 3: Postgres connection + migration runner

**Files:**
- Create: `src/db/connection.ts`
- Create: `src/db/migrate.ts`
- Create: `src/db/migrations/001_linkedin_posts.sql`

- [ ] **Step 1: Create `src/db/connection.ts`**

```typescript
import pg from 'pg';
import { env } from '../infra/env.js';
import { logger } from '../infra/logger.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  logger.error({ err }, 'unexpected postgres pool error');
});

export async function query<T = unknown>(text: string, params?: unknown[]): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows as T[];
}

export async function close(): Promise<void> {
  await pool.end();
}
```

- [ ] **Step 2: Create `src/db/migrations/001_linkedin_posts.sql`**

```sql
CREATE TABLE IF NOT EXISTS linkedin_posts (
  id              SERIAL PRIMARY KEY,
  post_url        TEXT UNIQUE NOT NULL,
  author_handle   TEXT NOT NULL,
  author_name     TEXT,
  posted_at       TIMESTAMP,
  hook            TEXT,
  body            TEXT,
  format          TEXT,
  likes           INT DEFAULT 0,
  comments        INT DEFAULT 0,
  reposts         INT DEFAULT 0,
  engagement_score INT GENERATED ALWAYS AS (likes + comments * 3 + reposts * 5) STORED,
  topic           TEXT,
  language        TEXT,
  scraped_at      TIMESTAMP DEFAULT NOW(),
  sheet_synced    BOOLEAN DEFAULT false,
  sheet_synced_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_posts_scraped_at ON linkedin_posts(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_engagement ON linkedin_posts(engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author ON linkedin_posts(author_handle);
CREATE INDEX IF NOT EXISTS idx_posts_sheet_unsynced ON linkedin_posts(sheet_synced) WHERE sheet_synced = false;

CREATE TABLE IF NOT EXISTS migrations (
  id SERIAL PRIMARY KEY,
  filename TEXT UNIQUE NOT NULL,
  applied_at TIMESTAMP DEFAULT NOW()
);
```

- [ ] **Step 3: Create `src/db/migrate.ts`**

```typescript
import { readFile, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pool, query, close } from './connection.js';
import { logger } from '../infra/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, 'migrations');

async function ensureMigrationsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

async function appliedMigrations(): Promise<Set<string>> {
  const rows = await query<{ filename: string }>('SELECT filename FROM migrations');
  return new Set(rows.map((r) => r.filename));
}

async function run(): Promise<void> {
  await ensureMigrationsTable();
  const applied = await appliedMigrations();
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    if (applied.has(file)) {
      logger.info({ file }, 'migration already applied, skipping');
      continue;
    }
    const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf8');
    logger.info({ file }, 'applying migration');
    await pool.query('BEGIN');
    try {
      await pool.query(sql);
      await pool.query('INSERT INTO migrations (filename) VALUES ($1)', [file]);
      await pool.query('COMMIT');
      logger.info({ file }, 'migration applied');
    } catch (err) {
      await pool.query('ROLLBACK');
      logger.error({ err, file }, 'migration failed');
      throw err;
    }
  }
  await close();
  logger.info('all migrations done');
}

run().catch((err) => {
  logger.error({ err }, 'migrate failed');
  process.exit(1);
});
```

- [ ] **Step 4: Commit**

```bash
git add src/db/
git commit -m "feat(db): add postgres connection pool and migration runner"
```

---

## Task 4: Seed list of creators

**Files:**
- Create: `src/modules/linkedin-ideas/seed-list.ts`
- Create: `src/modules/linkedin-ideas/types.ts`

- [ ] **Step 1: Create `src/modules/linkedin-ideas/types.ts`**

```typescript
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
```

- [ ] **Step 2: Create `src/modules/linkedin-ideas/seed-list.ts`**

```typescript
import type { SeedProfile } from './types.js';

export const SEED_PROFILES: SeedProfile[] = [
  { handle: 'wilmarocha',     name: 'Wilmar Rocha (own)',  minLikes: 50 },
  { handle: 'justinwelsh',    name: 'Justin Welsh',        minLikes: 500 },
  { handle: 'jasminalic',     name: 'Jasmin Alić',         minLikes: 500 },
  { handle: 'laraacosta',     name: 'Lara Acosta',         minLikes: 500 },
  { handle: 'matt-gray-vc',   name: 'Matt Gray',           minLikes: 500 },
  { handle: 'dickiebush',     name: 'Dickie Bush',         minLikes: 500 },
  { handle: 'nicolascole77',  name: 'Nicolas Cole',        minLikes: 500 },
  { handle: 'kierandrew',     name: 'Kieran Drew',         minLikes: 500 },
  { handle: 'chrisdonnelly1', name: 'Chris Donnelly',      minLikes: 500 },
  { handle: 'gregisenberg',   name: 'Greg Isenberg',       minLikes: 500 },
  { handle: 'alexhormozi',    name: 'Alex Hormozi',        minLikes: 1000 },
  { handle: 'codiesanchez',   name: 'Codie Sanchez',       minLikes: 1000 },
  { handle: 'sahilbloom',     name: 'Sahil Bloom',         minLikes: 1000 },
  { handle: 'dvassallo',      name: 'Daniel Vassallo',     minLikes: 500 },
  { handle: 'tibo-maker',     name: 'Tibo Louis-Lucas',    minLikes: 300 },
  { handle: 'samparr',        name: 'Sam Parr',            minLikes: 1000 },
];
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/linkedin-ideas/types.ts src/modules/linkedin-ideas/seed-list.ts
git commit -m "feat(linkedin-ideas): add types and seed list of 16 creators"
```

---

## Task 5: Proxycurl client

**Files:**
- Create: `src/modules/linkedin-ideas/proxycurl.ts`

- [ ] **Step 1: Create `src/modules/linkedin-ideas/proxycurl.ts`**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/linkedin-ideas/proxycurl.ts
git commit -m "feat(linkedin-ideas): add proxycurl client for profile posts"
```

---

## Task 6: Deduper with tests

**Files:**
- Create: `src/modules/linkedin-ideas/deduper.ts`
- Create: `tests/linkedin-ideas/deduper.test.ts`

- [ ] **Step 1: Write the failing test `tests/linkedin-ideas/deduper.test.ts`**

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/linkedin-ideas/deduper.test.ts
```

Expected: FAIL with module not found

- [ ] **Step 3: Create `src/modules/linkedin-ideas/deduper.ts`**

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/linkedin-ideas/deduper.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/modules/linkedin-ideas/deduper.ts tests/linkedin-ideas/deduper.test.ts
git commit -m "feat(linkedin-ideas): add deduper with tests"
```

---

## Task 7: Classifier with Claude Haiku

**Files:**
- Create: `src/modules/linkedin-ideas/classifier.ts`

- [ ] **Step 1: Create `src/modules/linkedin-ideas/classifier.ts`**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/linkedin-ideas/classifier.ts
git commit -m "feat(linkedin-ideas): add Claude Haiku classifier with fallback"
```

---

## Task 8: Persist to Postgres

**Files:**
- Create: `src/modules/linkedin-ideas/repository.ts`

- [ ] **Step 1: Create `src/modules/linkedin-ideas/repository.ts`**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/linkedin-ideas/repository.ts
git commit -m "feat(linkedin-ideas): add postgres repository with insert/fetch/sync"
```

---

## Task 9: Google Sheets writer

**Files:**
- Create: `src/modules/linkedin-ideas/sheets.ts`

- [ ] **Step 1: Create `src/modules/linkedin-ideas/sheets.ts`**

```typescript
import { google } from 'googleapis';
import { env } from '../../infra/env.js';
import { logger } from '../../infra/logger.js';
import type { PersistedPost } from './types.js';

const SHEET_NAME = 'Ideas';
const HEADER_ROW = [
  'Fecha scrape',
  'Autor',
  'Handle',
  'Fecha post',
  'URL',
  'Hook',
  'Cuerpo',
  'Formato',
  'Likes',
  'Comentarios',
  'Reposts',
  'Engagement Score',
  'Tema',
  'Idioma',
  'Estado',
  'Notas',
];

async function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: env.GOOGLE_SERVICE_ACCOUNT_JSON_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const authClient = await auth.getClient();
  return google.sheets({ version: 'v4', auth: authClient as never });
}

export async function ensureHeaderRow(): Promise<void> {
  const sheets = await getSheetsClient();
  const range = `${SHEET_NAME}!A1:P1`;
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: env.GOOGLE_SHEET_ID,
    range,
  });

  if (!existing.data.values || existing.data.values.length === 0) {
    logger.info('sheets: writing header row');
    await sheets.spreadsheets.values.update({
      spreadsheetId: env.GOOGLE_SHEET_ID,
      range,
      valueInputOption: 'RAW',
      requestBody: { values: [HEADER_ROW] },
    });
  }
}

function postToRow(p: PersistedPost): (string | number)[] {
  return [
    p.scrapedAt.toISOString().slice(0, 10),
    p.authorName,
    p.authorHandle,
    p.postedAt ? p.postedAt.toISOString().slice(0, 10) : '',
    p.postUrl,
    p.hook,
    p.body.length > 1000 ? p.body.slice(0, 997) + '...' : p.body,
    p.format,
    p.likes,
    p.comments,
    p.reposts,
    p.engagementScore,
    p.topic,
    p.language,
    'Nueva',
    '',
  ];
}

export async function appendPosts(posts: PersistedPost[]): Promise<void> {
  if (posts.length === 0) return;
  await ensureHeaderRow();

  const sheets = await getSheetsClient();
  const values = posts.map(postToRow);

  logger.info({ count: posts.length }, 'sheets: appending rows');

  await sheets.spreadsheets.values.append({
    spreadsheetId: env.GOOGLE_SHEET_ID,
    range: `${SHEET_NAME}!A:P`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/linkedin-ideas/sheets.ts
git commit -m "feat(linkedin-ideas): add google sheets writer with header bootstrap"
```

---

## Task 10: Telegram digest with tests

**Files:**
- Create: `src/channels/telegram.ts`
- Create: `src/modules/linkedin-ideas/digest.ts`
- Create: `tests/linkedin-ideas/digest.test.ts`

- [ ] **Step 1: Create `src/channels/telegram.ts`**

```typescript
import { Bot } from 'grammy';
import { env } from '../infra/env.js';
import { logger } from '../infra/logger.js';

export const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

export async function sendMessage(text: string): Promise<void> {
  try {
    await bot.api.sendMessage(env.TELEGRAM_DIGEST_CHAT_ID, text, {
      parse_mode: 'Markdown',
      link_preview_options: { is_disabled: true },
    });
  } catch (err) {
    logger.error({ err }, 'telegram: sendMessage failed');
    throw err;
  }
}
```

- [ ] **Step 2: Write the failing test `tests/linkedin-ideas/digest.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
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
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx vitest run tests/linkedin-ideas/digest.test.ts
```

Expected: FAIL with module not found

- [ ] **Step 4: Create `src/modules/linkedin-ideas/digest.ts`**

```typescript
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
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run tests/linkedin-ideas/digest.test.ts
```

Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add src/channels/telegram.ts src/modules/linkedin-ideas/digest.ts tests/linkedin-ideas/digest.test.ts
git commit -m "feat(linkedin-ideas): add telegram digest with formatter tests"
```

---

## Task 11: Module orchestrator

**Files:**
- Create: `src/modules/linkedin-ideas/index.ts`

- [ ] **Step 1: Create `src/modules/linkedin-ideas/index.ts`**

```typescript
import { logger } from '../../infra/logger.js';
import { SEED_PROFILES } from './seed-list.js';
import { fetchProfilePosts, sleep } from './proxycurl.js';
import { filterNewPosts } from './deduper.js';
import { classifyBatch } from './classifier.js';
import { insertPosts, fetchUnsyncedPosts, markSynced, fetchTodayTop } from './repository.js';
import { appendPosts } from './sheets.js';
import { sendDigest } from './digest.js';
import { sendMessage } from '../../channels/telegram.js';
import type { RawPost } from './types.js';

const RATE_LIMIT_MS = 3000;
const DIGEST_TOP_LIMIT = 10;

export async function runLinkedinIdeasJob(): Promise<void> {
  const start = Date.now();
  logger.info('linkedin-ideas: job start');

  let allRaw: RawPost[] = [];
  const errors: Array<{ handle: string; error: string }> = [];

  for (const profile of SEED_PROFILES) {
    try {
      const posts = await fetchProfilePosts(profile);
      allRaw = allRaw.concat(posts);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ handle: profile.handle, error: message });
      logger.warn({ handle: profile.handle, err }, 'linkedin-ideas: profile failed, continuing');
    }
    await sleep(RATE_LIMIT_MS);
  }

  logger.info({ total: allRaw.length }, 'linkedin-ideas: fetched all profiles');

  const newPosts = await filterNewPosts(allRaw);
  logger.info({ new: newPosts.length, total: allRaw.length }, 'linkedin-ideas: deduped');

  if (newPosts.length === 0) {
    logger.info('linkedin-ideas: no new posts, sending empty digest');
    await sendDigest([]);
    return;
  }

  const classified = await classifyBatch(newPosts);
  await insertPosts(classified);

  const unsynced = await fetchUnsyncedPosts();
  if (unsynced.length > 0) {
    try {
      await appendPosts(unsynced);
      await markSynced(unsynced.map((p) => p.id));
    } catch (err) {
      logger.error({ err }, 'linkedin-ideas: sheets sync failed (will retry next run)');
    }
  }

  const top = await fetchTodayTop(DIGEST_TOP_LIMIT);
  await sendDigest(top);

  if (errors.length > 0) {
    await sendMessage(
      `⚠️ *LinkedIn Ideas — errores*\n\n${errors.map((e) => `• ${e.handle}: ${e.error.slice(0, 100)}`).join('\n')}`
    );
  }

  const duration = Date.now() - start;
  logger.info({ duration_ms: duration, new: newPosts.length, errors: errors.length }, 'linkedin-ideas: job done');
}

if (process.argv.includes('--once')) {
  runLinkedinIdeasJob()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error({ err }, 'linkedin-ideas: job crashed');
      process.exit(1);
    });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/linkedin-ideas/index.ts
git commit -m "feat(linkedin-ideas): add job orchestrator with error isolation"
```

---

## Task 12: Cron scheduler + bootstrap

**Files:**
- Create: `src/scheduler/jobs.ts`
- Create: `src/index.ts`

- [ ] **Step 1: Create `src/scheduler/jobs.ts`**

```typescript
import cron from 'node-cron';
import { env } from '../infra/env.js';
import { logger } from '../infra/logger.js';
import { runLinkedinIdeasJob } from '../modules/linkedin-ideas/index.js';

export function startScheduler(): void {
  logger.info(
    { cron: env.LINKEDIN_IDEAS_CRON, tz: env.LINKEDIN_IDEAS_TIMEZONE },
    'scheduler: registering linkedin-ideas job'
  );

  cron.schedule(
    env.LINKEDIN_IDEAS_CRON,
    () => {
      logger.info('scheduler: triggering linkedin-ideas');
      runLinkedinIdeasJob().catch((err) => {
        logger.error({ err }, 'scheduler: linkedin-ideas crashed');
      });
    },
    { timezone: env.LINKEDIN_IDEAS_TIMEZONE }
  );
}
```

- [ ] **Step 2: Create `src/index.ts`**

```typescript
import { logger } from './infra/logger.js';
import { startScheduler } from './scheduler/jobs.js';

async function main(): Promise<void> {
  logger.info('aifennec-hub: starting');
  startScheduler();
  logger.info('aifennec-hub: scheduler running, waiting for cron triggers');
}

main().catch((err) => {
  logger.error({ err }, 'aifennec-hub: bootstrap failed');
  process.exit(1);
});

process.on('SIGTERM', () => {
  logger.info('aifennec-hub: SIGTERM received, exiting');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('aifennec-hub: SIGINT received, exiting');
  process.exit(0);
});
```

- [ ] **Step 3: Build to verify TypeScript compiles**

```bash
npm run build
```

Expected: dist/ directory created with no TypeScript errors.

- [ ] **Step 4: Run all tests**

```bash
npm test
```

Expected: All tests pass (deduper + digest = 9 tests)

- [ ] **Step 5: Commit**

```bash
git add src/scheduler/ src/index.ts
git commit -m "feat: add cron scheduler and bootstrap"
```

---

## Task 13: Dockerfile

**Files:**
- Create: `aifennec-hub/Dockerfile`
- Create: `aifennec-hub/.dockerignore`

- [ ] **Step 1: Create `.dockerignore`**

```
node_modules
dist
.env
.env.local
.git
coverage
tests
*.log
docs
.vitest-cache
```

- [ ] **Step 2: Create `Dockerfile`**

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/db/migrations ./dist/db/migrations
COPY package.json ./

USER node
CMD ["node", "dist/index.js"]
```

- [ ] **Step 3: Test build locally**

```bash
docker build -t aifennec-hub:dev .
```

Expected: Successfully built image

- [ ] **Step 4: Commit**

```bash
git add Dockerfile .dockerignore
git commit -m "feat: add multistage dockerfile for easypanel deploy"
```

---

## Task 14: First end-to-end test (manual)

**Goal:** Validate the entire pipeline locally with real services BEFORE deploying.

- [ ] **Step 1: Wilmar provides Postgres connection string**

Either local Postgres or VPS Postgres. Create the database:

```bash
psql "$DATABASE_URL_BASE" -c "CREATE DATABASE aifennec_hub;"
```

- [ ] **Step 2: Wilmar creates Google Sheet + Service Account**

Walkthrough:
1. Go to `https://console.cloud.google.com/`
2. Create new project "aifennec-hub"
3. Enable Google Sheets API
4. IAM → Service Accounts → Create → "aifennec-sheets-writer"
5. Create JSON key → download → save as `google-service-account.json` in project root
6. Create new Google Sheet, name it "Aifennec — LinkedIn Viral Ideas"
7. Copy Sheet ID from URL (between `/d/` and `/edit`)
8. Open Sheet → Share → add the service account email (from JSON `client_email`) as Editor
9. Add `GOOGLE_SHEET_ID` to `.env`

- [ ] **Step 3: Fill `.env` with all credentials**

Wilmar fills:
- `DATABASE_URL`
- `PROXYCURL_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_SHEET_ID`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_DIGEST_CHAT_ID=7436885108`

- [ ] **Step 4: Run migrations**

```bash
npm run migrate
```

Expected: `migration applied: 001_linkedin_posts.sql`

- [ ] **Step 5: Limit seed list to 3 profiles for first test**

Temporarily edit `src/modules/linkedin-ideas/seed-list.ts` to keep only:

```typescript
export const SEED_PROFILES: SeedProfile[] = [
  { handle: 'wilmarocha',     name: 'Wilmar Rocha (own)',  minLikes: 50 },
  { handle: 'justinwelsh',    name: 'Justin Welsh',        minLikes: 500 },
  { handle: 'jasminalic',     name: 'Jasmin Alić',         minLikes: 500 },
];
```

This burns ~3-6 Proxycurl credits (we have 10).

- [ ] **Step 6: Run the job once**

```bash
npm run scrape:once
```

Expected log sequence:
- `proxycurl: fetching posts` × 3
- `proxycurl: filtered`
- `linkedin-ideas: deduped`
- `classifier: calling Claude`
- `repository: inserted`
- `sheets: appending rows`
- `digest: sending to telegram`
- `linkedin-ideas: job done`

- [ ] **Step 7: Verify outputs**

1. Check Postgres: `psql $DATABASE_URL -c "SELECT COUNT(*) FROM linkedin_posts;"` → expect >0
2. Check Google Sheet → rows appear with all columns filled
3. Check Telegram → digest message arrives in chat 7436885108

- [ ] **Step 8: Restore full seed list of 16**

Revert the temp edit from Step 5.

- [ ] **Step 9: Commit any fixes from testing**

```bash
git add -A
git commit -m "fix: adjustments from first end-to-end test"
```

---

## Task 15: Deploy to Easypanel

**Goal:** Get the cron running 24/7 on the VPS.

- [ ] **Step 1: Push repo to GitHub or VPS Gitea**

```bash
git remote add origin <repo-url>
git push -u origin main
```

- [ ] **Step 2: Create new app in Easypanel**

In Easypanel UI:
1. Create new service → "App"
2. Name: `aifennec-hub`
3. Source: Git → paste repo URL
4. Build method: Dockerfile
5. Branch: main

- [ ] **Step 3: Configure environment variables in Easypanel**

Add all variables from `.env` (except `GOOGLE_SERVICE_ACCOUNT_JSON_PATH`):
- `DATABASE_URL` (point to internal Postgres of VPS)
- `PROXYCURL_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_SHEET_ID`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_DIGEST_CHAT_ID=7436885108`
- `LINKEDIN_IDEAS_CRON=0 6 * * *`
- `LINKEDIN_IDEAS_TIMEZONE=America/Bogota`
- `NODE_ENV=production`
- `LOG_LEVEL=info`

- [ ] **Step 4: Mount Google service account JSON**

In Easypanel: Storage → Add File Mount → upload `google-service-account.json` to `/app/google-service-account.json`.

Then add env var: `GOOGLE_SERVICE_ACCOUNT_JSON_PATH=/app/google-service-account.json`

- [ ] **Step 5: Run migrations against VPS Postgres**

Either:
- Run `npm run migrate` locally with VPS DATABASE_URL pointed at VPS, OR
- Add a one-time Easypanel "exec" command: `node dist/db/migrate.js`

- [ ] **Step 6: Deploy and watch logs**

In Easypanel: Click Deploy → wait for build → check Logs tab.

Expected: `aifennec-hub: scheduler running, waiting for cron triggers`

- [ ] **Step 7: Trigger one manual run via shell exec**

Easypanel → exec into container → run:

```bash
node dist/modules/linkedin-ideas/index.js --once
```

Verify outputs in Sheet + Telegram (same as Task 14 Step 7).

- [ ] **Step 8: Wait for first scheduled run (06:00 AM Bogotá next day)**

Verify next morning:
- Telegram digest arrives between 06:00-06:15
- Sheet has new rows
- Easypanel logs show `linkedin-ideas: job done`

- [ ] **Step 9: Final commit + tag v1.0**

```bash
git tag -a v0.1.0 -m "v0.1.0: linkedin-ideas module live"
git push origin v0.1.0
```

---

## Self-Review Checklist

Run before considering plan done:

- [x] Spec coverage: each section of the design spec maps to at least one task (sections 4, 5, 6, 7, 8, 9, 10, 12 → tasks 1-15)
- [x] No placeholders: every task has real code, real commands, real expected outputs
- [x] Type consistency: `RawPost`, `ClassifiedPost`, `PersistedPost` defined once in `types.ts`, used consistently
- [x] Function signatures match: `filterNewPosts`, `classifyBatch`, `insertPosts`, `appendPosts`, `sendDigest`, `runLinkedinIdeasJob`
- [x] Test coverage on logic-heavy units: deduper (4 tests), digest formatter (5 tests). Integration parts (proxycurl, sheets, telegram) tested manually in Task 14.
- [x] Frequent commits: each task ends with a commit
- [x] Bite-sized tasks: most tasks are 15-30 min, total ~4-5 hours

---

*Plan generated by writing-plans skill, 2026-04-11. Spec: `docs/superpowers/specs/2026-04-11-linkedin-ideas-design.md`.*
