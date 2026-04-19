/**
 * DRISHTA — History + Promises Scraper
 *
 * Scrapes from Wikipedia JSON API:
 *   - Constituency formation year (from infobox)
 *   - All past MLAs with party and year (from election results table)
 *
 * Scrapes 2 promises per politician from DuckDuckGo news search
 *
 * Usage:
 *   node scrapers/scrape-history.js state:karnataka
 *   node scrapers/scrape-history.js constituency:varuna
 *   node scrapers/scrape-history.js all
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
const HEADERS = { 'User-Agent': 'Drishta/1.0 (civic-platform; contact@drishta.in)' };

// ── WIKIPEDIA API ─────────────────────────────────────────────────────────────

async function getWikitext(title) {
  const url = `https://en.wikipedia.org/w/api.php?action=query` +
    `&titles=${encodeURIComponent(title)}&prop=revisions&rvprop=content` +
    `&rvslots=main&format=json&formatversion=2`;
  const res = await fetch(url, { headers: HEADERS });
  const data = await res.json();
  const page = data?.query?.pages?.[0];
  if (!page || page.missing) return null;
  return page.revisions?.[0]?.slots?.main?.content ?? null;
}

function toTitleCase(str) {
  return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('_');
}

// Try multiple Wikipedia title variants for a constituency
async function fetchConstituencyWikitext(name, state) {
  const base = toTitleCase(name);
  const titles = [
    `${base}_Assembly_constituency`,
    `${base}_assembly_constituency`,
    `${base}_Vidhan_Sabha_constituency`,
    `${base},_${toTitleCase(state)}`,
    `${base}_constituency`,
  ];
  for (const t of titles) {
    const txt = await getWikitext(t).catch(() => null);
    if (txt) return { wikitext: txt, url: `https://en.wikipedia.org/wiki/${t}` };
    await sleep(100);
  }
  return null;
}

// Parse wikitext: extract formation year and MLA election history
function parseHistory(wikitext) {
  const result = { formed_year: null, mla_history: [] };

  // --- Formation year ---
  // Infobox field like: | established = 2008  OR  | formed = 1957
  const formedMatch = wikitext.match(/\|\s*(?:established|formed|created|year)\s*=\s*\[?\[?(\d{4})/i);
  if (formedMatch) result.formed_year = parseInt(formedMatch[1]);

  // Fallback: "came into existence after the YYYY delimitation"
  if (!result.formed_year) {
    const m = wikitext.match(/came into existence[^.]*?(\d{4})/i)
           || wikitext.match(/first\s+held\s+in\s+(\d{4})/i)
           || wikitext.match(/since\s+(\d{4})\s+election/i);
    if (m) result.formed_year = parseInt(m[1]);
  }

  // --- MLA election history ---
  // Wikipedia assembly pages have a simple table like:
  // Election: Name; Party
  // 2008: Siddaramaiah; INC
  // OR a wikitable with columns: Election | Winner | Party
  
  // Method 1: parse "Election: Name; Party" plain list format
  // Seen as: 2008: Siddaramaiah; Indian National Congress
  const listMatches = [...wikitext.matchAll(/\n[\|\s]*'*(\d{4})'*[\s\|:;]+([^|\n;]{5,60}?)[\s;|]+([^\n|]{3,60})\n/g)];
  for (const m of listMatches) {
    const year = parseInt(m[1]);
    if (year < 1950 || year > 2030) continue;
    const name = m[2].replace(/\[\[([^\|\]]+)(?:\|[^\]]+)?\]\]/g, '$1').replace(/'{2,}/g, '').trim();
    const party = m[3].replace(/\[\[([^\|\]]+)(?:\|[^\]]+)?\]\]/g, '$1').replace(/'{2,}/g, '').trim();
    if (name.length > 3 && !/^\d+$/.test(name)) {
      result.mla_history.push({ term_year: year, name, party });
    }
  }

  // Method 2: parse wikitable rows
  if (result.mla_history.length === 0) {
    const tableMatch = wikitext.match(/\{\|[^\n]*wikitable[\s\S]*?\|\}/);
    if (tableMatch) {
      const rows = tableMatch[0].split(/\n\|-/).slice(1);
      for (const row of rows) {
        const cells = row.split(/\n[|\!]/)
          .map(c => c.replace(/\[\[([^\|\]]+)(?:\|[^\]]+)?\]\]/g, '$1')
                     .replace(/\{\{[^}]+\}\}/g, '')
                     .replace(/'{2,}/g, '')
                     .replace(/<[^>]+>/g, '')
                     .trim())
          .filter(c => c.length > 0);

        const yearCell = cells.find(c => /^(19[5-9]\d|20[0-3]\d)$/.test(c));
        if (!yearCell) continue;
        const year = parseInt(yearCell);

        const name = cells.find(c =>
          c !== yearCell &&
          c.length > 3 && c.length < 70 &&
          !/^\d+$/.test(c) &&
          !/^(INC|BJP|JD|JDS|CPI|BSP|SP|TMC|AAP|DMK|AIADMK|BRS|TRS|TDP|NCP|IND|NOTA|SC|ST|align|style|colspan)$/i.test(c)
        );
        const party = cells.find(c =>
          /congress|bharatiya|janata|communist|socialist|samajwadi|trinamool|aam aadmi|dravida|telugu|nationalist|shiv sena|rashtriya|biju|ysr|trs|brs/i.test(c)
        ) || cells.find(c => /^(INC|BJP|JD[S]?|CPI[M]?|BSP|SP|TMC|AAP|DMK|AIADMK|BRS|TRS|TDP|NCP|SS|IND)$/i.test(c));

        if (name && year >= 1952) {
          result.mla_history.push({ term_year: year, name, party: party ?? null });
        }
      }
    }
  }

  // Deduplicate by year and sort newest first
  const seen = new Set();
  result.mla_history = result.mla_history
    .filter(m => { const k = m.term_year; return seen.has(k) ? false : seen.add(k); })
    .sort((a, b) => b.term_year - a.term_year);

  return result;
}

// ── PROMISE SCRAPER via DuckDuckGo ───────────────────────────────────────────

async function scrapePromises(politicianName, state) {
  // Search DuckDuckGo for news about this politician's election promises
  const query = `"${politicianName}" ${state} election promise 2023 OR 2024 manifesto pledge`;
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
      }
    });
    const html = await res.text();

    // Extract text snippets from DuckDuckGo results
    const snippets = [];
    const snippetMatches = [...html.matchAll(/class="result__snippet"[^>]*>([^<]+(?:<[^>]+>[^<]*<\/[^>]+>)?[^<]*)/g)];
    for (const m of snippetMatches) {
      const text = m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim();
      snippets.push(text);
    }

    // Extract promise-like sentences from snippets
    const promises = [];
    for (const snippet of snippets) {
      const sentences = snippet.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 40 && s.length < 300);
      for (const sent of sentences) {
        if (/promis|pledge|commit|vow|will\s+(build|provide|ensure|create|develop|construct|install|set up)|manifest/i.test(sent)) {
          promises.push(sent);
          if (promises.length >= 2) break;
        }
      }
      if (promises.length >= 2) break;
    }

    return promises.slice(0, 2);
  } catch (err) {
    return [];
  }
}

function detectCategory(text) {
  const t = text.toLowerCase();
  if (/road|bridge|highway|metro|rail|flyover/.test(t)) return 'Infrastructure';
  if (/water|irrigation|river|dam|drinking|pipeline/.test(t)) return 'Water';
  if (/job|employ|industry|business|factory|startup/.test(t)) return 'Employment';
  if (/hospital|health|medical|doctor|clinic/.test(t)) return 'Health';
  if (/school|education|college|student|teacher/.test(t)) return 'Education';
  if (/power|electricity|solar|energy/.test(t)) return 'Electricity';
  if (/women|girl|female|safety|mahila/.test(t)) return 'Women Safety';
  if (/farm|farmer|crop|agriculture|kisan/.test(t)) return 'Agriculture';
  return 'Other';
}

// ── DB ────────────────────────────────────────────────────────────────────────

async function saveHistory(constituencyId, data, wikiUrl) {
  const updates = {};
  if (data.formed_year) updates.formed_year = data.formed_year;
  if (wikiUrl) updates.wikipedia_url = wikiUrl;

  if (Object.keys(updates).length > 0) {
    await supabase.from('constituencies').update(updates).eq('id', constituencyId);
  }

  if (data.mla_history?.length > 0) {
    const records = data.mla_history.map(h => ({
      constituency_id: constituencyId,
      term_year: h.term_year,
      name: h.name,
      party: h.party,
    }));
    const { error } = await supabase
      .from('mla_history')
      .upsert(records, { onConflict: 'constituency_id,term_year', ignoreDuplicates: true });
    if (error) console.error('  history save error:', error.message);
  }
}

async function savePendingPromises(politician, promiseTexts) {
  if (!promiseTexts.length) return;
  const records = promiseTexts.map(text => ({
    politician_id: politician.id,
    politician_name: politician.name,
    politician_level: politician.level,
    state: politician.state,
    constituency_name: politician.constituency_name,
    party: politician.party ?? null,
    promise_text: text,
    promise_category: detectCategory(text),
    source: 'Web',
    source_description: 'Scraped from news',
    verified: false,
    status: 'Unverified',
    added_by_email: 'system@drishta.in',
  }));

  const { error } = await supabase
    .from('pending_promises')
    .upsert(records, { onConflict: 'politician_name,promise_text', ignoreDuplicates: true });
  if (error && !error.message.includes('duplicate')) {
    console.warn('  promise save error:', error.message);
  }
}

// ── MAIN ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n=== DRISHTA HISTORY + PROMISES SCRAPER ===\n');

  const args = process.argv.slice(2);
  const mode = args[0] ?? 'state:karnataka';

  let query = supabase
    .from('constituencies')
    .select('id, name, state, type')
    .eq('type', 'VS')
    .order('state').order('name');

  if (mode.startsWith('state:')) {
    query = query.ilike('state', `%${mode.replace('state:', '').replace(/-/g, ' ')}%`);
  } else if (mode.startsWith('constituency:')) {
    query = query.ilike('name', `%${mode.replace('constituency:', '').replace(/-/g, ' ')}%`).limit(5);
  }
  // 'all' → no extra filter

  const { data: constituencies, error } = await query;
  if (error || !constituencies?.length) {
    console.log('No constituencies found for:', mode); return;
  }

  console.log(`Found ${constituencies.length} constituencies\n`);

  let historyOk = 0, promisesOk = 0;

  for (const c of constituencies) {
    process.stdout.write(`${c.name}, ${c.state}… `);

    // 1. Wikipedia history
    const wiki = await fetchConstituencyWikitext(c.name, c.state);
    if (wiki) {
      const history = parseHistory(wiki.wikitext);
      await saveHistory(c.id, history, wiki.url);
      const parts = [];
      if (history.formed_year) parts.push(`formed ${history.formed_year}`);
      if (history.mla_history.length) parts.push(`${history.mla_history.length} past MLAs`);
      if (parts.length) { process.stdout.write(`✓ ${parts.join(', ')} `); historyOk++; }
      else process.stdout.write(`- no history in page `);
    } else {
      process.stdout.write(`- Wikipedia page not found `);
    }

    // 2. Promises for the current MLA
    const { data: pols } = await supabase
      .from('politicians')
      .select('id, name, level, state, party, constituency_name')
      .eq('constituency_id', c.id)
      .eq('level', 'MLA')
      .limit(1);

    if (pols?.[0]) {
      const promises = await scrapePromises(pols[0].name, c.state);
      if (promises.length > 0) {
        await savePendingPromises(pols[0], promises);
        process.stdout.write(`✓ ${promises.length} promises`);
        promisesOk += promises.length;
      } else {
        process.stdout.write(`- no promises found`);
      }
    }

    console.log('');
    await sleep(800);
  }

  console.log(`\nDone. History: ${historyOk} constituencies, Promises: ${promisesOk} (pending admin approval)`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
