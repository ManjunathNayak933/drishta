/**
 * DRISHTA — API Layer
 *
 * This is the ONLY file in the codebase that imports Supabase.
 * All pages and components must call these functions.
 * This is the GCP migration boundary: replace implementations with
 * fetch() calls to an Express API and zero other changes are needed.
 */

import { supabase, supabaseAdmin } from './supabase';

// ============================================================
// CONSTITUENCIES
// ============================================================

// States are fixed — hardcoded is faster and more reliable than any DB query
const INDIAN_STATES = [
  'Andaman and Nicobar Islands','Andhra Pradesh','Arunachal Pradesh','Assam',
  'Bihar','Chandigarh','Chhattisgarh','Dadra and Nagar Haveli',
  'Delhi','Goa','Gujarat','Haryana','Himachal Pradesh',
  'Jammu and Kashmir','Jharkhand','Karnataka','Kerala','Ladakh','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha',
  'Puducherry','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
];

export async function getStates() {
  return INDIAN_STATES.map(s => ({ state: s }));
}

export async function getConstituenciesByState(state, query = '') {
  // Only fetch 20 at a time — search on keypress, don't load all 400+ upfront
  const req = supabase
    .from('constituencies')
    .select('id, name, slug, type')
    .eq('state', state)
    .order('type')
    .order('name')
    .limit(20);

  if (query && query.length >= 1) {
    req.ilike('name', `%${query}%`);
  }

  const { data, error } = await req;
  if (error) throw error;
  return data ?? [];
}

export async function getConstituencyById(id) {
  const { data, error } = await supabase
    .from('constituencies')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function getConstituencyBySlug(state, slug) {
  const { data, error } = await supabase
    .from('constituencies')
    .select('*')
    .eq('state', state)
    .eq('slug', slug)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function searchConstituencies(query) {
  const { data, error } = await supabase
    .from('constituencies')
    .select('id, name, slug, state, type')
    .ilike('name', `%${query}%`)
    .limit(10);
  if (error) throw error;
  return data;
}

// ============================================================
// POLITICIANS
// ============================================================

export async function getPoliticianBySlug(state, slug) {
  const { data, error } = await supabase
    .from('politicians')
    .select(`
      *,
      constituency:constituencies(id, name, slug, state, type)
    `)
    .eq('state', state)
    .eq('slug', slug)
    .single();
  if (error) throw error;
  return data;
}

export async function getPoliticiansByConstituency(constituencyId) {
  const { data: direct, error } = await supabase
    .from('politicians')
    .select('id, name, slug, state, level, party, party_short, photo_url, promise_score, promise_count, term_start, term_end, constituency_id, constituency_name')
    .eq('constituency_id', constituencyId)
    .in('level', ['MLA', 'MP']);
  if (error) throw error;

  const hasMLA = (direct ?? []).some(p => p.level === 'MLA');
  const hasMP  = (direct ?? []).some(p => p.level === 'MP');

  if (hasMLA && !hasMP) {
    const { data: mapping } = await supabase
      .from('vs_ls_map')
      .select('ls_constituency_id')
      .eq('vs_constituency_id', constituencyId)
      .maybeSingle();

    if (mapping?.ls_constituency_id) {
      const { data: mpData } = await supabase
        .from('politicians')
        .select('id, name, slug, state, level, party, party_short, photo_url, promise_score, promise_count, term_start, term_end, constituency_id, constituency_name')
        .eq('constituency_id', mapping.ls_constituency_id)
        .eq('level', 'MP')
        .maybeSingle();
      if (mpData) return [...(direct ?? []), mpData];
    }
  }

  return direct ?? [];
}

export async function searchPoliticians(query, state = null) {
  let q = supabase
    .from('politicians')
    .select('id, name, slug, state, level, party, constituency_name, photo_url')
    .ilike('name', `%${query}%`)
    .limit(10);
  if (state) q = q.eq('state', state);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function getPoliticiansForCompare(slugA, stateA, slugB, stateB) {
  const [a, b] = await Promise.all([
    getPoliticianBySlug(stateA, slugA),
    getPoliticianBySlug(stateB, slugB),
  ]);
  return { a, b };
}

// ============================================================
// PROMISES
// ============================================================

export async function getPromisesByPolitician(politicianId, { limit = 50, offset = 0 } = {}) {
  const { data, error } = await supabase
    .from('promises')
    .select('*')
    .eq('politician_id', politicianId)
    .eq('is_hidden', false)
    .order('date_made', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return data;
}

export async function getPromiseById(id) {
  const { data, error } = await supabase
    .from('promises')
    .select(`
      *,
      politician:politicians(id, name, slug, state, party, photo_url, level)
    `)
    .eq('id', id)
    .eq('is_hidden', false)
    .single();
  if (error) throw error;
  return data;
}

export async function getPromises({
  state,
  constituency,
  category,
  status,
  politicianId,
  limit = 30,
  offset = 0,
} = {}) {
  let q = supabase
    .from('promises')
    .select('*, politician:politicians(id, name, slug, state, photo_url, level, party)', { count: 'exact' })
    .eq('is_hidden', false)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (state) q = q.eq('state', state);
  if (constituency) q = q.eq('constituency_name', constituency);
  if (category) q = q.eq('promise_category', category);
  if (status) q = q.eq('status', status);
  if (politicianId) q = q.eq('politician_id', politicianId);

  const { data, error, count } = await q;
  if (error) throw error;
  return { data, total: count };
}

export async function submitPromise(formData) {
  const { data, error } = await supabase
    .from('pending_promises')
    .insert([formData])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function reportPromise({ promiseId, reporterEmail, reason, proofUrl }) {
  const { data, error } = await supabase
    .from('promise_reports')
    .insert([{
      promise_id: promiseId,
      reporter_email: reporterEmail,
      reason,
      proof_url: proofUrl,
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================================
// ISSUES
// ============================================================

export async function getIssues({
  state,
  constituencyId,
  category,
  status,
  limit = 30,
  offset = 0,
  sort = 'newest',
} = {}) {
  let q = supabase
    .from('issues')
    .select('*', { count: 'exact' })
    .eq('is_hidden', false);

  if (state) q = q.eq('state', state);
  if (constituencyId) q = q.eq('constituency_id', constituencyId);
  if (category) q = q.eq('category', category);
  if (status) q = q.eq('status', status);

  if (sort === 'upvotes') q = q.order('upvote_count', { ascending: false });
  else q = q.order('created_at', { ascending: false });

  q = q.range(offset, offset + limit - 1);

  const { data, error, count } = await q;
  if (error) throw error;
  return { data, total: count };
}

export async function getIssueById(id) {
  const { data, error } = await supabase
    .from('issues')
    .select(`
      *,
      mla:politicians!issues_mla_id_fkey(id, name, slug, state, party, photo_url),
      mp:politicians!issues_mp_id_fkey(id, name, slug, state, party, photo_url)
    `)
    .eq('id', id)
    .eq('is_hidden', false)
    .single();
  if (error) throw error;
  return data;
}

export async function getIssuesByConstituency(state, constituencySlug) {
  const constituency = await getConstituencyBySlug(state, constituencySlug);
  if (!constituency) return null;

  const { data: issues, total } = await getIssues({
    constituencyId: constituency.id,
    limit: 100,
  });

  const politicians = await getPoliticiansByConstituency(constituency.id);

  return { constituency, issues, total, politicians };
}

export async function submitIssue(formData) {
  // Route through API to use service role key (bypasses RLS on new columns)
  const res = await fetch('/api/submit-issue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  });
  const result = await res.json();
  if (result.error) throw new Error(result.error);
  return result.data;
}

export async function upvoteIssue(issueId, voterEmail) {
  const { data, error } = await supabase
    .from('issue_upvotes')
    .insert([{ issue_id: issueId, voter_email: voterEmail }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function reportIssue({ issueId, reporterEmail, reason, proofUrl }) {
  const { data, error } = await supabase
    .from('issue_reports')
    .insert([{
      issue_id: issueId,
      reporter_email: reporterEmail,
      reason,
      proof_url: proofUrl,
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getTopConstituenciesByIssues(limit = 10) {
  const { data, error } = await supabase
    .from('issues')
    .select('constituency_name, state')
    .eq('is_hidden', false)
    .eq('status', 'Open');
  if (error) throw error;
  // Count in JS (no GROUP BY in Supabase JS client without RPC)
  const counts = {};
  for (const r of data ?? []) {
    const key = `${r.constituency_name}||${r.state}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, count]) => {
      const [name, state] = key.split('||');
      return { name, state, count };
    });
}

// ============================================================
// NEWS ARTICLES
// ============================================================

export async function getArticles({ channelId, category, limit = 20, offset = 0 } = {}) {
  let q = supabase
    .from('news_articles')
    .select('id, slug, title, subheadline, cover_image_url, excerpt, author_name, published_at, category, channel_id, channel_slug, channel_name', { count: 'exact' })
    .eq('status', 'published')
    .eq('is_hidden', false)
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (channelId) q = q.eq('channel_id', channelId);
  if (category) q = q.eq('category', category);

  const { data, error, count } = await q;
  if (error) throw error;
  return { data, total: count };
}

export async function getArticleBySlug(slug) {
  const { data, error } = await supabase
    .from('news_articles')
    .select(`
      *,
      channel:channels(id, name, slug, logo_url, accent_color)
    `)
    .eq('slug', slug)
    .eq('status', 'published')
    .eq('is_hidden', false)
    .single();
  if (error) throw error;
  return data;
}

export async function getArticlesByPolitician(politicianId, limit = 5) {
  const { data, error } = await supabase
    .from('news_articles')
    .select('id, slug, title, published_at, cover_image_url, channel_name')
    .eq('status', 'published')
    .eq('is_hidden', false)
    .contains('politician_ids', [politicianId])
    .order('published_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return data;
}

// ============================================================
// CHANNELS
// ============================================================

export async function getChannelBySlug(slug) {
  const { data, error } = await supabase
    .from('channels')
    .select('*')
    .eq('slug', slug)
    .eq('approved', true)
    .single();
  if (error) throw error;
  return data;
}

export async function applyForChannel(formData) {
  const { data, error } = await supabase
    .from('channel_applications')
    .insert([formData])
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================================
// FILE UPLOAD (Supabase Storage)
// ============================================================

export async function uploadFile(bucket, path, file) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);
  return publicUrl;
}

// ============================================================
// ADMIN — write operations go via /api/admin route (server-side)
// so SUPABASE_SERVICE_ROLE_KEY is available. Read-only ops use
// supabaseAdmin directly (anon key is fine for SELECT with RLS).
// ============================================================

async function adminPost(action, params) {
  // Get current session token to verify admin identity server-side
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? '';

  const res = await fetch('/api/admin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ action, ...params }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Admin action failed');
  return data;
}

export async function adminGetPendingPromises() {
  const { data, error } = await supabaseAdmin
    .from('pending_promises')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function adminApprovePromise(pendingId, politicianId) {
  return adminPost('approvePromise', { pendingId, politicianId });
}

export async function adminRejectPromise(pendingId, notes) {
  return adminPost('rejectPromise', { pendingId, notes });
}

export async function adminGetReports() {
  const [promiseReports, issueReports, articleReports] = await Promise.all([
    supabaseAdmin
      .from('promise_reports')
      .select('*, promise:promises(id, promise_text, politician_name, is_hidden)')
      .order('created_at', { ascending: false })
      .limit(100),
    supabaseAdmin
      .from('issue_reports')
      .select('*, issue:issues(id, title, is_hidden)')
      .order('created_at', { ascending: false })
      .limit(100),
    supabaseAdmin
      .from('article_reports')
      .select('*, article:news_articles(id, title, is_hidden)')
      .order('created_at', { ascending: false })
      .limit(100),
  ]);
  return {
    promises: promiseReports.data ?? [],
    issues: issueReports.data ?? [],
    articles: articleReports.data ?? [],
  };
}

export async function adminRestoreContent(table, id) {
  return adminPost('restoreContent', { table, id });
}

export async function adminDeleteContent(table, id) {
  return adminPost('deleteContent', { table, id });
}

export async function adminGetStats() {
  const [pending, openIssues, channelApps] = await Promise.all([
    supabaseAdmin.from('pending_promises').select('id', { count: 'exact' }).eq('status', 'pending'),
    supabaseAdmin.from('issues').select('id', { count: 'exact' }).eq('status', 'Open').eq('is_hidden', false),
    supabaseAdmin.from('channel_applications').select('id', { count: 'exact' }).eq('status', 'pending'),
  ]);
  return {
    pendingPromises: pending.count ?? 0,
    openIssues: openIssues.count ?? 0,
    pendingChannels: channelApps.count ?? 0,
  };
}

export async function adminUpdatePromiseStatus(promiseId, status, evidenceText, evidenceUrl) {
  return adminPost('updatePromiseStatus', { promiseId, status, evidenceText, evidenceUrl });
}

export async function adminApproveChannel(applicationId) {
  return adminPost('approveChannel', { applicationId });
}

export async function adminGetChannelApplications() {
  const { data, error } = await supabaseAdmin
    .from('channel_applications')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function adminRejectChannel(applicationId, notes) {
  return adminPost('rejectChannel', { applicationId, notes });
}

// ============================================================
// CHANNEL DASHBOARD (authenticated channel owner)
// ============================================================

export async function getChannelByOwnerEmail(email) {
  const { data, error } = await supabase
    .from('channels')
    .select('*')
    .eq('owner_email', email)
    .eq('approved', true)
    .single();
  if (error) return null;
  return data;
}

export async function getArticlesByChannel(channelId) {
  const { data, error } = await supabase
    .from('news_articles')
    .select('id, slug, title, status, published_at, cover_image_url, category')
    .eq('channel_id', channelId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getArticleById(id) {
  const { data, error } = await supabase
    .from('news_articles')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function saveArticle({ id, channelId, channelSlug, channelName, title, subheadline, body, bodyHtml, excerpt, coverImageUrl, category, authorName, authorEmail, status, politicianIds, issueIds }) {
  const slug = title
    ? title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').slice(0, 80) + '-' + Date.now()
    : null;

  const payload = {
    channel_id: channelId,
    channel_slug: channelSlug,
    channel_name: channelName,
    title,
    subheadline,
    body,
    body_html: bodyHtml,
    excerpt: excerpt ?? body?.replace(/<[^>]+>/g, '').slice(0, 200),
    cover_image_url: coverImageUrl,
    category,
    author_name: authorName,
    author_email: authorEmail,
    status: status ?? 'draft',
    politician_ids: politicianIds ?? [],
    issue_ids: issueIds ?? [],
    ...(status === 'published' ? { published_at: new Date().toISOString() } : {}),
  };

  if (id && id !== 'new') {
    // Update existing
    const { data, error } = await supabase
      .from('news_articles')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    // Create new
    const { data, error } = await supabase
      .from('news_articles')
      .insert([{ ...payload, slug }])
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

export async function deleteArticle(id) {
  const { error } = await supabase
    .from('news_articles')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function getParliamentPerformance(politicianId) {
  const { data, error } = await supabase
    .from('parliament_performance')
    .select('*')
    .eq('politician_id', politicianId)
    .order('last_scraped', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data;
}

export async function getMlaHistory(constituencyId) {
  const { data, error } = await supabase
    .from('mla_history')
    .select('term_year, name, party')
    .eq('constituency_id', constituencyId)
    .order('term_year', { ascending: false });
  if (error) return [];
  return data ?? [];
}

export async function getConstituencyWithHistory(constituencyId) {
  const { data, error } = await supabase
    .from('constituencies')
    .select('id, name, state, type, formed_year, wikipedia_url')
    .eq('id', constituencyId)
    .single();
  if (error) return null;
  return data;
}

export async function submitDataReport({ type, state, constituencyName, constituencyId, politicianName, politicianId, description, suggestedFix, reportedBy }) {
  const { data, error } = await supabase
    .from('data_reports')
    .insert([{
      type,
      state,
      constituency_name: constituencyName,
      constituency_id: constituencyId ?? null,
      politician_name: politicianName ?? null,
      politician_id: politicianId ?? null,
      description,
      suggested_fix: suggestedFix ?? null,
      reported_by: reportedBy ?? null,
    }])
    .select().single();
  if (error) throw error;
  return data;
}

export async function adminGetDataReports() {
  const { data, error } = await supabaseAdmin
    .from('data_reports')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getAllLSConstituencies(state) {
  const { data, error } = await supabase
    .from('constituencies')
    .select('id, name')
    .eq('state', state)
    .eq('type', 'LS')
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function getStateGovernment(state) {
  const { data, error } = await supabase
    .from('state_governments')
    .select('*')
    .eq('state', state)
    .maybeSingle();
  if (error) return null;
  return data;
}

export async function getStateMinisters(state) {
  const { data, error } = await supabase
    .from('state_ministers')
    .select(`
      *,
      politician:politician_id (
        id, slug, state, constituency_name, level, election_year
      )
    `)
    .eq('state', state)
    .order('rank', { ascending: true })
    .order('is_cm', { ascending: false })
    .order('is_deputy_cm', { ascending: false })
    .order('name');
  if (error) return [];
  return data ?? [];
}

export async function getStateBudgets(state) {
  const { data, error } = await supabase
    .from('state_budgets')
    .select('*')
    .eq('state', state)
    .order('year', { ascending: false })
    .limit(3);
  if (error) return [];
  return data ?? [];
}

export async function getStateAnnouncements(state) {
  const { data, error } = await supabase
    .from('state_announcements')
    .select('*')
    .eq('state', state)
    .order('scraped_at', { ascending: false })
    .limit(20);
  if (error) return [];
  return data ?? [];
}

export async function getAllPoliticianSlugs() {
  const { data } = await supabaseAdmin
    .from('politicians')
    .select('state, slug, updated_at');
  return data ?? [];
}

export async function getAllIssueSlugs() {
  const { data } = await supabaseAdmin
    .from('issues')
    .select('id, slug, updated_at')
    .eq('is_hidden', false);
  return data ?? [];
}

export async function getAllArticleSlugs() {
  const { data } = await supabaseAdmin
    .from('news_articles')
    .select('slug, updated_at')
    .eq('status', 'published')
    .eq('is_hidden', false);
  return data ?? [];
}

export async function getAllPromiseSlugs() {
  const { data } = await supabaseAdmin
    .from('promises')
    .select('id, slug, updated_at')
    .eq('is_hidden', false);
  return data ?? [];
}

// ── MINISTER ISSUES ───────────────────────────────────────────────────────────

export async function getIssuesByMinister(ministerId) {
  // Issues where this minister is tagged
  const { data, error } = await supabase
    .from('issues')
    .select('*')
    .contains('tagged_minister_ids', [ministerId])
    .eq('is_hidden', false)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return [];
  return data ?? [];
}

export async function getIssuesByPoliticianAndMinister(politicianId, ministerId) {
  // All issues for a politician who is also a minister:
  // constituency issues (mla_id or mp_id) + minister-tagged issues
  const [constIssues, ministerIssues] = await Promise.all([
    supabase.from('issues').select('*')
      .or(`mla_id.eq.${politicianId},mp_id.eq.${politicianId}`)
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(r => r.data ?? []),
    ministerId ? supabase.from('issues').select('*')
      .contains('tagged_minister_ids', [ministerId])
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(r => r.data ?? []) : Promise.resolve([]),
  ]);
  // Remove duplicates (same issue tagged both ways)
  const seen = new Set(constIssues.map(i => i.id));
  const uniqueMinisterIssues = ministerIssues.filter(i => !seen.has(i.id));
  return { constituencyIssues: constIssues, ministerIssues: uniqueMinisterIssues };
}
