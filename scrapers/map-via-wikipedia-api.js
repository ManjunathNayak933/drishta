/**
 * DRISHTA — Wikipedia API Mapper
 * Uses Wikipedia's JSON API (no Puppeteer, no HTML parsing)
 * to get exact VS segments for every LS constituency.
 *
 * Run: node scrapers/map-via-wikipedia-api.js
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

// Wikipedia API — returns wikitext for any article
async function getWikitext(articleTitle) {
  const url = `https://en.wikipedia.org/w/api.php?` +
    `action=query&titles=${encodeURIComponent(articleTitle)}` +
    `&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Drishta/1.0 (civic-platform; contact@drishta.in)' }
  });
  const data = await res.json();
  const pages = data?.query?.pages;
  if (!pages?.length || pages[0].missing) return null;
  return pages[0].revisions?.[0]?.slots?.main?.content ?? null;
}

// Parse VS segments from wikitext infobox
function parseSegments(wikitext) {
  if (!wikitext) return [];

  // Pattern 1: |constituencies = Seg1 Seg2 Seg3 (space separated links)
  const p1 = wikitext.match(/\|\s*constituencies\s*=([^\n\|}{]+)/i);
  if (p1) {
    const names = p1[1]
      .replace(/\[\[([^\|\]]+)(?:\|[^\]]+)?\]\]/g, '$1') // [[Name|Display]] → Name
      .replace(/\[\[([^\]]+)\]\]/g, '$1')
      .split(/[\n,•·]+/)
      .map(s => s.trim().replace(/\s*assembly constituency$/i, '').trim())
      .filter(s => s.length > 2 && !s.match(/^\d+$/));
    if (names.length >= 3) return names;
  }

  // Pattern 2: | assembly_segments = or | segments =
  const p2 = wikitext.match(/\|\s*(?:assembly_segments?|segments?)\s*=([^\n\|}{]+)/i);
  if (p2) {
    const names = p2[1]
      .replace(/\[\[([^\|\]]+)(?:\|[^\]]+)?\]\]/g, '$1')
      .split(/[\n,•·]+/)
      .map(s => s.trim())
      .filter(s => s.length > 2);
    if (names.length >= 3) return names;
  }

  // Pattern 3: find table rows with "No | Name" pattern (assembly segment tables)
  const tableMatch = wikitext.match(/\{\|[^}]*wikitable[\s\S]*?\|\}/);
  if (tableMatch) {
    const rows = tableMatch[0].split(/\n\|-/).slice(1);
    const names = [];
    for (const row of rows) {
      const cells = row.split(/\n\|/).map(c => c.replace(/\[\[([^\|\]]+)(?:\|[^\]]+)?\]\]/g, '$1').trim());
      // Row format: | 119 | Kundapura | Udupi | ...
      const name = cells.find(c => c.length > 2 && c.length < 50 && !c.match(/^\d+$/) && !c.match(/district|division/i));
      if (name) names.push(name);
    }
    if (names.length >= 3) return names.slice(0, 9);
  }

  return [];
}

function normalize(name) {
  return name
    .replace(/\s*\(S[CT]\)\s*/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function findVS(vsLookup, vsConsts, seg) {
  const key = normalize(seg);
  if (vsLookup.has(key)) return vsLookup.get(key);
  // starts-with in both directions handles Kundapura↔Kundapur, Bantval↔Bantwal etc.
  return vsConsts.find(v => {
    const vn = normalize(v.name);
    return (vn.startsWith(key) || key.startsWith(vn)) && Math.min(vn.length, key.length) >= 4;
  }) ?? null;
}

async function main() {
  console.log('\n=== WIKIPEDIA API → VS-LS MAP ===\n');

  // Fetch all constituencies
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
  console.log(`Loaded ${allConsts.length} constituencies from DB\n`);

  // Clear existing map
  await supabase.from('vs_ls_map').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // Build VS lookup per state
  const vsByState = {};
  const lsByState = {};
  for (const c of allConsts) {
    if (c.type === 'VS') {
      if (!vsByState[c.state]) vsByState[c.state] = [];
      vsByState[c.state].push(c);
    } else {
      if (!lsByState[c.state]) lsByState[c.state] = [];
      lsByState[c.state].push(c);
    }
  }

  let totalMapped = 0;
  const failedLS = [];

  const states = Object.keys(lsByState).sort();

  for (const state of states) {
    const lsConsts = lsByState[state] ?? [];
    const vsConsts = vsByState[state] ?? [];

    if (!vsConsts.length) continue;

    // Build VS name lookup for this state
    const vsLookup = new Map();
    for (const vs of vsConsts) {
      vsLookup.set(normalize(vs.name), vs);
      vsLookup.set(vs.name.toLowerCase(), vs);
    }

    // States with 1 LS seat — all VS map to that LS
    if (lsConsts.length === 1) {
      const mappings = vsConsts.map(vs => ({
        vs_constituency_id: vs.id,
        ls_constituency_id: lsConsts[0].id,
        vs_name: vs.name,
        ls_name: lsConsts[0].name,
        state,
      }));
      const { error } = await supabase.from('vs_ls_map')
        .upsert(mappings, { onConflict: 'vs_constituency_id' });
      if (!error) {
        console.log(`${state}: ${mappings.length} VS → ${lsConsts[0].name} (single seat)`);
        totalMapped += mappings.length;
      }
      continue;
    }

    console.log(`\n${state} (${lsConsts.length} LS, ${vsConsts.length} VS):`);
    let stateMapped = 0;

    for (const ls of lsConsts) {
      // Convert DB name (possibly UPPERCASE) to Wikipedia title case
    const cleanName = ls.name
      .replace(/\s*\(S[CT]\)\s*/i, '')     // remove (SC)/(ST)
      .replace(/\s*:.*$/, '')               // remove ": BYE ELECTION..." etc
      .replace(/\s*-\s*/g, ' ')             // "BURDWAN - DURGAPUR" → "BURDWAN DURGAPUR"
      .trim();
    const wikiTitle = cleanName
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join('_') + '_Lok_Sabha_constituency';
    process.stdout.write(`  ${cleanName}... `);

      const wikitext = await getWikitext(wikiTitle);
      const segments = parseSegments(wikitext);

      if (segments.length === 0) {
        // Try alternate title
        const altTitle = ls.name.replace(/\s+/g, '_') + '_parliamentary_constituency';
        const wikitext2 = await getWikitext(altTitle);
        const segments2 = parseSegments(wikitext2);
        if (segments2.length > 0) segments.push(...segments2);
      }

      if (segments.length === 0) {
        console.log(`✗ not found`);
        failedLS.push({ state, ls: ls.name });
        await sleep(500);
        continue;
      }

      const mappings = [];
      for (const seg of segments) {
        const vs = findVS(vsLookup, vsConsts, seg);
        if (vs) {
          mappings.push({
            vs_constituency_id: vs.id,
            ls_constituency_id: ls.id,
            vs_name: vs.name,
            ls_name: ls.name,
            state,
          });
        }
      }

      if (mappings.length > 0) {
        // Deduplicate — keep only first mapping per VS constituency
        const deduped = new Map();
        for (const m of mappings) deduped.set(m.vs_constituency_id, m);
        const uniqueMappings = [...deduped.values()];

        const { error } = await supabase.from('vs_ls_map')
          .upsert(uniqueMappings, { onConflict: 'vs_constituency_id' });
        if (!error) {
          console.log(`✓ ${mappings.length}/${segments.length} segments`);
          stateMapped += mappings.length;
          totalMapped += mappings.length;
        } else {
          console.log(`✗ DB error: ${error.message}`);
        }
      } else {
        console.log(`✗ segments found but no DB match: ${segments.slice(0,3).join(', ')}...`);
        failedLS.push({ state, ls: ls.name, segments });
      }

      await sleep(300); // polite to Wikipedia API
    }

    console.log(`  → ${stateMapped} mapped`);
  }

  console.log(`\n\n✓ TOTAL MAPPED: ${totalMapped} VS constituencies`);

  if (failedLS.length > 0) {
    console.log(`\nFailed (${failedLS.length} LS constituencies):`);
    failedLS.slice(0, 20).forEach(f => {
      console.log(`  ${f.state} - ${f.ls}${f.segments ? ': ' + f.segments.slice(0,2).join(', ') : ''}`);
    });
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
