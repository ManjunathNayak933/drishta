/**
 * DRISHTA — Fix Constituency IDs + MP States
 * Fixes two bugs:
 * 1. Politicians saved with null constituency_id (Supabase 1000-row limit bug)
 * 2. MPs saved with state='Unknown' (scraper passed wrong state)
 *
 * Run: node scrapers/fix-constituency-ids.js
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function main() {
  console.log('\n=== FIX CONSTITUENCY IDs + MP STATES ===\n');

  // 1. Fetch ALL constituencies with pagination
  console.log('[1] Fetching all constituencies…');
  let allConsts = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('constituencies')
      .select('id, name, state, type')
      .range(from, from + 999);
    if (error || !data?.length) break;
    allConsts.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  console.log(`  Loaded ${allConsts.length} constituencies`);

  // Build maps: exact match + name-only (for MPs)
  const exactMap = new Map(); // "state||name||type" → id
  const nameMap  = new Map(); // "name||type" → { id, state }

  for (const c of allConsts) {
    exactMap.set(`${c.state}||${c.name}||${c.type}`, c.id);
    exactMap.set(`${c.state}||${c.name.toUpperCase()}||${c.type}`, c.id);

    // Name-only for MPs whose state was saved as 'Unknown'
    const key = `${c.name.toUpperCase()}||${c.type}`;
    if (!nameMap.has(key)) nameMap.set(key, { id: c.id, state: c.state });

    // Also store stripped version (remove " (SC)", " (ST)", " (GEN)" suffixes)
    const stripped = c.name.replace(/\s*\([^)]+\)\s*$/g, '').trim().toUpperCase();
    const strippedKey = `${stripped}||${c.type}`;
    if (!nameMap.has(strippedKey)) nameMap.set(strippedKey, { id: c.id, state: c.state });
  }

  // 2. Fetch ALL politicians that need fixing
  // (null constituency_id OR state='Unknown')
  console.log('\n[2] Fetching politicians that need fixing…');
  let toFix = [];
  from = 0;
  while (true) {
    // Get both null constituency_id and Unknown state
    const { data, error } = await supabase
      .from('politicians')
      .select('id, name, state, level, constituency_name')
      .or('constituency_id.is.null,state.eq.Unknown')
      .range(from, from + 999);
    if (error || !data?.length) break;
    toFix.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  console.log(`  Found ${toFix.length} politicians to fix`);

  if (toFix.length === 0) {
    console.log('\n✓ Nothing to fix.');
    return;
  }

  // 3. Match and build updates
  console.log('\n[3] Matching…');
  let fixed = 0, notFound = 0;
  const updates = [];

  for (const pol of toFix) {
    const type = pol.level === 'MP' ? 'LS' : 'VS';
    const name = pol.constituency_name;
    if (!name) { notFound++; continue; }

    // Try exact match (state + name)
    let constId = exactMap.get(`${pol.state}||${name}||${type}`)
               || exactMap.get(`${pol.state}||${name.toUpperCase()}||${type}`)
               || exactMap.get(`${pol.state}||${name.toLowerCase()}||${type}`);
    let newState = pol.state;

    // For Unknown state or no match — use name-only lookup
    if (!constId || pol.state === 'Unknown') {
      const nameUpper = name.toUpperCase();
      // Try exact uppercase
      let match = nameMap.get(`${nameUpper}||${type}`);
      // Try stripping "(SC)", "(ST)", "(GEN)" suffixes that MyNeta appends
      if (!match) {
        const stripped = nameUpper.replace(/\s*\([^)]+\)\s*$/g, '').trim();
        match = nameMap.get(`${stripped}||${type}`);
      }
      if (match) { constId = match.id; newState = match.state; }
    }

    if (constId) {
      updates.push({ id: pol.id, constituency_id: constId, state: newState });
      fixed++;
    } else {
      notFound++;
      if (notFound <= 5) console.log(`  ✗ No match: ${pol.name} | ${name} | ${type} | state: ${pol.state}`);
    }
  }

  console.log(`  Matched: ${fixed}, Unmatched: ${notFound}`);

  // 4. Batch update
  console.log('\n[4] Updating database…');
  const BATCH = 50;
  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH);
    await Promise.all(batch.map(({ id, constituency_id, state }) =>
      supabase.from('politicians').update({ constituency_id, state }).eq('id', id)
    ));
    process.stdout.write('.');
  }

  console.log(`\n\n✓ Fixed ${fixed} politicians (constituency_id + state).`);
}

main().catch(e => {
  console.error('Failed:', e.message);
  process.exit(1);
});
