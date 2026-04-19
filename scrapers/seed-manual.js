/**
 * DRISHTA — Manual Seed
 * Seeds politicians directly from seed-data.json.
 * Use this when the MyNeta scraper fails.
 *
 * node scrapers/seed-manual.js
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

config({ path: '.env.local' });

const __dirname = dirname(fileURLToPath(import.meta.url));

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log('\n=== DRISHTA MANUAL SEED ===\n');

  // Load seed data
  const dataPath = join(__dirname, 'seed-data.json');
  let seedData;
  try {
    seedData = JSON.parse(readFileSync(dataPath, 'utf8'));
  } catch {
    console.error('✗ seed-data.json not found. Run: node scrapers/generate-seed.js first');
    process.exit(1);
  }

  const { constituencies, politicians } = seedData;
  console.log(`Loaded: ${constituencies.length} constituencies, ${politicians.length} politicians`);

  // Upsert constituencies
  console.log('\n[1/2] Seeding constituencies...');
  const BATCH = 100;
  for (let i = 0; i < constituencies.length; i += BATCH) {
    const batch = constituencies.slice(i, i + BATCH);
    const { error } = await supabase
      .from('constituencies')
      .upsert(batch, { onConflict: 'slug,state,type' });
    if (error) console.error(`  Batch ${Math.floor(i/BATCH)+1} error:`, error.message);
    else process.stdout.write('.');
  }
  console.log(`\n  ✓ ${constituencies.length} constituencies upserted`);

  // Fetch constituency IDs for linking
  const { data: dbConsts } = await supabase
    .from('constituencies')
    .select('id, name, state, type');

  const constMap = new Map();
  for (const c of dbConsts ?? []) {
    constMap.set(`${c.state}||${c.name}||${c.type}`, c.id);
  }

  // Upsert politicians
  console.log('\n[2/2] Seeding politicians...');
  const records = politicians.map(p => ({
    ...p,
    constituency_id: constMap.get(`${p.state}||${p.constituency_name}||${p.level === 'MP' ? 'LS' : 'VS'}`) ?? null,
  }));

  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    const { error } = await supabase
      .from('politicians')
      .upsert(batch, { onConflict: 'slug,state' });
    if (error) console.error(`  Batch ${Math.floor(i/BATCH)+1} error:`, error.message);
    else process.stdout.write('.');
  }
  console.log(`\n  ✓ ${records.length} politicians upserted`);

  console.log('\n=== SEED COMPLETE ===\n');
}

main().catch(e => {
  console.error('Seed failed:', e.message);
  process.exit(1);
});
