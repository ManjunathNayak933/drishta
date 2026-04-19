/**
 * DRISHTA — India.gov.in MLA Directory Scraper
 *
 * Source: https://www.india.gov.in/directory/whos-who/mla
 * API:    POST /directory/whos-who/mlamlcservices/dataservice/getmlamlcdata
 *
 * This gives us MLAs for ALL 30 states in one run.
 * Complements MyNeta (which has criminal/assets data).
 * Use this for: current MLA name, constituency, party, photo, state
 *
 * Run: node scrapers/scrape-mla-indiagovt.js
 * Run for one state: node scrapers/scrape-mla-indiagovt.js state:karnataka
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

const BASE_URL = 'https://www.india.gov.in/directory/whos-who/mlamlcservices/dataservice/getmlamlcdata';
const HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Referer': 'https://www.india.gov.in/directory/whos-who/mla',
  'Origin': 'https://www.india.gov.in',
};

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
    .replace(/\s*\(s[ct]\)\s*$/i, '')
    .replace(/\s*-\s*/g, ' ')
    .replace(/\s+/g, ' ').trim()
    .split(' ').filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function toSlug(text) {
  return (text ?? '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').trim()
    .replace(/\s+/g, '-').replace(/-+/g, '-');
}

async function fetchMLAs(stateFilter = null) {
  const termMatches = [{ fieldName: 'type', fieldValue: 'mla' }];
  if (stateFilter) {
    termMatches.push({ fieldName: 'state', fieldValue: stateFilter });
  }

  // First call to get total
  const firstBody = JSON.stringify({ termMatches, pageNumber: 1, pageSize: 21 });
  const firstRes = await fetch(BASE_URL, { method: 'POST', headers: HEADERS, body: firstBody });
  if (!firstRes.ok) throw new Error(`API returned ${firstRes.status}`);
  const firstData = await firstRes.json();

  const total = firstData.mlamlcResponse?.total ?? 5000;
  console.log(`  Total available: ${total}`);

  // Second call with full pageSize
  const body = JSON.stringify({ termMatches, pageNumber: 1, pageSize: total });
  const res = await fetch(BASE_URL, { method: 'POST', headers: HEADERS, body });
  if (!res.ok) throw new Error(`API returned ${res.status}`);
  const data = await res.json();

  const items = data.mlamlcResponse?.results?.mlaList ?? [];

  if (!items.length) {
    console.log('  Raw sample:', JSON.stringify(data).slice(0, 300));
    throw new Error('Could not find MLA list in response');
  }

  console.log(`  Fetched ${items.length} MLAs`);
  if (items.length > 0) {
    console.log('  First item keys:', Object.keys(items[0]).join(', '));
    console.log('  Sample:', JSON.stringify(items[0]).slice(0, 300));
  }

  return items;
}

async function saveMLAs(items) {
  let saved = 0, skipped = 0;

  for (const item of items) {
    // Actual field names from india.gov.in API
    const name = normalizeName(
      item.title ?? item.name ?? item.memberName ?? ''
    );
    const constituency = normalizeConstituency(
      item.constituencyName ?? item.constituency ?? item.const_name ?? ''
    );
    const state = item.stateName ?? item.state ?? '';
    const party = item.partyName ?? item.party ?? '';
    const photoUrl = item.photo ?? item.photoUrl ?? item.imageUrl ?? null;

    if (!name || !constituency || !state) { skipped++; continue; }

    const slug = toSlug(name);

    // Find constituency in DB
    const { data: constRow } = await supabase
      .from('constituencies')
      .select('id')
      .ilike('name', constituency)
      .eq('state', state)
      .eq('type', 'VS')
      .maybeSingle();

    // Check if existing MLA for this seat
    const { data: existing } = await supabase
      .from('politicians')
      .select('id, name, election_year')
      .ilike('constituency_name', constituency)
      .eq('state', state)
      .eq('level', 'MLA')
      .maybeSingle();

    if (existing) {
      // Only update if name is different (new MLA) — no year available from this source
      if (normalizeName(existing.name).toLowerCase() === name.toLowerCase()) {
        // Same person — just update photo if missing
        if (photoUrl) {
          await supabase.from('politicians').update({ photo_url: photoUrl }).eq('id', existing.id);
        }
        skipped++;
        continue;
      }
      // Different person — archive old and insert new
      // (No election_year from this source, so just replace)
    }

    await supabase.from('politicians').upsert({
      name,
      slug,
      state,
      level: 'MLA',
      party,
      constituency_id: constRow?.id ?? null,
      constituency_name: constituency,
      photo_url: photoUrl,
    }, { onConflict: 'slug,state' });

    process.stdout.write(`  ✓ ${name} — ${constituency}\n`);
    saved++;
    await sleep(50);
  }

  return { saved, skipped };
}

async function main() {
  const arg = process.argv[2];
  const stateFilter = arg?.startsWith('state:')
    ? arg.replace('state:', '').replace(/-/g, ' ')
      .split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : null;

  console.log('\n=== INDIA.GOV.IN MLA SCRAPER ===');
  if (stateFilter) console.log(`Filtering for: ${stateFilter}`);
  console.log('');

  try {
    console.log('[1] Fetching from india.gov.in API…');
    const items = await fetchMLAs(stateFilter);

    console.log('\n[2] Saving to DB…');
    const { saved, skipped } = await saveMLAs(items);

    console.log(`\n✓ Done. Saved: ${saved}, Skipped/same: ${skipped}`);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

main();
