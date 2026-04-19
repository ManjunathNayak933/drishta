-- ============================================================
-- DRISHTA — Migration 001: Core Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for trigram search

-- ============================================================
-- CONSTITUENCIES
-- ============================================================
CREATE TABLE constituencies (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              VARCHAR(255) NOT NULL,
  slug              VARCHAR(255) NOT NULL,
  state             VARCHAR(100) NOT NULL,
  state_code        CHAR(2),
  type              VARCHAR(10) CHECK (type IN ('LS', 'VS')) NOT NULL,
                    -- LS = Lok Sabha, VS = Vidhan Sabha
  eci_code          VARCHAR(20),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (slug, state, type)
);

CREATE INDEX idx_constituencies_state ON constituencies(state);
CREATE INDEX idx_constituencies_slug ON constituencies(slug);
CREATE INDEX idx_constituencies_name_trgm ON constituencies USING GIN(name gin_trgm_ops);

-- ============================================================
-- POLITICIANS
-- ============================================================
CREATE TABLE politicians (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              VARCHAR(255) NOT NULL,
  slug              VARCHAR(255) NOT NULL,
  state             VARCHAR(100) NOT NULL,
  level             VARCHAR(20) NOT NULL CHECK (level IN (
                      'Ward', 'Taluk', 'District', 'MLA', 'MP')),
  party             VARCHAR(255),
  party_short       VARCHAR(20),
  constituency_id   UUID REFERENCES constituencies(id) ON DELETE SET NULL,
  constituency_name VARCHAR(255),
  photo_url         TEXT,
  term_start        DATE,
  term_end          DATE,
  election_year     INT,
  gender            CHAR(1),
  age               INT,
  education         TEXT,
  assets            BIGINT, -- in INR from affidavit
  criminal_cases    INT DEFAULT 0,
  myneta_id         VARCHAR(50),
  sansad_id         VARCHAR(50),
  promise_score     NUMERIC(5,2) DEFAULT 0, -- recomputed by trigger
  promise_count     INT DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (slug, state)
);

CREATE INDEX idx_politicians_state ON politicians(state);
CREATE INDEX idx_politicians_constituency ON politicians(constituency_id);
CREATE INDEX idx_politicians_level ON politicians(level);
CREATE INDEX idx_politicians_name_trgm ON politicians USING GIN(name gin_trgm_ops);

-- ============================================================
-- PROMISES (live, admin-approved)
-- ============================================================
CREATE TABLE promises (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug              VARCHAR(500),
  politician_id     UUID REFERENCES politicians(id) ON DELETE CASCADE,
  politician_name   VARCHAR(255) NOT NULL, -- denormalised
  politician_level  VARCHAR(20) NOT NULL,
  constituency_id   UUID REFERENCES constituencies(id) ON DELETE SET NULL,
  constituency_name VARCHAR(255),
  party             VARCHAR(255),
  state             VARCHAR(100) NOT NULL,

  promise_text      TEXT NOT NULL,
  promise_category  VARCHAR(50) NOT NULL CHECK (promise_category IN (
                      'Infrastructure', 'Water', 'Employment', 'Health',
                      'Education', 'Electricity', 'Women Safety',
                      'Agriculture', 'Other')),
  date_made         DATE,
  source            VARCHAR(30) NOT NULL CHECK (source IN (
                      'Speech', 'Manifesto', 'Press Release',
                      'Social Media', 'Interview', 'Other')),
  source_url        TEXT,
  source_description TEXT,

  status            VARCHAR(20) DEFAULT 'Unverified' CHECK (status IN (
                      'Kept', 'In Progress', 'Partially Kept',
                      'Broken', 'Expired', 'Unverified')),
  evidence_text     TEXT,
  evidence_url      TEXT,
  term_context      TEXT,

  added_by_email    VARCHAR(255) NOT NULL,
  verified          BOOLEAN DEFAULT FALSE,
  report_count      INT DEFAULT 0,
  is_hidden         BOOLEAN DEFAULT FALSE,

  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_promises_politician ON promises(politician_id);
CREATE INDEX idx_promises_state ON promises(state);
CREATE INDEX idx_promises_status ON promises(status);
CREATE INDEX idx_promises_category ON promises(promise_category);
CREATE INDEX idx_promises_visible ON promises(is_hidden) WHERE is_hidden = FALSE;

-- ============================================================
-- PENDING PROMISES (awaiting admin approval)
-- ============================================================
CREATE TABLE pending_promises (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  politician_name   VARCHAR(255) NOT NULL,
  politician_level  VARCHAR(20) NOT NULL,
  constituency_name VARCHAR(255),
  party             VARCHAR(255),
  state             VARCHAR(100) NOT NULL,
  promise_text      TEXT NOT NULL,
  promise_category  VARCHAR(50) NOT NULL,
  date_made         DATE,
  source            VARCHAR(30) NOT NULL,
  source_url        TEXT,
  source_description TEXT,
  proof_url         TEXT,
  added_by_email    VARCHAR(255) NOT NULL,
  admin_notes       TEXT,
  status            VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
                      'pending', 'approved', 'rejected')),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at       TIMESTAMPTZ
);

-- ============================================================
-- PROMISE REPORTS (fake/inaccurate reports)
-- ============================================================
CREATE TABLE promise_reports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  promise_id      UUID NOT NULL REFERENCES promises(id) ON DELETE CASCADE,
  reporter_email  VARCHAR(255) NOT NULL,
  reason          TEXT NOT NULL,
  proof_url       TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (promise_id, reporter_email)
);

CREATE INDEX idx_promise_reports_promise ON promise_reports(promise_id);
