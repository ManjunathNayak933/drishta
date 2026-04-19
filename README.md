# Drishta — Civic Accountability Platform for India

> "See what was promised. See what was done."

A full-stack civic accountability platform built with Next.js 14, Supabase, and Tailwind CSS.
Deployed on Cloudflare Pages.

---

## Sections

| Section | Routes | Purpose |
|---|---|---|
| **Homepage** | `/` | Constituency search engine |
| **Promise Tracker** | `/promises`, `/politician/...`, `/promise/...` | Track electoral promises |
| **Issue Board** | `/issues`, `/issue/...`, `/submit/issue` | Civic problems with photo evidence |
| **News** | `/news`, `/news/article/...`, `/channel/...` | Independent civic journalism |
| **Admin** | `/admin` | Moderation panel |

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

```bash
cp .env.example .env.local
# Fill in your Supabase credentials
```

### 3. Run database migrations

In the Supabase SQL editor, run in order:

```
db/migrations/001_schema.sql
db/migrations/002_issues.sql
db/migrations/003_news_channels.sql
db/migrations/004_triggers_rls.sql
```

### 4. Seed politician data

```bash
# Scrapes ~4650 politicians from MyNeta.info + Sansad.in
# Takes 25–45 minutes. Re-runnable safely.
node scrapers/run.js
```

### 5. Dev server

```bash
npm run dev
```

---

## Architecture

### Database boundary

**`src/lib/api.js` is the ONLY file that imports Supabase.**

Every page and component calls `api.js` functions. To migrate from Supabase to GCP Cloud Run + Cloud SQL:
1. Replace `api.js` implementations with `fetch()` calls to an Express API
2. Zero other changes required

### Rendering strategy

| Page | Strategy | Why |
|---|---|---|
| Homepage | Client | Search interaction |
| Politician profiles | ISR (24h) | SEO + infrequent updates |
| Promise detail | SSR | Fresh report counts |
| Issues feed | SSR | SEO + live data |
| Issue detail | Client | Upvote interaction |
| News articles | SSR | Google News requirement |

### Promise Score formula

```
score = (Kept×1.0 + Partially Kept×0.5 + In Progress×0.25) / total_verified × 100
```

Recomputed by PostgreSQL trigger on every status change.

---

## Deployment

### Cloudflare Pages

```bash
npm run pages:build
# Deploy .vercel/output/static to Cloudflare Pages
```

Required environment variables in Cloudflare dashboard:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL=https://drishta.in
NEXT_PUBLIC_APP_NAME=Drishta
ADMIN_EMAILS=admin@drishta.in
```

### Supabase Storage

Create a bucket named `uploads` with public read access.

### Auth

Magic link auth via Supabase. No passwords. Admin whitelist via `ADMIN_EMAILS` env var.

---

## Key Design Decisions

- **No rounded corners on data tables** — editorial restraint
- **Serif (Playfair Display) + sans-serif (DM Sans)** — newspaper contrast
- **Status colours are the ONLY accent** — green/red/amber/purple/grey/blue
- **Issues go live immediately** (no moderation queue) — promises require approval
- **5-report auto-hide** system on promises, issues, and articles
- **Photo is mandatory for issues** — enforced at DB level (`NOT NULL`) and in the form UI

---

## File Structure

```
drishta/
├── db/migrations/          # PostgreSQL migrations (run in Supabase SQL editor)
├── scrapers/               # One-time seed data pipeline (Node.js ESM)
│   ├── config.js           # All 30 states + LS config
│   ├── run.js              # Main pipeline orchestrator
│   ├── scrape-mps.js       # Lok Sabha MP scraper
│   ├── scrape-mlas.js      # State MLA scraper
│   ├── scrape-photos.js    # Photo enrichment
│   └── utils.js            # Shared fetch/parse utilities
├── src/
│   ├── lib/
│   │   ├── api.js          # ← ALL database calls go here
│   │   └── supabase.js     # Supabase client factory
│   ├── app/                # Next.js App Router pages
│   └── components/         # Shared UI components
```
