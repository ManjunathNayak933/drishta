-- ============================================================
-- DRISHTA — Migration 005: Parliament Performance
-- ============================================================

CREATE TABLE IF NOT EXISTS parliament_performance (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  politician_id     UUID REFERENCES politicians(id) ON DELETE CASCADE,
  politician_name   VARCHAR(255) NOT NULL,
  level             VARCHAR(20)  NOT NULL CHECK (level IN ('MP', 'MLA')),
  state             VARCHAR(100) NOT NULL,
  house             VARCHAR(100),            -- 'Lok Sabha', 'Karnataka Vidhan Sabha', etc.
  term              VARCHAR(100),            -- '18th Lok Sabha (2024–2029)'
  attendance_pct    NUMERIC(5,2),            -- percentage (0–100)
  days_signed       INT,                     -- days attendance register was signed
  questions_asked   INT,
  debates_count     INT,
  bills_introduced  INT,
  source_url        TEXT,
  last_scraped      TIMESTAMPTZ DEFAULT NOW(),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (politician_id, term)
);

CREATE INDEX IF NOT EXISTS idx_perf_politician ON parliament_performance(politician_id);
CREATE INDEX IF NOT EXISTS idx_perf_state      ON parliament_performance(state);
CREATE INDEX IF NOT EXISTS idx_perf_level      ON parliament_performance(level);

-- RLS: public read
ALTER TABLE parliament_performance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_performance" ON parliament_performance
  FOR SELECT USING (true);
