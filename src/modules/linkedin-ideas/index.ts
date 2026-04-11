import { logger } from '../../infra/logger.js';
import { SEED_PROFILES } from './seed-list.js';
import { fetchProfilePosts, sleep } from './apify.js';
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
