/**
 * DRISHTA — Sansad.in Scraper (REST, no Puppeteer)
 *
 * Fetches all 18th Lok Sabha data from sansad.in public JSON APIs and populates:
 *   politicians  — name, gender, party, photo_url, age, education, sansad_id, constituency_id
 *   parliament_performance — days_signed, questions_asked per session
 *
 * Usage:
 *   node scrapers/scrape-sansad.js members     — seed all 540 MPs
 *   node scrapers/scrape-sansad.js attendance  — attendance across all sessions
 *   node scrapers/scrape-sansad.js questions   — probe + fetch questions data
 *   node scrapers/scrape-sansad.js bio         — fetch individual MP bio details
 *   node scrapers/scrape-sansad.js all         — members + attendance + questions (default)
 *   node scrapers/scrape-sansad.js probe       — discover available API endpoints
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
const BASE = 'https://sansad.in';
const HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Referer': 'https://sansad.in/ls/members',
  'Origin': 'https://sansad.in',
};

// ── NORMALIZATION ──────────────────────────────────────────────────────────────

// sansad.in stateName → canonical project state name
const STATE_ALIASES = {
  'nct of delhi': 'Delhi',
  'national capital territory of delhi': 'Delhi',
  'jammu & kashmir': 'Jammu and Kashmir',
  'jammu and kashmir': 'Jammu and Kashmir',
  'odisha': 'Odisha',
  'orissa': 'Odisha',
};

function normalizeState(raw) {
  const key = (raw ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (STATE_ALIASES[key]) return STATE_ALIASES[key];
  // Title case
  return key.replace(/\b\w/g, c => c.toUpperCase());
}

function normalizeName(str) {
  if (!str) return '';
  return str
    .replace(/^\s*(Shri|Smt\.?|Dr\.?|Prof\.?|Adv\.?|Kumari|Sh\.?|Mr\.?|Mrs\.?|Ms\.?|Late|Col\.?|Capt\.?|Er\.?|Gen\.?|Brig\.?)\s+/gi, '')
    .replace(/([A-Za-z])\.([A-Za-z])/g, '$1 $2')
    .replace(/([A-Za-z])\.\s*/g, '$1 ')
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

function nfm(str) { // normalize for matching
  return (str ?? '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

// ── HTTP ───────────────────────────────────────────────────────────────────────

async function fetchJSON(url, silent = false) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  return JSON.parse(text);
}

// ── FETCH MEMBERS ──────────────────────────────────────────────────────────────

async function fetchAllMembers() {
  console.log('Fetching all 18th LS members from sansad.in…');
  const url = `${BASE}/api_ls/member?loksabha=18&state=&party=&gender=&ageFrom=&ageTo=&noOfTerms=&searchText=&constituency=&sitting=1&locale=en&month=&profession=&otherProfession=&constituencyCategory=&positionCode=&qualification=&noOfChildren=&isFreedomFighter=&memberStatus=s&page=1&size=600`;
  const data = await fetchJSON(url);
  const list = data.membersDtoList ?? [];
  console.log(`  → ${list.length} members fetched`);
  return list;
}

// ── CONSTITUENCY MATCHING ──────────────────────────────────────────────────────

function matchConstituency(sansadConstName, dbState, dbConsts) {
  const nc = nfm(sansadConstName);
  const ns = nfm(dbState);

  // Exact name + state
  let m = dbConsts.find(c => nfm(c.name) === nc && nfm(c.state) === ns);
  if (m) return m;

  // Exact name, any state (for edge cases like single-seat UTs)
  m = dbConsts.find(c => nfm(c.name) === nc);
  if (m) return m;

  // Prefix/suffix fuzzy — one contains the other, same state
  m = dbConsts.find(c => {
    const cn = nfm(c.name);
    return (nc.startsWith(cn) || cn.startsWith(nc)) && nfm(c.state) === ns;
  });
  if (m) return m;

  // Broader contains, same state
  m = dbConsts.find(c => {
    const cn = nfm(c.name);
    return (nc.includes(cn) || cn.includes(nc)) && nfm(c.state) === ns;
  });
  return m ?? null;
}

// ── SEED MPs ───────────────────────────────────────────────────────────────────

async function seedMembers(members) {
  console.log(`\n[MEMBERS] Seeding ${members.length} MPs…`);

  const { data: dbConsts, error: cErr } = await supabase
    .from('constituencies').select('id, name, state, slug').eq('type', 'LS');
  if (cErr) throw new Error('Failed to load constituencies: ' + cErr.message);
  console.log(`  Loaded ${dbConsts.length} LS constituencies from DB`);

  const records = [];
  const unmatched = [];

  for (const m of members) {
    const state = normalizeState(m.stateName);
    const constRaw = normalizeName(m.constName ?? '');
    const constMatch = matchConstituency(constRaw, state, dbConsts);

    if (!constMatch) unmatched.push({ name: m.mpFirstLastName, constName: constRaw, state });

    // Build name: strip honorific from firstName/lastName, not initial
    const firstName = (m.firstName ?? '').trim();
    const lastName  = (m.lastName ?? '').trim();
    const fullRaw   = [m.initial, firstName, lastName].filter(Boolean).join(' ');
    const name      = normalizeName(fullRaw);

    // Unique slug per (slug, state) — append constituency slug if collision risk
    const baseSlug = toSlug(name);

    records.push({
      name,
      slug:             baseSlug,
      state,
      level:            'MP',
      party:            m.partyFname?.trim() || null,
      party_short:      m.partySname?.trim() || null,
      constituency_id:  constMatch?.id ?? null,
      constituency_name: constRaw,
      photo_url:        m.imageUrl || null,
      term_start:       '2024-06-05',  // 18th LS oath ceremony
      election_year:    2024,
      gender:           m.gender === 'MALE' ? 'M' : m.gender === 'FEMALE' ? 'F' : null,
      age:              m.age ?? null,
      education:        m.qualification?.trim() || null,
      sansad_id:        String(m.mpsno),
    });
  }

  if (unmatched.length) {
    console.log(`\n  ⚠ ${unmatched.length} MPs could not be matched to a constituency:`);
    unmatched.forEach(u => console.log(`    • ${u.name} — "${u.constName}" (${u.state})`));
  }

  // Detect slug collisions within same state and append constituency suffix
  const seen = new Map(); // "slug||state" → first record
  for (const r of records) {
    const key = `${r.slug}||${r.state}`;
    if (seen.has(key)) {
      // Both need disambiguation
      const prev = seen.get(key);
      if (!prev._disambiguated) {
        prev.slug = `${prev.slug}-${toSlug(prev.constituency_name).substring(0, 15)}`;
        prev._disambiguated = true;
      }
      r.slug = `${r.slug}-${toSlug(r.constituency_name).substring(0, 15)}`;
    } else {
      seen.set(key, r);
    }
  }

  const BATCH = 50;
  let saved = 0;
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH).map(({ _disambiguated, ...r }) => r);
    const { error } = await supabase
      .from('politicians')
      .upsert(batch, { onConflict: 'slug,state', ignoreDuplicates: false });
    if (error) console.error(`  Batch ${Math.floor(i / BATCH) + 1} error:`, error.message);
    else { saved += batch.length; process.stdout.write('.'); }
  }
  console.log(`\n  ✓ ${saved}/${members.length} politicians upserted`);
  if (unmatched.length) console.log(`  ✓ ${members.length - unmatched.length} with constituency_id linked`);
}

// ── FETCH INDIVIDUAL MP BIO (per-member detail API) ────────────────────────────

async function fetchMemberBio(mpsno) {
  // Try several likely endpoint patterns
  const candidates = [
    `${BASE}/api_ls/member/getMemberBiographicalInformation?mpsno=${mpsno}&locale=en`,
    `${BASE}/api_ls/member/bioinfo?mpsno=${mpsno}&locale=en`,
    `${BASE}/api_ls/member/profile?mpsno=${mpsno}&locale=en`,
    `${BASE}/api_ls/member/${mpsno}?locale=en`,
    `${BASE}/api_ls/member/getMember?mpsno=${mpsno}&locale=en`,
  ];
  for (const url of candidates) {
    try {
      const data = await fetchJSON(url);
      if (data && typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length > 3) {
        return { url, data };
      }
    } catch {}
    await sleep(150);
  }
  return null;
}

async function runBioProbe(members) {
  // Probe first 3 MPs to discover the bio API
  const sample = members.slice(0, 3);
  console.log('\n[BIO PROBE] Testing individual member API patterns…');
  for (const m of sample) {
    console.log(`  mpsno=${m.mpsno} (${m.mpFirstLastName}):`);
    const result = await fetchMemberBio(m.mpsno);
    if (result) {
      console.log(`    ✓ Found: ${result.url}`);
      console.log(`    Keys: ${JSON.stringify(Object.keys(result.data))}`);
      console.log(`    Data: ${JSON.stringify(result.data).substring(0, 400)}`);
    } else {
      console.log('    ✗ No bio endpoint found');
    }
  }
}

// ── ATTENDANCE ─────────────────────────────────────────────────────────────────

async function fetchAttendance() {
  console.log('\n[ATTENDANCE] Fetching session-wise attendance (LS 18, sessions 1–9)…');
  const totals = {}; // mpsno → aggregated record

  for (let session = 1; session <= 9; session++) {
    const url = `${BASE}/api_ls/member/getMemberAttendanceMemberWise?loksabha=18&session=${session}&locale=en`;
    try {
      const data = await fetchJSON(url);
      if (Array.isArray(data) && data.length > 0) {
        console.log(`  Session ${session}: ${data.length} records`);
        for (const r of data) {
          const key = r.mpsno ?? r.memberName ?? '';
          if (!key) continue;
          if (!totals[key]) {
            totals[key] = {
              mpsno:       String(r.mpsno ?? ''),
              name:        r.memberName ?? '',
              constName:   r.constituency ?? '',
              state:       r.state ?? '',
              total_days:  0,
            };
          }
          totals[key].total_days += parseInt(r.signedDaysCount) || 0;
        }
      } else {
        console.log(`  Session ${session}: no data`);
      }
    } catch (e) {
      console.log(`  Session ${session}: ${e.message}`);
    }
    await sleep(400);
  }

  const rows = Object.values(totals);
  console.log(`  Total: ${rows.length} MPs with attendance data`);
  return rows;
}

// ── QUESTIONS ─────────────────────────────────────────────────────────────────

async function fetchQuestions() {
  console.log('\n[QUESTIONS] Probing for questions API…');

  const candidates = [
    `${BASE}/api_ls/member/getMemberWiseQuestions?loksabha=18&locale=en`,
    `${BASE}/api_ls/questions/getMemberWiseQuestions?loksabha=18&locale=en`,
    `${BASE}/api_ls/member/getMemberParticipation?loksabha=18&locale=en`,
    `${BASE}/api_ls/member/getMemberWiseParticipation?loksabha=18&locale=en`,
    `${BASE}/api_ls/member/memberParticipation?loksabha=18&locale=en`,
    `${BASE}/api_ls/questions/memberWise?loksabha=18&locale=en`,
    `${BASE}/api_ls/business/getMemberWiseParticipation?loksabha=18&locale=en`,
    `${BASE}/api_ls/member/getParticipation?loksabha=18&locale=en`,
    `${BASE}/api_ls/member/getMemberWiseDebate?loksabha=18&locale=en`,
  ];

  for (const url of candidates) {
    try {
      const data = await fetchJSON(url);
      if (Array.isArray(data) && data.length > 10) {
        console.log(`  ✓ Found: ${url}`);
        console.log(`  Fields: ${JSON.stringify(Object.keys(data[0]))}`);
        return data;
      }
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const keys = Object.keys(data);
        console.log(`  Object response at ${url} — keys: ${keys.join(', ')}`);
      }
    } catch {}
    await sleep(200);
  }

  console.log('  ✗ No questions API found with this probe list');
  return [];
}

// ── DEBATES ───────────────────────────────────────────────────────────────────

async function fetchDebates() {
  console.log('\n[DEBATES] Probing for debates API…');

  const candidates = [
    `${BASE}/api_ls/member/getMemberWiseDebate?loksabha=18&locale=en`,
    `${BASE}/api_ls/business/getMemberWiseDebate?loksabha=18&locale=en`,
    `${BASE}/api_ls/debates/memberWise?loksabha=18&locale=en`,
    `${BASE}/api_ls/member/getMemberDebates?loksabha=18&locale=en`,
    `${BASE}/api_ls/member/memberDebate?loksabha=18&locale=en`,
  ];

  for (const url of candidates) {
    try {
      const data = await fetchJSON(url);
      if (Array.isArray(data) && data.length > 10) {
        console.log(`  ✓ Found: ${url}`);
        console.log(`  Fields: ${JSON.stringify(Object.keys(data[0]))}`);
        return data;
      }
    } catch {}
    await sleep(200);
  }

  console.log('  ✗ No debates API found');
  return [];
}

// ── SAVE PERFORMANCE ──────────────────────────────────────────────────────────

async function savePerformance(attendanceRows, questionsData, debatesData) {
  console.log('\n[SAVE] Writing parliament_performance…');

  const { data: mps } = await supabase
    .from('politicians')
    .select('id, name, sansad_id, state, constituency_name')
    .eq('level', 'MP')
    .eq('election_year', 2024);

  if (!mps?.length) {
    console.log('  ⚠ No MPs in DB. Run: node scrapers/scrape-sansad.js members first.');
    return;
  }

  // Build lookup maps by mpsno and normalized name
  const attBySansadId = new Map(attendanceRows.map(r => [String(r.mpsno), r]));
  const attByName     = new Map(attendanceRows.map(r => [nfm(r.name), r]));

  const qBySansadId   = new Map(questionsData.map(r => [String(r.mpsno ?? ''), parseInt(r.questionsCount ?? r.noOfQuestions ?? r.questions ?? 0) || 0]));
  const qByName       = new Map(questionsData.map(r => [nfm(r.memberName ?? r.name ?? ''), parseInt(r.questionsCount ?? r.noOfQuestions ?? 0) || 0]));

  const dBySansadId   = new Map(debatesData.map(r => [String(r.mpsno ?? ''), parseInt(r.debatesCount ?? r.noOfDebates ?? 0) || 0]));
  const dByName       = new Map(debatesData.map(r => [nfm(r.memberName ?? r.name ?? ''), parseInt(r.debatesCount ?? r.noOfDebates ?? 0) || 0]));

  let saved = 0, skipped = 0;

  for (const mp of mps) {
    const sid = String(mp.sansad_id ?? '');
    const nn  = nfm(mp.name);

    const att      = attBySansadId.get(sid) ?? attByName.get(nn);
    const questions = qBySansadId.get(sid) ?? qByName.get(nn) ?? null;
    const debates   = dBySansadId.get(sid) ?? dByName.get(nn) ?? null;

    if (!att && questions === null && debates === null) { skipped++; continue; }

    const { error } = await supabase
      .from('parliament_performance')
      .upsert({
        politician_id:   mp.id,
        politician_name: mp.name,
        level:           'MP',
        state:           mp.state,
        house:           'Lok Sabha',
        term:            '18th Lok Sabha (2024–2029)',
        days_signed:     att?.total_days ?? null,
        attendance_pct:  null,  // sansad.in gives days, not %; can compute later
        questions_asked: questions,
        debates_count:   debates,
        source_url:      'https://sansad.in/ls/members/attendance',
        last_scraped:    new Date().toISOString(),
      }, { onConflict: 'politician_id,term' });

    if (error) {
      console.error(`  ✗ ${mp.name}: ${error.message}`);
    } else {
      saved++;
      const parts = [];
      if (att) parts.push(`${att.total_days}d`);
      if (questions !== null) parts.push(`${questions}q`);
      if (debates !== null) parts.push(`${debates}deb`);
      console.log(`  ✓ ${mp.name} (${mp.state}) — ${parts.join(', ')}`);
    }
  }

  console.log(`\n  ✓ Saved: ${saved}  |  No data found: ${skipped}`);
}

// ── PROBE — discover all available APIs ──────────────────────────────────────

async function probeAPIs(members) {
  console.log('\n[PROBE] Discovering sansad.in API endpoints…\n');

  const probes = [
    // Master lists
    [`${BASE}/api_ls/member/master/qualifications`,    'master/qualifications'],
    [`${BASE}/api_ls/member/master/profession`,        'master/profession'],
    [`${BASE}/api_ls/member/master/positions`,         'master/positions'],
    [`${BASE}/api_ls/member/party-list`,               'party-list'],
    [`${BASE}/api_ls/member/partyWiseRepresentation?loksabha=18`, 'partyWiseRepresentation'],
    [`${BASE}/api_ls/business/AllLoksabhaAndSessionDates`,        'AllLoksabhaAndSessionDates'],
    // Performance / participation
    [`${BASE}/api_ls/member/getMemberAttendanceMemberWise?loksabha=18&session=1&locale=en`, 'attendance session 1'],
    [`${BASE}/api_ls/member/getMemberWiseQuestions?loksabha=18&locale=en`,     'questions (memberWise)'],
    [`${BASE}/api_ls/member/getMemberParticipation?loksabha=18&locale=en`,     'participation'],
    [`${BASE}/api_ls/member/getMemberWiseDebate?loksabha=18&locale=en`,        'debates'],
    [`${BASE}/api_ls/member/getMemberWiseBills?loksabha=18&locale=en`,         'bills'],
    [`${BASE}/api_ls/member/getMemberPrivateBills?loksabha=18&locale=en`,      'private bills'],
    [`${BASE}/api_ls/member/getMemberCallAttention?loksabha=18&locale=en`,     'call attention'],
    [`${BASE}/api_ls/member/getMemberSpecialMention?loksabha=18&locale=en`,    'special mention'],
    [`${BASE}/api_ls/member/getMemberPrivilegeBreach?loksabha=18&locale=en`,   'privilege breach'],
    // Bio/individual
    [`${BASE}/api_ls/member/getMemberBiographicalInformation?mpsno=${members[0].mpsno}&locale=en`, `bio mpsno=${members[0].mpsno}`],
    [`${BASE}/api_ls/member/getMemberCommitteeDetails?mpsno=${members[0].mpsno}&locale=en`,        `committee mpsno=${members[0].mpsno}`],
    [`${BASE}/api_ls/member/getContactDetails?mpsno=${members[0].mpsno}&locale=en`,               `contact mpsno=${members[0].mpsno}`],
  ];

  for (const [url, label] of probes) {
    try {
      const data = await fetchJSON(url);
      const size = Array.isArray(data) ? data.length : (typeof data === 'object' ? Object.keys(data).length : 0);
      const sample = Array.isArray(data) && data.length > 0
        ? ` | keys: ${JSON.stringify(Object.keys(data[0]))}`
        : (typeof data === 'object' ? ` | keys: ${JSON.stringify(Object.keys(data)).substring(0, 80)}` : '');
      console.log(`  ✓ ${label.padEnd(35)} size=${String(size).padStart(4)}${sample}`);
    } catch (e) {
      console.log(`  ✗ ${label.padEnd(35)} ${e.message}`);
    }
    await sleep(300);
  }
}

// ── MAIN ──────────────────────────────────────────────────────────────────────

async function main() {
  const mode = process.argv[2] ?? 'all';
  console.log(`\n=== DRISHTA SANSAD SCRAPER  mode=${mode} ===\n`);

  const members = await fetchAllMembers();

  if (mode === 'probe') {
    await runBioProbe(members);
    await probeAPIs(members);
    return;
  }

  if (mode === 'members' || mode === 'all') {
    await seedMembers(members);
  }

  if (mode === 'attendance' || mode === 'all') {
    const attendance = await fetchAttendance();
    const questions  = await fetchQuestions();
    const debates    = await fetchDebates();
    await savePerformance(attendance, questions, debates);
  }

  if (mode === 'bio') {
    await runBioProbe(members);
  }

  console.log('\n=== DONE ===\n');
}

main().catch(e => { console.error('\n✗', e.message); process.exit(1); });
