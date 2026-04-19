/**
 * DRISHTA — Puppeteer Scraper
 * Uses a headless browser to scrape MyNeta.info properly,
 * handling JavaScript-rendered content.
 *
 * Usage: node scrapers/scrape-puppeteer.js
 * Install first: npm install puppeteer
 */

import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { STATES, LOK_SABHA, BY_ELECTIONS, RATE_LIMIT_MS } from './config.js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const sleep = ms => new Promise(r => setTimeout(r, ms));

function toSlug(text) {
  return (text ?? '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').trim()
    .replace(/\s+/g, '-').replace(/-+/g, '-');
}

// ── BROWSER SETUP ────────────────────────────────────────────────────────────

const USER_DATA_DIR = 'C:\\Temp\\puppeteer_drishta';

async function launchBrowser() {
  return puppeteer.launch({
    headless: 'new',
    userDataDir: USER_DATA_DIR,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
    ],
  });
}

// ── SCRAPE ONE PAGE ──────────────────────────────────────────────────────────

async function fetchWithBrowser(page, url, waitMs = 2000) {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(waitMs); // let any deferred JS finish
  return page.content();
}

// ── EXTRACT CONSTITUENCY LINKS ───────────────────────────────────────────────

async function getConstituencyLinks(page, indexUrl) {
  console.log(`  Navigating to: ${indexUrl}`);
  await page.goto(indexUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(2000);

  // Extract all links that contain constituency_id
  const links = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a[href*="constituency_id"]'));
    return anchors.map(a => ({
      name: a.textContent.trim(),
      url: a.href,
    })).filter(l => l.name.length > 1);
  });

  // Deduplicate by URL
  const seen = new Set();
  return links.filter(l => {
    if (seen.has(l.url)) return false;
    seen.add(l.url);
    return true;
  });
}

// ── EXTRACT WINNER FROM CONSTITUENCY PAGE ────────────────────────────────────

async function getWinner(page, url, stateName) {
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(1000);

    const winner = await page.evaluate((state) => {
      // Method 1: look for winner CSS class
      let row = document.querySelector('tr.winner');

      // Method 2: look for "Winner" text badge
      if (!row) {
        const cells = Array.from(document.querySelectorAll('td'));
        const winnerCell = cells.find(td =>
          td.textContent.trim().toLowerCase() === 'winner' ||
          td.querySelector('.winner')
        );
        if (winnerCell) row = winnerCell.closest('tr');
      }

      // Method 3: first data row after header in results table
      if (!row) {
        const tables = Array.from(document.querySelectorAll('table'));
        for (const table of tables) {
          const rows = Array.from(table.querySelectorAll('tr'));
          const dataRows = rows.filter(r => r.querySelectorAll('td').length > 3);
          if (dataRows.length > 0) { row = dataRows[0]; break; }
        }
      }

      if (!row) return null;

      const cells = Array.from(row.querySelectorAll('td'))
        .map(td => td.textContent.trim().replace(/\s+/g, ' '));

      // Name is usually in a link
      const nameEl = row.querySelector('a');
      const name = nameEl ? nameEl.textContent.trim() : cells[1];

      if (!name || name.length < 2) return null;

      // Parse assets from "Rs X,XX,XXX" format
      const assetsRaw = cells[6] ?? '';
      const assetsMatch = assetsRaw.match(/Rs[\s,]*([0-9,]+)/i);
      const assets = assetsMatch
        ? parseInt(assetsMatch[1].replace(/,/g, ''), 10)
        : null;

      return {
        name: name.replace(/\s+/g, ' ').trim(),
        party: cells[2] ?? null,
        criminal_cases: parseInt((cells[3] ?? '0').replace(/\D/g, ''), 10) || 0,
        education: cells[4] ?? null,
        age: parseInt((cells[5] ?? '0').replace(/\D/g, ''), 10) || null,
        assets,
        state,
      };
    }, stateName);

    return winner;
  } catch (err) {
    return null;
  }
}

// ── SCRAPE LOK SABHA MPs ──────────────────────────────────────────────────────

async function scrapeMPs(browser) {
  console.log('\n[MPs] Scraping Lok Sabha 2024…');
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

  const indexUrl = `https://www.myneta.info/LokSabha2024/`;
  const links = await getConstituencyLinks(page, indexUrl);
  console.log(`  Found ${links.length} LS constituencies`);

  if (links.length === 0) {
    console.log('  ✗ No links found. Check if MyNeta is accessible.');
    await page.close();
    return [];
  }

  const mps = [];
  let done = 0;

  for (const { name: constName, url } of links) {
    const winner = await getWinner(page, url, 'Unknown');
    if (winner) {
      mps.push({
        ...winner,
        slug: toSlug(winner.name),
        constituency_name: constName,
        level: 'MP',
        election_year: LOK_SABHA.year,
        photo_url: null,
      });
    }
    done++;
    if (done % 50 === 0) console.log(`  Progress: ${done}/${links.length}`);
    await sleep(500); // gentler delay since browser is slower
  }

  await page.close();
  console.log(`  ✓ ${mps.length} MPs scraped`);
  return mps;
}

// ── SCRAPE ONE STATE's MLAs ───────────────────────────────────────────────────

async function scrapeStateMLAs(browser, stateCfg) {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

  // Try multiple URL formats
  const urlsToTry = [
    `https://www.myneta.info/${stateCfg.key}${stateCfg.year}/`,
    `https://www.myneta.info/${stateCfg.key.replace(/-/g, '')}${stateCfg.year}/`,
  ];

  let links = [];
  for (const url of urlsToTry) {
    try {
      links = await getConstituencyLinks(page, url);
      if (links.length > 0) break;
    } catch { /* try next */ }
  }

  if (links.length === 0) {
    await page.close();
    return [];
  }

  const mlas = [];
  for (const { name: constName, url } of links) {
    const winner = await getWinner(page, url, stateCfg.name);
    if (winner) {
      mlas.push({
        ...winner,
        slug: toSlug(winner.name),
        constituency_name: constName,
        level: 'MLA',
        election_year: stateCfg.year,
        photo_url: null,
      });
    }
    await sleep(400);
  }

  await page.close();
  return mlas;
}

// ── UPSERT TO DATABASE ────────────────────────────────────────────────────────

async function upsertAll(politicians) {
  // Build constituencies
  const constMap = new Map();
  for (const p of politicians) {
    if (!p.constituency_name || !p.state) continue;
    const type = p.level === 'MP' ? 'LS' : 'VS';
    const key = `${p.state}||${p.constituency_name}||${type}`;
    if (!constMap.has(key)) {
      constMap.set(key, {
        name: p.constituency_name,
        slug: toSlug(p.constituency_name),
        state: p.state,
        type,
      });
    }
  }

  const constituencies = [...constMap.values()];
  console.log(`\n  Upserting ${constituencies.length} constituencies…`);

  const BATCH = 100;
  for (let i = 0; i < constituencies.length; i += BATCH) {
    const { error } = await supabase
      .from('constituencies')
      .upsert(constituencies.slice(i, i + BATCH), { onConflict: 'slug,state,type' });
    if (error) console.error('  Constituency error:', error.message);
    else process.stdout.write('.');
  }

  // Fetch back to get IDs
  const { data: dbConsts } = await supabase
    .from('constituencies')
    .select('id, name, state, type');

  const idMap = new Map();
  for (const c of dbConsts ?? []) {
    idMap.set(`${c.state}||${c.name}||${c.type}`, c.id);
  }

  // Build politician records
  const records = politicians.map(p => {
    const type = p.level === 'MP' ? 'LS' : 'VS';
    return {
      name: p.name,
      slug: p.slug || toSlug(p.name),
      state: p.state,
      level: p.level,
      party: p.party,
      constituency_id: idMap.get(`${p.state}||${p.constituency_name}||${type}`) ?? null,
      constituency_name: p.constituency_name,
      photo_url: p.photo_url ?? null,
      election_year: p.election_year,
      assets: p.assets ?? null,
      criminal_cases: p.criminal_cases ?? 0,
      education: p.education ?? null,
      age: p.age ?? null,
    };
  });

  // Deduplicate by slug+state (same politician appearing twice in scraped data)
  const deduped = new Map();
  for (const r of records) {
    const key = `${r.slug}||${r.state}`;
    if (!deduped.has(key)) deduped.set(key, r);
  }
  const uniqueRecords = [...deduped.values()];

  console.log(`\n  Upserting ${uniqueRecords.length} politicians (${records.length - uniqueRecords.length} duplicates removed)…`);
  for (let i = 0; i < uniqueRecords.length; i += BATCH) {
    const { error } = await supabase
      .from('politicians')
      .upsert(uniqueRecords.slice(i, i + BATCH), { onConflict: 'slug,state' });
    if (error) console.error('  Politician error:', error.message);
    else process.stdout.write('.');
  }
  console.log('\n  ✓ Done');
}

// ── MAIN ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔═══════════════════════════════════════╗');
  console.log('║  DRISHTA PUPPETEER SCRAPER            ║');
  console.log('╚═══════════════════════════════════════╝\n');

  const args = process.argv.slice(2);
  const mode = args[0] ?? 'all'; // 'mps', 'mlas', 'state:karnataka', 'all'

  const browser = await launchBrowser();
  console.log('✓ Browser launched\n');

  try {
    let allPoliticians = [];

    if (mode === 'mps' || mode === 'all') {
      const mps = await scrapeMPs(browser);
      allPoliticians.push(...mps);
    }

    if (mode === 'mlas' || mode === 'all') {
      for (const state of STATES) {
        console.log(`\n[MLA] ${state.name} (${state.year})…`);
        const mlas = await scrapeStateMLAs(browser, state);
        console.log(`  ✓ ${mlas.length} MLAs`);
        allPoliticians.push(...mlas);
        await sleep(RATE_LIMIT_MS);
      }
    }

    // By-election mode: node scrapers/scrape-puppeteer.js byelection
    if (mode === 'byelection') {
      if (BY_ELECTIONS.length === 0) {
        console.log('No by-elections configured in config.js BY_ELECTIONS array.');
      } else {
        for (const bye of BY_ELECTIONS) {
          console.log(`\n[BY-ELECTION] ${bye.name} - ${bye.constituency} (${bye.year})…`);
          const mlas = await scrapeStateMLAs(browser, { key: bye.key, name: bye.name, year: bye.year });
          // Filter to just the specific constituency if specified
          const filtered = bye.constituency
            ? mlas.filter(m => m.constituency_name?.toLowerCase().includes(bye.constituency.toLowerCase()))
            : mlas;
          console.log(`  Found ${filtered.length} result(s)`);
          allPoliticians.push(...filtered);
        }
      }
    }

    // Single state mode: node scrapers/scrape-puppeteer.js state:karnataka
    if (mode.startsWith('state:')) {
      const stateName = mode.replace('state:', '').toLowerCase();
      const stateCfg = STATES.find(s =>
        s.key.toLowerCase() === stateName ||
        s.name.toLowerCase().includes(stateName)
      );
      if (!stateCfg) {
        console.error(`State not found: ${stateName}`);
        console.log('Available keys:', STATES.map(s => s.key).join(', '));
      } else {
        console.log(`\n[MLA] ${stateCfg.name}…`);
        const mlas = await scrapeStateMLAs(browser, stateCfg);
        console.log(`  ✓ ${mlas.length} MLAs`);
        allPoliticians.push(...mlas);
      }
    }

    if (allPoliticians.length > 0) {
      console.log(`\n\nTotal politicians scraped: ${allPoliticians.length}`);
      await upsertAll(allPoliticians);
    } else {
      console.log('\n✗ No politicians scraped. MyNeta structure may have changed.');
      console.log('  Try running: node scrapers/scrape-puppeteer.js mps');
      console.log('  And check if the browser can reach MyNeta.');
    }

  } finally {
    await browser.close();
    console.log('\nBrowser closed.');
  }
}

main().catch(async err => {
  console.error('\n✗ Scraper failed:', err.message);
  console.error('  Data scraped so far has been saved to the database.');
  console.error('  Re-run the same command to continue — already-saved data will be skipped via upsert.');
  process.exit(1);
});
