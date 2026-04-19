-- ============================================================
-- DRISHTA — Migration 004: Triggers, Functions, RLS
-- ============================================================

-- ============================================================
-- SLUG GENERATION
-- ============================================================

CREATE OR REPLACE FUNCTION generate_slug(text_in TEXT)
RETURNS TEXT AS $$
  SELECT lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(trim(text_in), '[^a-zA-Z0-9\s-]', '', 'g'),
        '\s+', '-', 'g'
      ),
      '-{2,}', '-', 'g'
    )
  );
$$ LANGUAGE SQL IMMUTABLE;

-- Auto-generate issue slug from title + created date
CREATE OR REPLACE FUNCTION set_issue_slug()
RETURNS TRIGGER AS $$
BEGIN
  NEW.slug := generate_slug(NEW.title) || '-' || 
              to_char(NOW(), 'YYYYMMDD');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER issue_slug_trigger
  BEFORE INSERT ON issues
  FOR EACH ROW
  WHEN (NEW.slug IS NULL OR NEW.slug = '')
  EXECUTE FUNCTION set_issue_slug();

-- Auto-generate promise slug
CREATE OR REPLACE FUNCTION set_promise_slug()
RETURNS TRIGGER AS $$
BEGIN
  NEW.slug := generate_slug(NEW.politician_name) || '-' ||
              generate_slug(substring(NEW.promise_text, 1, 60)) || '-' ||
              to_char(NOW(), 'YYYYMMDD');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER promise_slug_trigger
  BEFORE INSERT ON promises
  FOR EACH ROW
  WHEN (NEW.slug IS NULL OR NEW.slug = '')
  EXECUTE FUNCTION set_promise_slug();

-- ============================================================
-- AUTO-HIDE AT 5 REPORTS
-- ============================================================

-- Promises
CREATE OR REPLACE FUNCTION check_promise_reports()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE promises
  SET report_count = (
    SELECT COUNT(*) FROM promise_reports WHERE promise_id = NEW.promise_id
  ),
  is_hidden = (
    SELECT COUNT(*) >= 5 FROM promise_reports WHERE promise_id = NEW.promise_id
  )
  WHERE id = NEW.promise_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER promise_report_trigger
  AFTER INSERT ON promise_reports
  FOR EACH ROW
  EXECUTE FUNCTION check_promise_reports();

-- Issues
CREATE OR REPLACE FUNCTION check_issue_reports()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE issues
  SET report_count = (
    SELECT COUNT(*) FROM issue_reports WHERE issue_id = NEW.issue_id
  ),
  is_hidden = (
    SELECT COUNT(*) >= 5 FROM issue_reports WHERE issue_id = NEW.issue_id
  )
  WHERE id = NEW.issue_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER issue_report_trigger
  AFTER INSERT ON issue_reports
  FOR EACH ROW
  EXECUTE FUNCTION check_issue_reports();

-- Articles
CREATE OR REPLACE FUNCTION check_article_reports()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE news_articles
  SET report_count = (
    SELECT COUNT(*) FROM article_reports WHERE article_id = NEW.article_id
  ),
  is_hidden = (
    SELECT COUNT(*) >= 5 FROM article_reports WHERE article_id = NEW.article_id
  )
  WHERE id = NEW.article_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER article_report_trigger
  AFTER INSERT ON article_reports
  FOR EACH ROW
  EXECUTE FUNCTION check_article_reports();

-- ============================================================
-- UPVOTE COUNT SYNC
-- ============================================================

CREATE OR REPLACE FUNCTION sync_issue_upvotes()
RETURNS TRIGGER AS $$
DECLARE
  target_issue_id UUID;
BEGIN
  target_issue_id := COALESCE(NEW.issue_id, OLD.issue_id);
  UPDATE issues
  SET upvote_count = (
    SELECT COUNT(*) FROM issue_upvotes WHERE issue_id = target_issue_id
  )
  WHERE id = target_issue_id;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER issue_upvote_trigger
  AFTER INSERT OR DELETE ON issue_upvotes
  FOR EACH ROW
  EXECUTE FUNCTION sync_issue_upvotes();

-- ============================================================
-- POLITICIAN PROMISE SCORE (recomputed on promise status change)
-- ============================================================

CREATE OR REPLACE FUNCTION recompute_promise_score()
RETURNS TRIGGER AS $$
DECLARE
  p_id UUID;
  total INT;
  kept NUMERIC;
BEGIN
  p_id := COALESCE(NEW.politician_id, OLD.politician_id);
  IF p_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT COUNT(*) INTO total
  FROM promises
  WHERE politician_id = p_id AND is_hidden = FALSE
  AND status != 'Unverified';

  IF total = 0 THEN
    UPDATE politicians SET promise_score = 0, promise_count = 0
    WHERE id = p_id;
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT (
    SUM(CASE
      WHEN status = 'Kept'           THEN 1.0
      WHEN status = 'Partially Kept' THEN 0.5
      WHEN status = 'In Progress'    THEN 0.25
      WHEN status = 'Broken'         THEN 0.0
      WHEN status = 'Expired'        THEN 0.0
      ELSE 0.0
    END) / total * 100
  ) INTO kept
  FROM promises
  WHERE politician_id = p_id AND is_hidden = FALSE
  AND status != 'Unverified';

  UPDATE politicians
  SET promise_score = ROUND(kept, 1),
      promise_count = total,
      updated_at = NOW()
  WHERE id = p_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER promise_score_trigger
  AFTER INSERT OR UPDATE OF status, is_hidden OR DELETE ON promises
  FOR EACH ROW
  EXECUTE FUNCTION recompute_promise_score();

-- ============================================================
-- UPDATED_AT TIMESTAMP SYNC
-- ============================================================

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER politicians_updated_at
  BEFORE UPDATE ON politicians
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER promises_updated_at
  BEFORE UPDATE ON promises
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER issues_updated_at
  BEFORE UPDATE ON issues
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER channels_updated_at
  BEFORE UPDATE ON channels
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER articles_updated_at
  BEFORE UPDATE ON news_articles
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE constituencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE politicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE promises ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_promises ENABLE ROW LEVEL SECURITY;
ALTER TABLE promise_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_upvotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_reports ENABLE ROW LEVEL SECURITY;

-- Public read policies (non-hidden content)
CREATE POLICY "Public read constituencies" ON constituencies
  FOR SELECT USING (true);

CREATE POLICY "Public read politicians" ON politicians
  FOR SELECT USING (true);

CREATE POLICY "Public read visible promises" ON promises
  FOR SELECT USING (is_hidden = FALSE);

CREATE POLICY "Public read visible issues" ON issues
  FOR SELECT USING (is_hidden = FALSE);

CREATE POLICY "Public read published articles" ON news_articles
  FOR SELECT USING (status = 'published' AND is_hidden = FALSE);

CREATE POLICY "Public read approved channels" ON channels
  FOR SELECT USING (approved = TRUE);

-- Public insert policies
CREATE POLICY "Public submit issues" ON issues
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public submit pending promises" ON pending_promises
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public report promises" ON promise_reports
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public report issues" ON issue_reports
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public upvote issues" ON issue_upvotes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public report articles" ON article_reports
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public apply for channel" ON channel_applications
  FOR INSERT WITH CHECK (true);

-- Service role can do everything (used by admin and server-side)
-- (Supabase service role bypasses RLS by default)
