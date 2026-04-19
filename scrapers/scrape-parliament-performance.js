/**
 * DRISHTA — Parliament Performance Scraper
 *
 * MPs  → sansad.in (official Lok Sabha/Rajya Sabha site, Puppeteer needed)
 * MLAs → state assembly websites (Puppeteer, varies by state)
 *
 * Refresh: every 6 months (after each parliamentary session)
 *
 * Usage:
 *   node scrapers/scrape-parliament-performance.js mps          — all MPs
 *   node scrapers/scrape-parliament-performance.js mlas:karnataka
 *   node scrapers/scrape-parliament-performance.js --next        — auto-pick
 */

import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const sleep = ms => new Promise(r => setTimeout(r, ms));
const USER_DATA = 'C:\\Temp\\puppeteer_drishta_perf';

// ── MP PERFORMANCE from sansad.in ────────────────────────────────────────────
// URL: https://sansad.in/ls/members/biographical-information?lang=en&search=Name

async function scrapeMPPerformance(page, mp) {
  // Search for MP on sansad.in
  const searchUrl = `https://sansad.in/ls/members/biographical-information?lang=en&search=${encodeURIComponent(mp.name)}`;

  try {
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 25000 });
    await sleep(2000);

    // Find the correct MP in search results
    const memberLink = await page.evaluate((name) => {
      const cards = Array.from(document.querySelectorAll('a[href*="/ls/members/"]'));
      const match = cards.find(a => {
        const text = a.textContent.trim().toLowerCase();
        const lastName = name.split(' ').pop().toLowerCase();
        return text.includes(lastName);
      });
      return match?.href ?? null;
    }, mp.name);

    if (!memberLink) return null;

    await page.goto(memberLink, { waitUntil: 'networkidle2', timeout: 25000 });
    await sleep(2000);

    const performance = await page.evaluate(() => {
      const text = document.body.innerText;
      const result = {
        attendance_pct: null,
        questions_asked: null,
        debates_count: null,
        bills_introduced: null,
        term: null,
        house: 'Lok Sabha',
        source_url: window.location.href,
      };

      // Attendance
      const attMatch = text.match(/attendance[^0-9]*(\d+(?:\.\d+)?)\s*%/i)
                    || text.match(/(\d+(?:\.\d+)?)\s*%\s*attendance/i);
      if (attMatch) result.attendance_pct = parseFloat(attMatch[1]);

      // Questions
      const qMatch = text.match(/questions?[^0-9]*(\d+)/i)
                  || text.match(/(\d+)\s*questions?/i);
      if (qMatch) result.questions_asked = parseInt(qMatch[1]);

      // Debates
      const dMatch = text.match(/debates?[^0-9]*(\d+)/i)
                  || text.match(/(\d+)\s*debates?/i);
      if (dMatch) result.debates_count = parseInt(dMatch[1]);

      // Private member bills
      const bMatch = text.match(/private\s+(?:member\s+)?bills?[^0-9]*(\d+)/i)
                  || text.match(/bills?\s+introduced[^0-9]*(\d+)/i);
      if (bMatch) result.bills_introduced = parseInt(bMatch[1]);

      // Term — look for "18th Lok Sabha" type text
      const termMatch = text.match(/(\d+(?:st|nd|rd|th)\s+Lok\s+Sabha)/i);
      if (termMatch) result.term = termMatch[1];

      return result;
    });

    return performance;
  } catch {
    return null;
  }
}

// ── MLA PERFORMANCE — per state ───────────────────────────────────────────────

// State assembly website configs
const MLA_SOURCES = {
  'Karnataka': {
    baseUrl: 'https://kla.kar.nic.in',
    memberSearchUrl: 'https://kla.kar.nic.in/assembly/members/mla_bio.asp',
    house: 'Karnataka Vidhan Sabha',
    term: '16th Karnataka Legislative Assembly (2023-2028)',
  },
  'Kerala': {
    baseUrl: 'https://niyamasabha.org',
    memberSearchUrl: 'https://niyamasabha.org/codes/members.asp',
    house: 'Kerala Legislative Assembly',
    term: '15th Kerala Legislative Assembly (2021-2026)',
  },
  'Tamil Nadu': {
    baseUrl: 'https://www.tnlegislature.gov.in',
    memberSearchUrl: 'https://www.tnlegislature.gov.in/TNLA/member_list',
    house: 'Tamil Nadu Legislative Assembly',
    term: '16th Tamil Nadu Legislative Assembly (2021-2026)',
  },
  'Maharashtra': {
    baseUrl: 'https://vidhan.maharashtra.gov.in',
    memberSearchUrl: 'https://vidhan.maharashtra.gov.in/MLC_MLA/MemberProfile',
    house: 'Maharashtra Vidhan Sabha',
    term: '14th Maharashtra Legislative Assembly (2024-2029)',
  },
};

async function scrapeMLAPerformance(page, mla, stateConfig) {
  try {
    // Navigate to member search
    await page.goto(stateConfig.memberSearchUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await sleep(1500);

    // Try to find member by name
    const hasSearch = await page.$('input[type="search"], input[type="text"], input[name*="member"], input[name*="name"]');
    if (hasSearch) {
      await hasSearch.type(mla.name.split(' ')[0]); // search by first word of name
      await page.keyboard.press('Enter');
      await sleep(1500);
    }

    // Extract performance data from whatever is on the page
    const performance = await page.evaluate((mlaName) => {
      const text = document.body.innerText;
      const result = {
        attendance_pct: null,
        questions_asked: null,
        debates_count: null,
        bills_introduced: null,
        source_url: window.location.href,
      };

      // Check if this member is mentioned
      if (!text.toLowerCase().includes(mlaName.toLowerCase().split(' ')[0])) return null;

      const attMatch = text.match(/attendance[^0-9]*(\d+(?:\.\d+)?)\s*%/i);
      if (attMatch) result.attendance_pct = parseFloat(attMatch[1]);

      const qMatch = text.match(/questions?[^0-9]*(\d+)/i);
      if (qMatch) result.questions_asked = parseInt(qMatch[1]);

      return result;
    }, mla.name);

    return performance;
  } catch {
    return null;
  }
}

// ── SAVE ──────────────────────────────────────────────────────────────────────

async function savePerformance(politicianId, name, level, state, data, stateConfig) {
  if (!data || (!data.attendance_pct && !data.questions_asked && !data.debates_count)) return;

  await supabase.from('parliament_performance').upsert({
    politician_id:   politicianId,
    politician_name: name,
    level,
    state,
    house:           data.house ?? (level === 'MP' ? 'Lok Sabha' : `${state} Legislative Assembly`),
    term:            data.term ?? stateConfig?.term ?? null,
    attendance_pct:  data.attendance_pct ?? null,
    questions_asked: data.questions_asked ?? null,
    debates_count:   data.debates_count ?? null,
    bills_introduced: data.bills_introduced ?? null,
    source_url:      data.source_url ?? null,
    last_scraped:    new Date().toISOString(),
  }, { onConflict: 'politician_id,term' });
}

// ── MAIN ──────────────────────────────────────────────────────────────────────

async function main() {
  const mode = process.argv[2] ?? 'mps';
  console.log('=== DRISHTA PARLIAMENT PERFORMANCE SCRAPER ===\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    userDataDir: USER_DATA,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

  try {
    if (mode === 'mps') {
      // Fetch all MPs from DB
      const { data: mps } = await supabase.from('politicians')
        .select('id, name, state, constituency_name')
        .eq('level', 'MP')
        .not('constituency_name', 'eq', 'Rajya Sabha')
        .limit(100); // do 100 per run

      console.log(`Scraping performance for ${mps?.length ?? 0} MPs…`);
      let found = 0;

      for (const mp of mps ?? []) {
        process.stdout.write(`  ${mp.name}… `);
        const data = await scrapeMPPerformance(page, mp);
        if (data?.attendance_pct || data?.questions_asked) {
          await savePerformance(mp.id, mp.name, 'MP', mp.state, data, null);
          process.stdout.write(`✓ attendance:${data.attendance_pct}% Q:${data.questions_asked ?? 0}\n`);
          found++;
        } else {
          process.stdout.write('- not found\n');
        }
        await sleep(2000);
      }
      console.log(`\nDone. Found data for ${found} MPs`);

    } else if (mode.startsWith('mlas:')) {
      const stateName = mode.replace('mlas:', '').replace(/-/g, ' ');
      const stateConfig = MLA_SOURCES[stateName];

      if (!stateConfig) {
        console.log(`No scraper config for ${stateName}.`);
        console.log('Available states:', Object.keys(MLA_SOURCES).join(', '));
        return;
      }

      const { data: mlas } = await supabase.from('politicians')
        .select('id, name, state')
        .eq('level', 'MLA')
        .eq('state', stateName)
        .limit(50);

      console.log(`Scraping ${mlas?.length ?? 0} MLAs for ${stateName}…`);
      let found = 0;

      for (const mla of mlas ?? []) {
        process.stdout.write(`  ${mla.name}… `);
        const data = await scrapeMLAPerformance(page, mla, stateConfig);
        if (data?.attendance_pct || data?.questions_asked) {
          await savePerformance(mla.id, mla.name, 'MLA', mla.state, data, stateConfig);
          process.stdout.write(`✓\n`);
          found++;
        } else {
          process.stdout.write('- not found\n');
        }
        await sleep(2000);
      }
      console.log(`\nDone. Found data for ${found} MLAs`);
    }

  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
