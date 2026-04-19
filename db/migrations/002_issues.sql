-- ============================================================
-- DRISHTA — Migration 002: Issue Board Schema
-- ============================================================

CREATE TABLE issues (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug              VARCHAR(500),
  title             VARCHAR(200) NOT NULL,
  description       TEXT NOT NULL,
  category          VARCHAR(50) NOT NULL CHECK (category IN (
                      'Roads', 'Water Supply', 'Electricity', 'Sanitation',
                      'Public Safety', 'Healthcare', 'Education', 'Other')),
  state             VARCHAR(100) NOT NULL,
  constituency_id   UUID REFERENCES constituencies(id) ON DELETE SET NULL,
  constituency_name VARCHAR(255),

  -- Auto-tagged politicians
  mla_id            UUID REFERENCES politicians(id) ON DELETE SET NULL,
  mla_name          VARCHAR(255),
  mp_id             UUID REFERENCES politicians(id) ON DELETE SET NULL,
  mp_name           VARCHAR(255),

  -- Evidence
  photo_url         TEXT NOT NULL,  -- MANDATORY

  -- Submitter
  submitter_name    VARCHAR(100),
  submitter_email   VARCHAR(255) NOT NULL,

  -- Status
  status            VARCHAR(20) DEFAULT 'Open' CHECK (status IN (
                      'Open', 'Acknowledged', 'Resolved', 'Disputed')),

  -- Counts
  upvote_count      INT DEFAULT 0,
  report_count      INT DEFAULT 0,
  is_hidden         BOOLEAN DEFAULT FALSE,

  -- Moderation
  verified          BOOLEAN DEFAULT FALSE,

  -- Location detail
  location_text     TEXT,
  ward              VARCHAR(100),

  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_issues_state ON issues(state);
CREATE INDEX idx_issues_constituency ON issues(constituency_id);
CREATE INDEX idx_issues_status ON issues(status);
CREATE INDEX idx_issues_category ON issues(category);
CREATE INDEX idx_issues_mla ON issues(mla_id);
CREATE INDEX idx_issues_mp ON issues(mp_id);
CREATE INDEX idx_issues_visible ON issues(is_hidden) WHERE is_hidden = FALSE;
CREATE INDEX idx_issues_created ON issues(created_at DESC);
CREATE INDEX idx_issues_upvotes ON issues(upvote_count DESC);

-- Issue fake reports
CREATE TABLE issue_reports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id        UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  reporter_email  VARCHAR(255) NOT NULL,
  reason          TEXT NOT NULL,
  proof_url       TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (issue_id, reporter_email)
);

CREATE INDEX idx_issue_reports_issue ON issue_reports(issue_id);

-- Issue upvotes (one per email per issue)
CREATE TABLE issue_upvotes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id    UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  voter_email VARCHAR(255) NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (issue_id, voter_email)
);

CREATE INDEX idx_issue_upvotes_issue ON issue_upvotes(issue_id);
