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
