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

// Inline normalization
function normalizeName(str) {
  if (!str) return '';
  return str
    .replace(/^\s*(Shri|Smt|Dr|Prof|Adv|Kumari|Sh|Mr|Mrs|Ms|Late|Col|Capt|Er)\s+/gi, '')
    .replace(/([A-Za-z])\.([A-Za-z])/g, '$1 $2')
    .replace(/([A-Za-z])\.\s*/g, '$1 ')
    .replace(/\s+/g, ' ').trim()
    .split(' ').filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}
function normalizeConstituency(str) {
  if (!str) return '';
  return str
    .replace(/\s*\(s[ct]\)\s*$/i, '')  // strip (Sc)/(St)
    .replace(/\s*-\s*/g, ' ')           // "Bhandara-Gondiya" → "Bhandara Gondiya"
    .replace(/([A-Za-z])\.([A-Za-z])/g, '$1 $2')
    .replace(/\s+/g, ' ').trim()
    .split(' ').filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}
function normalizeParty(str) { return str ? str.replace(/\s+/g, ' ').trim() : ''; }

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

const USER_DATA_DIR = `C:\\Temp\\puppeteer_drishta_${Date.now()}`;

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
      // Helper to parse vote count from a cell
      function parseVotes(text) {
        const m = text.replace(/,/g, '').match(/(\d+)/);
        return m ? parseInt(m[1]) : 0;
      }

      // Helper to parse assets
      function parseAssets(text) {
        // Handle crore/lakh format: "Rs 1,50,00,000" or "1.5 Cr" or "15 Lakh"
        if (/crore|cr\b/i.test(text)) {
          const m = text.match(/([0-9.]+)/);
          return m ? Math.round(parseFloat(m[1]) * 10000000) : null;
        }
        if (/lakh|lac/i.test(text)) {
          const m = text.match(/([0-9.]+)/);
          return m ? Math.round(parseFloat(m[1]) * 100000) : null;
        }
        const m = text.replace(/,/g, '').match(/([0-9]+)/);
        return m ? parseInt(m[1]) : null;
      }

      // Method 1: look for winner CSS class
      let winnerRow = document.querySelector('tr.winner');

      // Method 2: look for "Winner" text badge
      if (!winnerRow) {
        const cells = Array.from(document.querySelectorAll('td'));
        const winnerCell = cells.find(td =>
          td.textContent.trim().toLowerCase() === 'winner' ||
          td.querySelector('.winner') ||
          td.querySelector('[class*="winner"]')
        );
        if (winnerCell) winnerRow = winnerCell.closest('tr');
      }

      // Method 3: find row with highest votes across all candidate rows
      if (!winnerRow) {
        const tables = Array.from(document.querySelectorAll('table'));
        let bestRow = null, bestVotes = -1;
        for (const table of tables) {
          const rows = Array.from(table.querySelectorAll('tr'))
            .filter(r => r.querySelectorAll('td').length > 3);
          for (const row of rows) {
            const cells = Array.from(row.querySelectorAll('td'))
              .map(td => td.textContent.trim().replace(/\s+/g, ' '));
            // Votes are usually in cells[2] or cells[7] or cells[8]
            const votes = Math.max(
              parseVotes(cells[2] ?? ''),
              parseVotes(cells[7] ?? ''),
              parseVotes(cells[8] ?? '')
            );
            if (votes > bestVotes) {
              bestVotes = votes;
              bestRow = row;
            }
          }
        }
        // Only use if votes > 1000 (filter out header/junk rows)
        if (bestVotes > 1000) winnerRow = bestRow;
      }

      if (!winnerRow) return null;

      const cells = Array.from(winnerRow.querySelectorAll('td'))
        .map(td => td.textContent.trim().replace(/\s+/g, ' '));

      // Name is usually in a link
      const nameEl = winnerRow.querySelector('a');
      const name = nameEl ? nameEl.textContent.trim() : cells[1];
      if (!name || name.length < 2) return null;

      // Try multiple cell positions for assets (varies by page type)
      let assets = null;
      for (const cell of cells) {
        if (/rs|crore|lakh|lac/i.test(cell)) {
          assets = parseAssets(cell);
          if (assets && assets > 0) break;
        }
      }

      // Liabilities — usually right after assets
      let liabilities = null;
      const assetIdx = cells.findIndex(c => /rs|crore|lakh/i.test(c) && parseAssets(c) > 0);
      if (assetIdx >= 0 && assetIdx + 1 < cells.length) {
        liabilities = parseAssets(cells[assetIdx + 1]);
      }

      return {
        name: name.replace(/\s+/g, ' ').trim(),
        criminal_cases: parseInt((cells[3] ?? '0').replace(/\D/g, ''), 10) || 0,
        education: cells[4] ?? null,
        age: parseInt((cells[5] ?? '0').replace(/\D/g, ''), 10) || null,
        assets,
        liabilities,
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

  // Build constituency→state lookup from ECI data
  // Each LS constituency belongs to exactly one state
  const LS_STATE_MAP = {
    'ANDAMAN AND NICOBAR ISLANDS': 'Andaman and Nicobar Islands',
    'ARUNACHAL WEST': 'Arunachal Pradesh', 'ARUNACHAL EAST': 'Arunachal Pradesh',
    'LAKSHADWEEP': 'Lakshadweep', 'DADRA AND NAGAR HAVELI': 'Dadra and Nagar Haveli',
    'DAMAN AND DIU': 'Daman and Diu',
  };
  // For all other constituencies we determine state from the DB after upsert
  // using the constituency name match

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

  // Fetch back ALL constituency IDs — must use high limit since Supabase defaults to 1000
  let allDbConsts = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data: page, error } = await supabase
      .from('constituencies')
      .select('id, name, state, type')
      .range(from, from + pageSize - 1);
    if (error || !page?.length) break;
    allDbConsts.push(...page);
    if (page.length < pageSize) break;
    from += pageSize;
  }
  console.log(`\n  Fetched ${allDbConsts.length} constituencies for ID mapping`);

  // Build two maps: name-based (for MPs with Unknown state) and state+name based
  const idMap = new Map();        // "state||name||type" → id
  const nameMap = new Map();      // "name||type" → {id, state}  (for MPs)
  for (const c of allDbConsts) {
    idMap.set(`${c.state}||${c.name}||${c.type}`, c.id);
    // For name-only lookup, last write wins — acceptable for LS (unique nationally)
    nameMap.set(`${c.name}||${c.type}`, { id: c.id, state: c.state });
    // Also store uppercase version since MyNeta names are uppercase
    nameMap.set(`${c.name.toUpperCase()}||${c.type}`, { id: c.id, state: c.state });
  }

  // Build politician records — derive state from DB for MPs with 'Unknown' state
  const records = politicians.map(p => {
    const type = p.level === 'MP' ? 'LS' : 'VS';

    // Try exact match first, then name-only for MPs with Unknown/wrong state
    let constId = idMap.get(`${p.state}||${p.constituency_name}||${type}`);
    let derivedState = p.state;

    if (!constId || p.state === 'Unknown') {
      const nameMatch = nameMap.get(`${p.constituency_name}||${type}`)
                     || nameMap.get(`${p.constituency_name?.toUpperCase()}||${type}`);
      if (nameMatch) {
        constId = nameMatch.id;
        derivedState = nameMatch.state; // use state from DB, not scraper
      }
    }

    return {
      name: normalizeName(p.name),
      slug: p.slug || toSlug(normalizeName(p.name)),
      state: derivedState,
      level: p.level,
      party: normalizeParty(p.party),
      constituency_id: constId ?? null,
      // Strip SC/ST reservation suffixes: "Bellary (St)" → "Bellary"
      constituency_name: normalizeConstituency(
        (p.constituency_name ?? '').replace(/\s*\(s[ct]\)\s*$/i, '').trim()
      ),
      photo_url: p.photo_url ?? null,
      election_year: p.election_year,
      assets: p.assets ?? null,
      liabilities: p.liabilities ?? null,
      criminal_cases: p.criminal_cases ?? 0,
      education: p.education ?? null,
      age: p.age ?? null,
      // Asset history — will be merged with existing on upsert
      _asset_year: p.election_year,
      _asset_value: p.assets,
      _liabilities_value: p.liabilities,
    };
  });

  // For MPs/MLAs: deduplicate by constituency+state+level — one seat, one winner
  // For same person scraped twice: also dedup by slug+state
  const deduped = new Map();
  for (const r of records) {
    // Primary key: constituency+state+level (one current holder per seat)
    const constKey = `${r.constituency_name?.toLowerCase()}||${r.state}||${r.level}`;
    // If we already have this seat, keep the one with higher election_year
    if (deduped.has(constKey)) {
      const existing = deduped.get(constKey);
      if ((r.election_year ?? 0) >= (existing.election_year ?? 0)) {
        deduped.set(constKey, r);
      }
    } else {
      deduped.set(constKey, r);
    }
  }
  const uniqueRecords = [...deduped.values()];

  console.log(`\n  Upserting ${uniqueRecords.length} politicians (${records.length - uniqueRecords.length} duplicates removed)…`);

  for (let i = 0; i < uniqueRecords.length; i += BATCH) {
    const batch = uniqueRecords.slice(i, i + BATCH);

    // For each record: archive old holder to history, then insert new winner
    for (const r of batch) {
      if (!r.constituency_name || !r.state || !r.level) continue;

      // Find existing holder of this seat with different name
      const { data: existing } = await supabase
        .from('politicians')
        .select('id, name, party, constituency_id, election_year')
        .eq('constituency_name', r.constituency_name)
        .eq('state', r.state)
        .eq('level', r.level)
        .neq('slug', r.slug)
        .maybeSingle();

      if (existing?.id) {
        // Only replace if new data has same or higher election year
        if ((r.election_year ?? 0) < (existing.election_year ?? 9999)) {
          // New data is older — skip, keep existing
          continue;
        }

        // Same year + same person = update in place, no history needed
        if (existing.election_year === r.election_year) {
          // Will be handled by the upsert below — no archive needed
        } else {
          // New year is higher — archive old holder to history
          if (existing.constituency_id && existing.election_year) {
            await supabase.from('mla_history').upsert({
              constituency_id: existing.constituency_id,
              term_year: existing.election_year,
              name: existing.name,
              party: existing.party ?? null,
              level: r.level,
            }, { onConflict: 'constituency_id,term_year' });
          }
          // Delete old holder
          await supabase.from('politicians').delete().eq('id', existing.id);
        }
      }
    }

    // Strip internal tracking fields before DB insert
    const dbBatch = batch.map(r => {
      const { _asset_year, _asset_value, _liabilities_value, ...dbRecord } = r;
      return dbRecord;
    });

    const { error } = await supabase
      .from('politicians')
      .upsert(dbBatch, { onConflict: 'slug,state' });
    if (error) console.error('  Politician error:', error.message);
    else process.stdout.write('.');

    // Update asset_history for each politician with new election year assets
    for (const r of batch) {
      if (!r._asset_value || !r._asset_year) continue;
      // Fetch current asset_history and merge
      const { data: pol } = await supabase
        .from('politicians')
        .select('id, asset_history')
        .eq('slug', r.slug)
        .eq('state', r.state)
        .maybeSingle();
      if (!pol?.id) continue;

      const history = Array.isArray(pol.asset_history) ? pol.asset_history : [];
      // Remove existing entry for this year and add new one
      const filtered = history.filter(h => h.year !== r._asset_year);
      filtered.push({
        year: r._asset_year,
        assets: r._asset_value,
        liabilities: r._liabilities_value ?? null,
      });
      filtered.sort((a, b) => b.year - a.year); // newest first

      await supabase.from('politicians')
        .update({ asset_history: filtered })
        .eq('id', pol.id);
    }
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

    // Single constituency mode: node scrapers/scrape-puppeteer.js constituency:karkala state:karnataka
    if (mode.startsWith('constituency:')) {
      const constName = mode.replace('constituency:', '').replace(/-/g, ' ').toLowerCase();
      const _stateArgRaw = args.find(a => a.startsWith('state:'));
      const stateArg = _stateArgRaw ? _stateArgRaw.replace('state:', '').toLowerCase().replace(/-/g, ' ') : null;
      console.log(`Searching for: "${constName}"${stateArg ? ` in ${stateArg}` : ''}`);

      const statesToSearch = stateArg
        ? STATES.filter(s =>
            s.key.toLowerCase().replace(/-/g, ' ') === stateArg ||
            s.name.toLowerCase() === stateArg ||
            s.name.toLowerCase().includes(stateArg))
        : STATES;

      let found = false;
      for (const stateCfg of statesToSearch) {
        const page = await browser.newPage();
        // Get just the constituency links — faster than scraping all winners
        const urls = [
          `https://www.myneta.info/${stateCfg.key}${stateCfg.year}/`,
          `https://www.myneta.info/${stateCfg.key.replace(/-/g, '')}${stateCfg.year}/`,
        ];
        let links = [];
        for (const url of urls) {
          links = await getConstituencyLinks(page, url).catch(() => []);
          if (links.length > 0) break;
        }
        await page.close();

        // Find matching constituency link
        const match = links.find(l =>
          l.name.toLowerCase().replace(/\s+/g, ' ').includes(constName) ||
          constName.includes(l.name.toLowerCase().replace(/\s+/g, ' '))
        );

        if (match) {
          console.log(`  Found link: ${match.name} → ${match.url}`);
          const p2 = await browser.newPage();
          const winner = await getWinner(p2, match.url, stateCfg.name);
          await p2.close();
          if (winner) {
            allPoliticians.push({ ...winner, state: stateCfg.name });
            found = true;
          } else {
            console.log(`  No winner found on page`);
          }
          break;
        }
      }
      if (!found) console.log(`"${constName}" not found. Try running: node scrapers/scrape-puppeteer.js state:${stateArg ?? 'statename'}`);
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
