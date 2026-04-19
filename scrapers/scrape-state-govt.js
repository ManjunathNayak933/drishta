/**
 * DRISHTA — State Government Scraper
 *
 * Sources:
 *   Ministers  → Wikipedia "[CM Name] ministry" page (consistent across all states)
 *   Budget     → PRS India prsindia.org/budgets/states (covers ALL 30 states, yearly)
 *   Announcements → Google News RSS (no API key, works for all states)
 *
 * Run:
 *   node scrapers/scrape-state-govt.js state:karnataka
 *   node scrapers/scrape-state-govt.js --next
 *   node scrapers/scrape-state-govt.js --all
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const sleep = ms => new Promise(r => setTimeout(r, ms));
const UA_WIKI  = 'Drishta/1.0 (civic-platform; contact@drishta.in)';
const UA_BROWSER = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36';

const STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh',
  'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka',
  'Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
  'Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Puducherry',
];

// ── WIKIPEDIA API ─────────────────────────────────────────────────────────────

async function getWikitext(title) {
  const url = `https://en.wikipedia.org/w/api.php?action=query` +
    `&titles=${encodeURIComponent(title)}&prop=revisions&rvprop=content` +
    `&rvslots=main&format=json&formatversion=2`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA_WIKI } });
    const data = await res.json();
    const page = data?.query?.pages?.[0];
    if (!page || page.missing) return null;
    return page.revisions?.[0]?.slots?.main?.content ?? null;
  } catch { return null; }
}

async function wikiSearch(query) {
  const url = `https://en.wikipedia.org/w/api.php?action=opensearch` +
    `&search=${encodeURIComponent(query)}&limit=8&format=json`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA_WIKI } });
    const data = await res.json();
    return data?.[1] ?? [];
  } catch { return []; }
}

function cleanWiki(text) {
  return (text ?? '')
    .replace(/\[\[([^\|\]]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\{\{(?:[^{}]|\{[^{}]*\})*\}\}/g, '')
    .replace(/'{2,}/g, '').replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

// ── 1. CURRENT CM + RULING PARTY ─────────────────────────────────────────────

async function getCurrentCM(state) {
  const slug = state.replace(/\s+/g, '_');
  for (const title of [`Government_of_${slug}`, `${slug}_Legislative_Assembly`, `${slug}_Vidhan_Sabha`]) {
    const wikitext = await getWikitext(title);
    if (!wikitext) { await sleep(150); continue; }

    const cmPatterns = [
      /\|\s*(?:chief_minister|cm)\s*=\s*\[\[([^\]|]+)/i,
      /current\s+Chief\s+Minister\s+is\s+\[\[([^\]|]+)\]\]/i,
      /current\s+Chief\s+Minister\s+is\s+([A-Z][\w\s.]{4,60}?)(?:\.|,|\n)/i,
      /headed\s+by\s+[^,\n]*?\[\[([^\]|]+)\]\]/i,
    ];
    for (const pat of cmPatterns) {
      const m = wikitext.match(pat);
      if (!m?.[1]) continue;
      const cm = cleanWiki(m[1]).trim();
      if (cm.length < 4 || cm.length > 80 || cm.includes('|')) continue;

      const partyM = wikitext.match(/\|\s*(?:ruling_party|governing_party)\s*=\s*\[\[([^\]|]+)/i);
      const elecM  = wikitext.match(/(\d{4})\s+\w+\s+Legislative\s+Assembly\s+election/i);
      return {
        cm,
        party: partyM ? cleanWiki(partyM[1]) : null,
        electionYear: elecM ? parseInt(elecM[1]) : null,
      };
    }
    await sleep(150);
  }
  return null;
}

// ── 2. MINISTERS via ministry Wikipedia page ──────────────────────────────────

async function getMinistryTitle(cmName) {
  const results = await wikiSearch(`${cmName} ministry`);
  for (const title of results) {
    if (/ministry/i.test(title) && title.toLowerCase().includes(
      cmName.toLowerCase().split(' ').slice(-1)[0].toLowerCase()
    )) return title;
  }
  const slug = cmName.replace(/\s+/g, '_');
  for (const t of [`Second_${slug}_ministry`, `${slug}_ministry`, `Third_${slug}_ministry`, `First_${slug}_ministry`]) {
    const txt = await getWikitext(t);
    if (txt && txt.length > 1000) return t;
    await sleep(100);
  }
  return null;
}

function parseMinistryTable(wikitext) {
  const ministers = [];
  // Ministry pages have format: | Portfolio... | Name Role | Constituency | Party |
  // Split on row separators and process each row
  const rows = wikitext.split(/\n\|-/).slice(1);

  for (const row of rows) {
    const rawCells = row.split(/\n[|\!]/).map(c => c.replace(/^[|\!]+/, '').trim());
    const cells = rawCells.map(c => cleanWiki(c)).filter(c => c.length > 0);
    if (cells.length < 2) continue;

    // Name detection: look for cell with a person name pattern
    // Ministry pages: "Siddaramaiah Chief Minister" or "D. K. Shivakumar Deputy Chief Minister"
    let name = null, portfolio = null, party = null, isCM = false, isDeputy = false;

    for (const cell of cells) {
      // Person name: starts with capital, 2-5 words, no ministry/department words
      const nameMatch = cell.match(/^([A-Z][a-z][\w.\s]{3,50}?)(?:\s+(?:Chief\s+Minister|Deputy\s+Chief\s+Minister|Minister\s+of\s+State))?$/);
      if (!name && nameMatch && cell.split(' ').length >= 2 && cell.split(' ').length <= 7 &&
          !/minister|department|affairs|welfare|revenue|home|finance/i.test(cell.split(' ')[0])) {
        name = nameMatch[1].trim();
        isCM = /Chief\s+Minister/i.test(cell) && !/Deputy/i.test(cell);
        isDeputy = /Deputy\s+Chief\s+Minister/i.test(cell);
      }

      // Portfolio: cell containing ministry keywords
      if (!portfolio && cell.length > 8 &&
          /minister|department|affairs|welfare|revenue|home|finance|energy|health|education|agriculture|transport|housing/i.test(cell)) {
        portfolio = cell.slice(0, 300);
      }

      // Party abbreviation
      if (!party && /^(INC|BJP|JD[S-U]?|AAP|TMC|DMK|AIADMK|BRS|TRS|TDP|CPI[M]?|NCP|SP|BSP|SS|IND|YSRCP|BJD|JMM|SHS)$/i.test(cell.trim())) {
        party = cell.trim().toUpperCase();
      }
      if (!party && /(?:congress|bharatiya janata|aam aadmi|trinamool|dravida|janata dal|communist|samajwadi|biju|jharkhand)/i.test(cell) && cell.length < 60) {
        party = cell;
      }
    }

    if (name && name.length > 3 && name.length < 70) {
      ministers.push({ name, portfolio: portfolio?.slice(0, 300) ?? null, party, is_cm: isCM, is_deputy_cm: isDeputy });
    }
  }

  // Deduplicate
  const seen = new Set();
  return ministers.filter(m => { if (seen.has(m.name)) return false; seen.add(m.name); return true; });
}

// ── 3. BUDGET — NO AUTO-SCRAPE ───────────────────────────────────────────────
// State budget pages are JS-rendered PDFs on different URLs per state.
// Budget data should be added by admin via /admin/upload-budget
// This function is a stub that returns empty — budget is admin-managed.
async function scrapeBudgetPRS(state) {
  // Budget is added manually by admin from official CM portal
  // Karnataka: https://cm.karnataka.gov.in/93/budget/en
  // Other states: finance.[state].gov.in or budget.[state].gov.in
  return [];
}

// ── 4. ANNOUNCEMENTS via Google News RSS ─────────────────────────────────────
// Google News RSS works for all states, no JS, no API key

async function scrapeAnnouncements(state) {
  const announcements = [];
  const queries = [
    `${state} government scheme launch 2025 2026`,
    `${state} Chief Minister announce policy 2026`,
  ];

  for (const query of queries) {
    try {
      const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;
      const res = await fetch(rssUrl, { headers: { 'User-Agent': UA_BROWSER } });
      if (!res.ok) continue;
      const xml = await res.text();

      const items = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];
      for (const item of items.slice(0, 8)) {
        const titleM   = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
        const descM    = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || item.match(/<description>(.*?)<\/description>/);
        const pubM     = item.match(/<pubDate>(.*?)<\/pubDate>/);
        const linkM    = item.match(/<link>(.*?)<\/link>/);

        const title   = titleM?.[1]?.replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&#39;/g,"'").trim();
        const summary = descM?.[1]?.replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').trim();
        if (!title || title.length < 15) continue;

        // Filter out irrelevant items (opposition party news, cricket, etc.)
        if (!/government|minister|scheme|announce|launch|policy|yojana|budget|inaugurate|allocat/i.test(title + ' ' + (summary ?? ''))) continue;
        if (/opposition|BJP|Congress|election|arrest|controversy|protest|demand/i.test(title)) continue;

        const pubDate = pubM?.[1] ? new Date(pubM[1]).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        announcements.push({
          state,
          title: title.slice(0, 250),
          summary: summary?.slice(0, 400) ?? null,
          category: detectCategory(title + ' ' + (summary ?? '')),
          source_url: linkM?.[1]?.trim() ?? null,
          announced_on: pubDate,
        });
        if (announcements.length >= 10) break;
      }
    } catch { /* skip */ }

    await sleep(800);
    if (announcements.length >= 8) break;
  }

  return announcements.slice(0, 10);
}

function detectCategory(text) {
  const t = text.toLowerCase();
  if (/budget|fund|crore|lakh|allocat/.test(t)) return 'Budget';
  if (/road|bridge|highway|infrastructure|metro|rail/.test(t)) return 'Infrastructure';
  if (/scheme|welfare|pension|subsidy|yojana|benefi/.test(t)) return 'Welfare';
  if (/health|hospital|medical|doctor/.test(t)) return 'Health';
  if (/school|education|college|student/.test(t)) return 'Education';
  if (/farmer|agriculture|kisan|crop/.test(t)) return 'Agriculture';
  return 'Policy';
}

// ── SAVE ──────────────────────────────────────────────────────────────────────

async function save(state, overview, ministers, budgets, announcements) {
  const now = new Date().toISOString();

  if (overview) {
    await supabase.from('state_governments').upsert({
      state, ruling_party: overview.party, chief_minister: overview.cm,
      election_year: overview.electionYear, last_scraped: now, updated_at: now,
    }, { onConflict: 'state' });
  }

  if (ministers.length > 0) {
    await supabase.from('state_ministers').delete().eq('state', state);
    await supabase.from('state_ministers').insert(ministers.map(m => ({ ...m, state, updated_at: now })));
  }

  for (const b of budgets) {
    await supabase.from('state_budgets').upsert({ ...b, state }, { onConflict: 'state,year' });
  }

  if (announcements.length > 0) {
    const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - 3);
    await supabase.from('state_announcements').delete().eq('state', state).lt('scraped_at', cutoff.toISOString());
    await supabase.from('state_announcements').upsert(
      announcements, { onConflict: 'state,title', ignoreDuplicates: true }
    );
  }

  const nextDue = new Date(); nextDue.setDate(nextDue.getDate() + 90);
  await supabase.from('scrape_schedule').upsert({
    state, last_scraped: now, next_due: nextDue.toISOString(), scrape_type: 'state_govt'
  }, { onConflict: 'state' });
}

// ── PER STATE ─────────────────────────────────────────────────────────────────

async function scrapeState(state) {
  console.log(`\n── ${state} ──`);

  // 1. CM
  process.stdout.write('  CM + party… ');
  const overview = await getCurrentCM(state);
  console.log(overview?.cm ? `✓ ${overview.cm} (${overview.party ?? '?'})` : '✗ not found');
  await sleep(300);

  // 2. Ministers
  let ministers = [];
  if (overview?.cm) {
    process.stdout.write('  Ministry page… ');
    const ministryTitle = await getMinistryTitle(overview.cm);
    if (ministryTitle) {
      console.log(`✓ "${ministryTitle}"`);
      const wikitext = await getWikitext(ministryTitle);
      if (wikitext) {
        ministers = parseMinistryTable(wikitext);
        console.log(`  Ministers parsed: ${ministers.length}`);
      }
    } else {
      console.log('✗ not found');
    }
  }
  await sleep(300);

  // 3. Budget (PRS India — works for all 30 states)
  process.stdout.write('  Budget (PRS India)… ');
  const budgets = await scrapeBudgetPRS(state);
  console.log(budgets.length ? `✓ ${budgets.length} year(s)` : '✗ not found');
  await sleep(500);

  // 4. Announcements (Google News RSS)
  process.stdout.write('  Announcements (Google News)… ');
  const announcements = await scrapeAnnouncements(state);
  console.log(announcements.length ? `✓ ${announcements.length}` : '✗ none');

  await save(state, overview, ministers, budgets, announcements);
  console.log('  Saved ✓');
}

// ── MAIN ──────────────────────────────────────────────────────────────────────

async function main() {
  const mode = process.argv[2] ?? '--next';
  console.log('=== DRISHTA STATE GOVERNMENT SCRAPER ===');
  console.log('Sources: Wikipedia (ministers) | PRS India (budget) | Google News RSS (announcements)\n');

  if (mode === '--next') {
    const { data } = await supabase.from('scrape_schedule')
      .select('state').order('last_scraped', { ascending: true, nullsFirst: true }).limit(1);
    const state = data?.[0]?.state ?? STATES[0];
    console.log(`Next due: ${state}`);
    await scrapeState(state);

  } else if (mode === '--all') {
    for (const state of STATES) { await scrapeState(state); await sleep(3000); }

  } else if (mode.startsWith('state:')) {
    const name = mode.replace('state:', '').replace(/-/g, ' ');
    const state = STATES.find(s => s.toLowerCase().includes(name.toLowerCase()));
    if (!state) { console.error('Unknown state:', name); process.exit(1); }
    await scrapeState(state);

  } else if (mode === '--central' || mode === 'india') {
    // Central government — scrape Modi ministry + Union Budget + GoI announcements
    console.log('── Government of India (Central) ──');
    process.stdout.write('  Ministry page (Modi)… ');
    const ministryTitle = await getMinistryTitle('Narendra Modi');
    let ministers = [];
    if (ministryTitle) {
      console.log(`✓ "${ministryTitle}"`);
      const wikitext = await getWikitext(ministryTitle);
      if (wikitext) {
        ministers = parseMinistryTable(wikitext);
        console.log(`  Ministers parsed: ${ministers.length}`);
      }
    } else {
      console.log('✗ not found');
    }

    // Announcements for GoI
    process.stdout.write('  Announcements (Google News)… ');
    const announcements = await scrapeAnnouncements('Government of India Modi');
    console.log(announcements.length ? `✓ ${announcements.length}` : '✗ none');

    const overview = {
      cm: 'Narendra Modi',
      party: 'Bharatiya Janata Party',
      coalition: 'National Democratic Alliance (NDA)',
      election_year: 2024,
      total_seats: 543,
      majority_seats: 293, // NDA total seats
    };

    await save('India', overview, ministers, [], announcements);
    console.log('  Saved ✓');
  }

  console.log('\n=== Done ===');
}

main().catch(e => { console.error(e.message); process.exit(1); });
