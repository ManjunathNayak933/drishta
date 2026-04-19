-- ============================================================
-- DRISHTA — Migration 003: News & Channels Schema
-- ============================================================

-- ============================================================
-- CHANNELS
-- ============================================================
CREATE TABLE channels (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug          VARCHAR(100) NOT NULL UNIQUE,
  name          VARCHAR(255) NOT NULL,
  tagline       TEXT,
  logo_url      TEXT,
  accent_color  CHAR(7) DEFAULT '#b8860b', -- hex
  owner_email   VARCHAR(255) NOT NULL,
  approved      BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_channels_slug ON channels(slug);
CREATE INDEX idx_channels_approved ON channels(approved);

-- Channel applications (before approval)
CREATE TABLE channel_applications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(255) NOT NULL,
  tagline       TEXT,
  logo_url      TEXT,
  accent_color  CHAR(7),
  applicant_email VARCHAR(255) NOT NULL,
  motivation    TEXT,
  sample_url    TEXT,
  status        VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
                  'pending', 'approved', 'rejected')),
  admin_notes   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at   TIMESTAMPTZ
);

-- ============================================================
-- NEWS ARTICLES
-- ============================================================
CREATE TABLE news_articles (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug              VARCHAR(500) NOT NULL UNIQUE,
  channel_id        UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  channel_slug      VARCHAR(100),
  channel_name      VARCHAR(255),

  -- Content
  title             VARCHAR(500) NOT NULL,
  subheadline       TEXT,
  cover_image_url   TEXT,
  body              TEXT NOT NULL,  -- TipTap JSON stored as text
  body_html         TEXT,           -- rendered HTML for SSR
  excerpt           TEXT,

  -- Authorship
  author_name       VARCHAR(255),
  author_email      VARCHAR(255),

  -- Categorisation
  category          VARCHAR(100),

  -- Linked entities
  politician_ids    UUID[] DEFAULT '{}',
  issue_ids         UUID[] DEFAULT '{}',
  promise_ids       UUID[] DEFAULT '{}',

  -- Status
  status            VARCHAR(20) DEFAULT 'draft' CHECK (status IN (
                      'draft', 'published', 'unpublished')),
  published_at      TIMESTAMPTZ,

  -- Moderation
  report_count      INT DEFAULT 0,
  is_hidden         BOOLEAN DEFAULT FALSE,

  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_articles_channel ON news_articles(channel_id);
CREATE INDEX idx_articles_slug ON news_articles(slug);
CREATE INDEX idx_articles_status ON news_articles(status);
CREATE INDEX idx_articles_published ON news_articles(published_at DESC)
  WHERE status = 'published';
CREATE INDEX idx_articles_politician_ids ON news_articles USING GIN(politician_ids);
CREATE INDEX idx_articles_issue_ids ON news_articles USING GIN(issue_ids);

CREATE TABLE article_reports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id      UUID NOT NULL REFERENCES news_articles(id) ON DELETE CASCADE,
  reporter_email  VARCHAR(255) NOT NULL,
  reason          TEXT NOT NULL,
  proof_url       TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (article_id, reporter_email)
);
