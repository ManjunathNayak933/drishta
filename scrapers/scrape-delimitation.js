/**
 * Scrape Wikipedia to get exact VS segments for each LS constituency.
 * Run: node scrapers/scrape-delimitation.js
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

// All 28 Karnataka LS constituencies with their Wikipedia article names
const KARNATAKA_LS = [
  'Chikkaballapur', 'Kolar', 'Bangalore Rural', 'Bangalore North',
  'Bangalore Central', 'Bangalore South', 'Tumkur', 'Mandya',
  'Mysore', 'Chamarajanagar', 'Udupi Chikmagalur', 'Hassan',
  'Dakshina Kannada', 'Uttara Kannada', 'Haveri', 'Dharwad',
  'Belagavi', 'Chikkodi', 'Bidar', 'Gulbarga', 'Raichur',
  'Bijapur', 'Bagalkot', 'Koppal', 'Bellary', 'Chitradurga',
  'Davangere', 'Shimoga',
];

async function scrapeVSSegments(page, lsName) {
  const wikiName = lsName.replace(/ /g, '_') + '_Lok_Sabha_constituency';
  const url = `https://en.wikipedia.org/wiki/${wikiName}`;

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await sleep(800);

    const segments = await page.evaluate(() => {
      // Method 1: Look for "Assembly constituencies" in infobox
      const infoRows = Array.from(document.querySelectorAll('.infobox tr'));
      for (const row of infoRows) {
        const label = row.querySelector('th')?.textContent?.trim() ?? '';
        if (label.toLowerCase().includes('assembly')) {
          const links = Array.from(row.querySelectorAll('td a'));
          if (links.length >= 3) return links.map(a => a.textContent.trim());
          // Sometimes it's plain text
          const text = row.querySelector('td')?.textContent?.trim() ?? '';
          if (text.length > 5) return text.split(/[\n,]+/).map(s => s.trim()).filter(s => s.length > 2);
        }
      }

      // Method 2: Find table with "Assembly segments" heading nearby
      const headings = Array.from(document.querySelectorAll('h2, h3'));
      for (const h of headings) {
        if (h.textContent.toLowerCase().includes('segment') || h.textContent.toLowerCase().includes('constituency')) {
          const table = h.nextElementSibling?.tagName === 'TABLE'
            ? h.nextElementSibling
            : h.parentElement?.nextElementSibling;
          if (table) {
            const rows = Array.from(table.querySelectorAll('tr')).slice(1); // skip header
            return rows
              .map(r => {
                const cells = r.querySelectorAll('td');
                return cells[1]?.textContent?.trim() ?? cells[0]?.textContent?.trim();
              })
              .filter(s => s && s.length > 2 && !s.match(/^\d+$/))
              .slice(0, 8);
          }
        }
      }

      // Method 3: Find any wikitable with 8 rows that looks like segments
      const tables = Array.from(document.querySelectorAll('table.wikitable'));
      for (const t of tables) {
        const rows = Array.from(t.querySelectorAll('tr')).slice(1);
        if (rows.length >= 6 && rows.length <= 10) {
          const names = rows.map(r => {
            const cells = r.querySelectorAll('td');
            const nameCell = cells[1] ?? cells[0];
            return nameCell?.textContent?.trim().replace(/\[.*?\]/g, '');
          }).filter(s => s && s.length > 2 && !s.match(/^\d+$/));
          if (names.length >= 6) return names.slice(0, 8);
        }
      }

      return [];
    });

    return segments.filter(s => s && s.length > 2);
  } catch (err) {
    console.error(`  Error for ${lsName}: ${err.message}`);
    return [];
  }
}

async function main() {
  console.log('\n=== SCRAPE DELIMITATION FROM WIKIPEDIA ===\n');

  // Fetch all constituencies from DB
  let allConsts = [];
  let from = 0;
  while (true) {
    const { data } = await supabase.from('constituencies')
      .select('id, name, state, type').range(from, from + 999);
    if (!data?.length) break;
    allConsts.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }

  const karnatakaVS = allConsts.filter(c => c.state === 'Karnataka' && c.type === 'VS');
  const karnatakaLS = allConsts.filter(c => c.state === 'Karnataka' && c.type === 'LS');

  // Build VS name lookup (handles case variations)
  const vsLookup = new Map();
  for (const vs of karnatakaVS) {
    vsLookup.set(vs.name.toLowerCase().replace(/[^a-z0-9]/g, ''), vs);
    vsLookup.set(vs.name.toLowerCase(), vs);
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    userDataDir: 'C:\\Temp\\puppeteer_drishta',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

  // Clear existing Karnataka mappings
  const karnatakaLSIds = karnatakaLS.map(c => c.id);
  if (karnatakaLSIds.length > 0) {
    await supabase.from('vs_ls_map')
      .delete()
      .in('ls_constituency_id', karnatakaLSIds);
    console.log('Cleared existing Karnataka mappings\n');
  }

  let totalMapped = 0;
  const unmapped = [];

  for (const lsName of KARNATAKA_LS) {
    process.stdout.write(`${lsName}... `);

    const lsConst = karnatakaLS.find(c =>
      c.name.toLowerCase().replace(/[^a-z]/g, '') ===
      lsName.toLowerCase().replace(/[^a-z]/g, '')
    );

    if (!lsConst) {
      console.log(`✗ not found in DB`);
      continue;
    }

    const segments = await scrapeVSSegments(page, lsName);

    if (segments.length === 0) {
      console.log(`✗ no segments found`);
      continue;
    }

    const mappings = [];
    for (const seg of segments) {
      // Try to match segment name to VS constituency
      const cleanSeg = seg.toLowerCase().replace(/\s*\(s[ct]\)\s*/i, '').replace(/[^a-z0-9]/g, '');
      const vsConst = vsLookup.get(cleanSeg)
        || vsLookup.get(seg.toLowerCase())
        || karnatakaVS.find(v => v.name.toLowerCase().startsWith(seg.toLowerCase().split(' ')[0]));

      if (vsConst) {
        mappings.push({
          vs_constituency_id: vsConst.id,
          ls_constituency_id: lsConst.id,
          vs_name: vsConst.name,
          ls_name: lsConst.name,
          state: 'Karnataka',
        });
      } else {
        unmapped.push({ ls: lsName, vs: seg });
      }
    }

    if (mappings.length > 0) {
      const { error } = await supabase.from('vs_ls_map')
        .upsert(mappings, { onConflict: 'vs_constituency_id' });
      if (error) {
        console.log(`✗ DB error: ${error.message}`);
      } else {
        console.log(`✓ ${mappings.length}/${segments.length} segments mapped`);
        totalMapped += mappings.length;
      }
    } else {
      console.log(`✗ segments found (${segments.join(', ')}) but none matched DB`);
    }

    await sleep(1000);
  }

  await browser.close();

  console.log(`\n✓ Total mapped: ${totalMapped} VS constituencies`);

  if (unmapped.length > 0) {
    console.log(`\nUnmapped segments (check spelling in DB):`);
    unmapped.forEach(u => console.log(`  ${u.ls} → "${u.vs}"`));
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
