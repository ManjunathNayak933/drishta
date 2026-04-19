/**
 * DRISHTA — MP Performance Scraper
 * Sources: sansad.in attendance API + debate API + questions API
 * Run: node scrapers/scrape-mp-performance.js
 */

import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchJSON(page, url) {
  return page.evaluate(async (u) => {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 6000);
      const r = await fetch(u, { signal: controller.signal });
      clearTimeout(t);
      return r.ok ? await r.json() : null;
    } catch { return null; }
  }, url);
}

async function main() {
  console.log('\n=== MP PERFORMANCE SCRAPER (sansad.in) ===\n');

  // ── 1. Fetch MPs from DB first ─────────────────────────────────────────────
  // No election_year filter — DB should only have current MPs after cleanup
  console.log('[1] Fetching MPs from DB…');
  const { data: mps } = await supabase
    .from('politicians')
    .select('id, name, state, constituency_name')
    .eq('level', 'MP')
    .not('constituency_name', 'eq', 'Rajya Sabha');
  console.log(`    ${mps?.length ?? 0} MPs loaded`);

  // ── Match functions ────────────────────────────────────────────────────────
  function norm(s) {
    return normalizeName(s ?? '').toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();
  }
  function isMatch(a, b) {
    const n1 = norm(a), n2 = norm(b);
    if (n1 === n2) return true;
    const w1 = n1.split(' '), w2 = n2.split(' ');
    if (w1.length >= 2 && w2.length >= 2 && w1.slice(-2).join(' ') === w2.slice(-2).join(' ')) return true;
    if (w1[0] === w2[w2.length-1] && w1[w1.length-1] === w2[0]) return true;
    return false;
  }
  function constMatch(a, b) {
    const c1 = norm(a), c2 = norm(b);
    return c1 === c2 || c1.includes(c2) || c2.includes(c1);
  }

  // ── 2. Launch browser ──────────────────────────────────────────────────────
  const browser = await puppeteer.launch({
    headless: 'new',
    userDataDir: 'C:\\Temp\\puppeteer_drishta_perf',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

  try {
    console.log('\n[2] Loading sansad.in…');
    await page.goto('https://sansad.in/ls/members/attendance', {
      waitUntil: 'networkidle2', timeout: 30000
    });
    await sleep(3000);

    // ── AUTO-DETECT: Current Lok Sabha + completed sessions ────────────────────
    console.log('\n[AUTO] Detecting current Lok Sabha and completed sessions…');

    // Lok Sabha number: 18 = 2024 election. Changes only after general election.
    // We detect it by probing — highest LS number that has attendance data.
    let loksabha = 18;
    let completedSessions = [];

    // Probe: find which sessions have real data (days > 0 for at least some MPs)
    console.log('    Probing sessions for real data…');
    for (let s = 1; s <= 20; s++) {
      const probe = await fetchJSON(page,
        `https://sansad.in/api_ls/member/getMemberAttendanceMemberWise?loksabha=${loksabha}&session=${s}&locale=en`
      );
      if (!Array.isArray(probe) || probe.length === 0) {
        console.log(`    Session ${s}: no data — stopping`);
        break;
      }
      const hasDays = probe.some(r => parseInt(r.signedDaysCount ?? 0) > 0);
      if (hasDays) {
        completedSessions.push(s);
        console.log(`    Session ${s}: ✓ has real data`);
      } else {
        console.log(`    Session ${s}: exists but all zeros (ongoing) — skipping`);
      }
      await sleep(400);
    }

    if (completedSessions.length === 0) {
      console.error('No completed sessions found. Check if sansad.in is accessible.');
      await browser.close();
      return;
    }

    // Build term string
    const termString = `18th Lok Sabha (2024–2029)`; // updates only after 2029 election
    console.log(`    Lok Sabha: ${loksabha}`);
    console.log(`    Completed sessions with data: ${completedSessions.join(', ')}`);
    console.log(`    Term: ${termString}`);

    // ── 3. Attendance — all completed sessions ────────────────────────────────
    console.log(`\n[3] Fetching attendance (${completedSessions.length} completed sessions)…`);
    const sessionTotals = {};
    for (const s of completedSessions) {
      const res = await fetchJSON(page, `https://sansad.in/api_ls/member/getMemberAttendanceMemberWise?loksabha=${loksabha}&session=${s}&locale=en`);
      if (Array.isArray(res) && res.length > 0) {
        console.log(`    Session ${s}: ${res.length} records`);
        for (const r of res) {
          const name = r.memberName ?? '';
          const days = parseInt(r.signedDaysCount) || 0;
          if (!sessionTotals[name]) sessionTotals[name] = { name, constituency: r.constituency, state: r.state, total_days: 0 };
          sessionTotals[name].total_days += days;
        }
      } else {
        console.log(`    Session ${s}: no data`);
      }
      await sleep(400);
    }
    const attendanceRows = Object.values(sessionTotals);
    console.log(`    Total: ${attendanceRows.length} unique MPs with attendance data`);

    // ── 4. Debates — all completed sessions ────────────────────────────────────
    console.log(`\n[4] Fetching debate participation (${completedSessions.length} sessions)…`);
    const debateTotals = {};
    for (const s of completedSessions) {
      const res = await fetchJSON(page, `https://sansad.in/api_ls/business/mp-debate-statistics?filterBy=member-wise&loksabha=${loksabha}&session=${s}&locale=en`);
      if (Array.isArray(res) && res.length > 0) {
        console.log(`    Session ${s}: ${res.length} members`);
        for (const r of res) {
          const name = r.name ?? '';
          const parts = (r.duration ?? '0:0:0').split(':').map(Number);
          const mins = (parts[0]||0)*60 + (parts[1]||0) + Math.round((parts[2]||0)/60);
          debateTotals[name] = (debateTotals[name] ?? 0) + mins;
        }
      } else {
        console.log(`    Session ${s}: no data`);
      }
      await sleep(400);
    }
    console.log(`    Debate data for ${Object.keys(debateTotals).length} MPs`);

    // ── 5. Member codes for questions API ──────────────────────────────────────
    console.log('\n[5] Fetching member codes…');
    const memberCodes = {}; // sansad name → memberCode
    const membersRes = await fetchJSON(page, 'https://sansad.in/api_ls/member?loksabha=18&sitting=1&page=1&size=600&locale=en');

    // Log raw structure to debug
    if (membersRes) {
      const keys = Object.keys(membersRes);
      console.log(`    Response keys: ${JSON.stringify(keys.slice(0,5))}`);
      const arr = Array.isArray(membersRes) ? membersRes
                : membersRes.membersDtoList ?? membersRes.content ?? membersRes.data ?? membersRes.members ?? membersRes.list ?? [];
      if (Array.isArray(arr) && arr.length > 0) {
        console.log(`    First item keys: ${JSON.stringify(Object.keys(arr[0]))}`);
        for (const m of arr) {
          // Correct field names from API: mpFirstLastName for name, mpsno for code
          const name = m.mpFirstLastName ?? m.memberName ?? `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim();
          const code = m.mpsno ?? m.memberCode ?? m.memberId;
          if (name && code) memberCodes[name] = code;
        }
      }
    }
    console.log(`    Got ${Object.keys(memberCodes).length} member codes`);

    // ── 6. Questions — per member ──────────────────────────────────────────────
    const questionTotals = {};
    const mpCodeMap = {}; // db mp.name → sansad code — declared here for use in step 7

    if (Object.keys(memberCodes).length > 0) {
      console.log('\n[6] Fetching question counts…');

      // Match DB MPs to sansad member codes
      for (const mp of mps ?? []) {
        const entry = Object.entries(memberCodes).find(([k]) => isMatch(k, mp.name));
        if (entry) mpCodeMap[mp.name] = entry[1];
      }
      console.log(`    Matched ${Object.keys(mpCodeMap).length} MPs to codes`);

      let qCount = 0;
      let mpTotal = Object.keys(mpCodeMap).length;
      let mpDone = 0;
      for (const [mpName, code] of Object.entries(mpCodeMap)) {
        let total = 0;
        for (const s of completedSessions) {
          const res = await fetchJSON(page, `https://sansad.in/api_ls/question/qetFilteredQuestionsAns?loksabhaNo=${loksabha}&sessionNumber=${s}&pageNo=1&locale=en&pageSize=1&memberCode=${code}`);
          const item = Array.isArray(res) ? res[0] : res;
          total += parseInt(item?.totalRecordSize ?? 0) || 0;
          await sleep(80);
        }
        mpDone++;
        if (total > 0) {
          questionTotals[mpName] = total;
          qCount++;
        }
        process.stdout.write(`\r    Progress: ${mpDone}/${mpTotal} MPs done, ${qCount} with questions`);
      }
      console.log(`\n    Done: ${qCount} MPs with questions`);
    } else {
      console.log('\n[6] Skipping questions (no member codes)');
    }

    // ── 7. Save to DB ──────────────────────────────────────────────────────────
    console.log('\n[7] Saving to DB…');
    let saved = 0;
    for (const mp of mps ?? []) {
      const attRow = attendanceRows.find(r => isMatch(r.name, mp.name) || constMatch(r.constituency, mp.constituency_name));
      if (!attRow) continue;

      const debateEntry = Object.entries(debateTotals).find(([k]) => isMatch(k, mp.name));
      const questions = questionTotals[mp.name] ?? null;

      // Save sansad code to politicians table (only if column exists)
      const mpCode = mpCodeMap[mp.name];
      if (mpCode) {
        await supabase.from('politicians')
          .update({ sansad_code: mpCode })
          .eq('id', mp.id)
          .then(() => {}) // ignore errors — column may not exist yet
          .catch(() => {});
      }

      const { error: upsertErr } = await supabase.from('parliament_performance').upsert({
        politician_id:   mp.id,
        politician_name: mp.name,
        level:           'MP',
        state:           mp.state,
        house:           'Lok Sabha',
        term:            termString,
        attendance_pct:  null,
        questions_asked: questions,
        debates_count:   debateEntry?.[1] ?? null,
        days_signed:     attRow.total_days,
        source_url:      'https://sansad.in/ls/members/attendance',
        last_scraped:    new Date().toISOString(),
      }, { onConflict: 'politician_id,term' });

      if (upsertErr) {
        console.error(`  ✗ ${mp.name} — DB error: ${upsertErr.message}`);
        continue;
      }

      const parts = [
        `${attRow.total_days} days`,
        debateEntry ? `${debateEntry[1]} mins debated` : null,
        questions ? `${questions} questions` : null,
      ].filter(Boolean).join(', ');
      console.log(`  ✓ ${mp.name} — ${parts}`);
      saved++;
    }

    console.log(`\n✓ Saved ${saved} MPs. Unmatched: ${(mps?.length ?? 0) - saved}`);
    console.log('Note: Ministers (Modi, Amit Shah etc.) show 0 days — they are exempt from signing.');

  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
