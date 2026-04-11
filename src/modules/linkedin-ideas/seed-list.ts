import type { SeedProfile } from './types.js';

// FULL seed list (16 profiles) — commented for test mode.
// Uncomment after first successful E2E run to enable full cron.
/*
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
*/

// TEST MODE: 3 profiles only. Burns ~6 Proxycurl credits per run.
export const SEED_PROFILES: SeedProfile[] = [
  { handle: 'wilmarocha',  name: 'Wilmar Rocha (own)', minLikes: 50 },
  { handle: 'justinwelsh', name: 'Justin Welsh',       minLikes: 500 },
  { handle: 'jasminalic',  name: 'Jasmin Alić',        minLikes: 500 },
];
