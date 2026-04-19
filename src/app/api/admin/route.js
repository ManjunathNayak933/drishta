export const runtime = 'edge';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase admin credentials');
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    const supabase = getAdminClient();

    switch (action) {

      case 'approveChannel': {
        const { applicationId } = params;
        const { data: app, error: fetchErr } = await supabase
          .from('channel_applications')
          .select('*')
          .eq('id', applicationId)
          .single();
        if (fetchErr || !app) return NextResponse.json({ error: 'Application not found' }, { status: 404 });

        const slug = app.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-');

        // 1. Create the channel record
        const { data: channel, error: insertErr } = await supabase
          .from('channels')
          .insert([{
            name: app.name,
            slug,
            tagline: app.tagline,
            logo_url: app.logo_url,
            accent_color: app.accent_color ?? '#b8860b',
            owner_email: app.applicant_email,
            approved: true,
          }])
          .select()
          .single();
        if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

        // 2. Create the Supabase Auth user so they can sign in
        // inviteUserByEmail sends them a login link AND creates the auth user
        const { error: authErr } = await supabase.auth.admin.inviteUserByEmail(
          app.applicant_email,
          {
            data: { channel_name: app.name, channel_slug: slug },
            redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/auth/callback`,
          }
        );
        // If user already exists, that's fine — don't fail the approval
        if (authErr && !authErr.message?.includes('already been registered')) {
          console.warn('Auth user creation warning:', authErr.message);
        }

        // 3. Mark application as approved
        await supabase
          .from('channel_applications')
          .update({ status: 'approved', reviewed_at: new Date().toISOString() })
          .eq('id', applicationId);

        return NextResponse.json({ channel, emailSent: !authErr });
      }

      case 'rejectChannel': {
        const { applicationId, notes } = params;
        const { error } = await supabase
          .from('channel_applications')
          .update({ status: 'rejected', admin_notes: notes, reviewed_at: new Date().toISOString() })
          .eq('id', applicationId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true });
      }

      case 'approvePromise': {
        const { pendingId, politicianId } = params;
        const { data: pending, error: fetchErr } = await supabase
          .from('pending_promises')
          .select('*')
          .eq('id', pendingId)
          .single();
        if (fetchErr || !pending) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const { data: promise, error: insertErr } = await supabase
          .from('promises')
          .insert([{
            politician_id: politicianId ?? null,
            politician_name: pending.politician_name,
            politician_level: pending.politician_level,
            state: pending.state,
            constituency_name: pending.constituency_name,
            party: pending.party,
            promise_text: pending.promise_text,
            promise_category: pending.promise_category,
            date_made: pending.date_made,
            source: pending.source,
            source_url: pending.source_url,
            source_description: pending.source_description,
            added_by_email: pending.added_by_email,
            verified: true,
          }])
          .select()
          .single();
        if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

        await supabase
          .from('pending_promises')
          .update({ status: 'approved', reviewed_at: new Date().toISOString() })
          .eq('id', pendingId);

        return NextResponse.json({ promise });
      }

      case 'rejectPromise': {
        const { pendingId, notes } = params;
        const { error } = await supabase
          .from('pending_promises')
          .update({ status: 'rejected', admin_notes: notes, reviewed_at: new Date().toISOString() })
          .eq('id', pendingId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true });
      }

      case 'updatePromiseStatus': {
        const { promiseId, status, evidenceText, evidenceUrl } = params;
        const { data, error } = await supabase
          .from('promises')
          .update({ status, evidence_text: evidenceText, evidence_url: evidenceUrl, verified: true })
          .eq('id', promiseId)
          .select()
          .single();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ promise: data });
      }

      case 'restoreContent': {
        const { table, id } = params;
        const allowed = ['promises', 'issues', 'news_articles'];
        if (!allowed.includes(table)) return NextResponse.json({ error: 'Invalid table' }, { status: 400 });
        const { error } = await supabase
          .from(table)
          .update({ is_hidden: false, report_count: 0 })
          .eq('id', id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true });
      }

      case 'deleteContent': {
        const { table, id } = params;
        const allowed = ['promises', 'issues', 'news_articles'];
        if (!allowed.includes(table)) return NextResponse.json({ error: 'Invalid table' }, { status: 400 });
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true });
      }

      case 'saveBudget': {
        const { state, year, total_outlay, presented_by, presented_on, key_highlights,
                sector_allocations, key_schemes, tax_changes, fiscal_deficit,
                revenue_deficit, summary, pdf_url } = params;
        if (!state || !year) return NextResponse.json({ error: 'state and year required' }, { status: 400 });
        const { error } = await supabase.from('state_budgets').upsert({
          state, year, total_outlay, presented_by,
          presented_on: presented_on || null,
          key_highlights: key_highlights ?? [],
          sector_allocations: sector_allocations ?? [],
          key_schemes: key_schemes ?? [],
          tax_changes: tax_changes ?? [],
          fiscal_deficit: fiscal_deficit ?? null,
          revenue_deficit: revenue_deficit ?? null,
          summary: summary ?? null,
          pdf_url: pdf_url ?? null,
        }, { onConflict: 'state,year' });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true });
      }

      case 'bulkUploadHistory': {
        const { rows } = params;
        if (!rows?.length) return NextResponse.json({ error: 'No rows provided' }, { status: 400 });

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

        // Build lookup: "NAME||STATE||TYPE" → id
        const constLookup = new Map();
        for (const c of allConsts) {
          constLookup.set(`${c.name.toUpperCase()}||${c.state.toUpperCase()}||${c.type}`, c.id);
        }

        let inserted = 0, skipped = 0, notFound = [];
        const records = [];

        for (const row of rows) {
          // type defaults to VS unless explicitly set to LS
          const type = (row.type ?? 'VS').toUpperCase() === 'LS' ? 'LS' : 'VS';
          const key = `${row.constituency_name.toUpperCase()}||${row.state.toUpperCase()}||${type}`;
          const constituencyId = constLookup.get(key);
          if (!constituencyId) {
            notFound.push(`${row.constituency_name} (${type})`);
            skipped++;
            continue;
          }
          records.push({
            constituency_id: constituencyId,
            term_year: row.term_year,
            name: row.name,
            party: row.party ?? null,
          });
        }

        if (records.length > 0) {
          const { error } = await supabase.from('mla_history')
            .upsert(records, { onConflict: 'constituency_id,term_year', ignoreDuplicates: true });
          if (error) return NextResponse.json({ error: error.message }, { status: 500 });
          inserted = records.length;
        }

        return NextResponse.json({ ok: true, inserted, skipped, notFound: notFound.slice(0, 10) });
      }

      case 'resolveDataReport': {
        const { id, notes } = params;
        const { error } = await supabase
          .from('data_reports')
          .update({ status: 'fixed', admin_notes: notes, resolved_at: new Date().toISOString() })
          .eq('id', id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true });
      }

      case 'dismissDataReport': {
        const { id } = params;
        const { error } = await supabase
          .from('data_reports')
          .update({ status: 'dismissed', resolved_at: new Date().toISOString() })
          .eq('id', id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true });
      }

      case 'fixMissingVS': {
        // Create VS constituency + vs_ls_map entry
        const { vsName, lsId, state } = params;
        const slug = vsName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const { data: vs, error: vsErr } = await supabase
          .from('constituencies')
          .insert([{ name: vsName, slug, state, type: 'VS' }])
          .select().single();
        if (vsErr) return NextResponse.json({ error: vsErr.message }, { status: 500 });
        await supabase.from('vs_ls_map').insert([{
          vs_constituency_id: vs.id,
          ls_constituency_id: lsId,
          vs_name: vsName,
          ls_name: '', state,
        }]);
        return NextResponse.json({ ok: true, vs });
      }

      case 'fixMissingLS': {
        // Create LS constituency
        const { lsName, state } = params;
        const slug = lsName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const { data: ls, error: lsErr } = await supabase
          .from('constituencies')
          .insert([{ name: lsName, slug, state, type: 'LS' }])
          .select().single();
        if (lsErr) return NextResponse.json({ error: lsErr.message }, { status: 500 });
        return NextResponse.json({ ok: true, ls });
      }

      case 'fixMpConnection': {
        // Link a VS constituency to an LS constituency
        const { vsId, lsId, vsName, lsName, state } = params;
        const { error } = await supabase
          .from('vs_ls_map')
          .upsert([{ vs_constituency_id: vsId, ls_constituency_id: lsId, vs_name: vsName, ls_name: lsName, state }],
            { onConflict: 'vs_constituency_id' });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true });
      }

      case 'addPolitician': {
        const { name, level, party, state, constituencyId, constituencyName, electionYear, photoUrl } = params;
        if (!name || !level || !state || !constituencyId) {
          return NextResponse.json({ error: 'name, level, state, constituencyId required' }, { status: 400 });
        }

        // Normalize name the same way scrapers do
        const normName = name
          .replace(/^\s*(Shri|Smt|Dr|Prof|Adv|Mr|Mrs|Ms)\s+/gi, '')
          .replace(/([A-Za-z])\.([A-Za-z])/g, '$1 $2')
          .replace(/\s+/g, ' ').trim()
          .split(' ').filter(Boolean)
          .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ');

        const baseSlug = normName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
        const slug = baseSlug;

        // Archive existing politician for this constituency to mla_history, then delete
        const { data: existing } = await supabase
          .from('politicians')
          .select('id, name, party, constituency_id, election_year, level')
          .eq('constituency_id', constituencyId)
          .eq('level', level)
          .maybeSingle();

        if (existing?.id) {
          // Archive to history
          if (existing.constituency_id && existing.election_year) {
            await supabase.from('mla_history').upsert({
              constituency_id: existing.constituency_id,
              term_year: existing.election_year,
              name: existing.name,
              party: existing.party ?? null,
              level: existing.level,
            }, { onConflict: 'constituency_id,term_year' });
          }
          await supabase.from('politicians').delete().eq('id', existing.id);
        }

        // Insert corrected politician
        const { data, error } = await supabase
          .from('politicians')
          .upsert([{
            name: normName,
            slug,
            level,
            party: party || null,
            state,
            constituency_id: constituencyId,
            constituency_name: constituencyName || null,
            election_year: electionYear || new Date().getFullYear(),
            photo_url: photoUrl || null,
          }], { onConflict: 'slug,state' })
          .select().single();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true, data, replaced: !!existing });
      }

      case 'resolveIssue': {
        const { issueId, politicianId, politicianName, level, resolutionNote, resolutionPhotoUrl } = params;
        if (!issueId || !politicianId) return NextResponse.json({ error: 'issueId and politicianId required' }, { status: 400 });
        const { error } = await supabase.from('issues').update({
          status: 'Resolved',
          resolved_by_politician_id: politicianId,
          resolved_by_politician_name: politicianName,
          resolution_note: resolutionNote ?? null,
          resolution_photo_url: resolutionPhotoUrl ?? null,
          action_tag: level === 'MP' ? 'MP Action' : 'MLA Action',
          resolved_at: new Date().toISOString(),
        }).eq('id', issueId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true });
      }

      case 'approveDisputeReport': {
        const { reportId } = params;
        // Get the report to find issue
        const { data: report } = await supabase.from('issue_reports')
          .select('issue_id').eq('id', reportId).maybeSingle();
        if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });
        // Mark issue as Disputed and clear resolution
        await supabase.from('issues').update({
          status: 'Disputed',
          action_tag: null,
          resolved_by_politician_id: null,
          resolved_by_politician_name: null,
          resolution_photo_url: null,
          resolved_at: null,
        }).eq('id', report.issue_id);
        // Mark report approved
        await supabase.from('issue_reports').update({
          review_status: 'approved', reviewed_at: new Date().toISOString()
        }).eq('id', reportId);
        return NextResponse.json({ ok: true });
      }

      case 'rejectDisputeReport': {
        const { reportId } = params;
        await supabase.from('issue_reports').update({
          review_status: 'rejected', reviewed_at: new Date().toISOString()
        }).eq('id', reportId);
        return NextResponse.json({ ok: true });
      }

      case 'createRevenueMonth': {
        const { month, total_adsense, creator_share } = params;
        const adsense = parseFloat(total_adsense);
        const share = parseFloat(creator_share ?? 40);
        const creatorPool = +(adsense * share / 100).toFixed(2);

        // Create the month record
        const { data: monthRow, error: mErr } = await supabase
          .from('revenue_months')
          .upsert({ month: month + '-01', total_adsense: adsense, creator_share: share }, { onConflict: 'month' })
          .select().single();
        if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

        // Get all views for this month grouped by channel
        const startDate = month + '-01';
        const endDate = new Date(new Date(startDate).setMonth(new Date(startDate).getMonth() + 1))
          .toISOString().split('T')[0];

        const { data: viewData } = await supabase
          .from('article_views')
          .select('channel_id, view_count')
          .gte('viewed_at', startDate)
          .lt('viewed_at', endDate);

        // Aggregate by channel
        const channelViews = {};
        for (const v of viewData ?? []) {
          channelViews[v.channel_id] = (channelViews[v.channel_id] ?? 0) + (v.view_count ?? 1);
        }
        const totalViews = Object.values(channelViews).reduce((s, v) => s + v, 0);

        if (totalViews === 0) {
          return NextResponse.json({ month: monthRow, message: 'No views found for this month' });
        }

        // Get channel details
        const channelIds = Object.keys(channelViews);
        const { data: channels } = await supabase
          .from('channels')
          .select('id, name, slug, is_gst_registered, gstin, pan')
          .in('id', channelIds);

        const { data: apps } = await supabase
          .from('channel_applications')
          .select('channel_id:channels(id), applicant_email')
          .in('channel_id', channelIds);

        const emailMap = {};
        for (const a of apps ?? []) {
          if (a.channel_id?.id) emailMap[a.channel_id.id] = a.applicant_email;
        }

        // Calculate payouts per channel
        const payoutRecords = channelIds.map(channelId => {
          const ch = channels?.find(c => c.id === channelId);
          const views = channelViews[channelId];
          const viewSharePct = totalViews > 0 ? +(views / totalViews * 100).toFixed(4) : 0;
          const grossAmount = +(creatorPool * viewSharePct / 100).toFixed(2);
          const isGst = ch?.is_gst_registered ?? false;
          const tdsAmount = +(grossAmount * 0.10).toFixed(2);
          const gstAmount = isGst ? +(grossAmount * 0.18).toFixed(2) : 0;
          const netPayable = +(grossAmount + gstAmount - tdsAmount).toFixed(2);

          return {
            month_id: monthRow.id,
            channel_id: channelId,
            channel_name: ch?.name ?? 'Unknown',
            owner_email: emailMap[channelId] ?? null,
            total_views: views,
            view_share_pct: viewSharePct,
            gross_amount: grossAmount,
            gst_amount: gstAmount,
            tds_amount: tdsAmount,
            net_payable: netPayable,
            is_gst_registered: isGst,
            gstin: ch?.gstin ?? null,
            pan: ch?.pan ?? null,
          };
        });

        // Delete old payouts for this month and insert new
        await supabase.from('channel_payouts').delete().eq('month_id', monthRow.id);
        const { error: pErr } = await supabase.from('channel_payouts').insert(payoutRecords);
        if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

        return NextResponse.json({ ok: true, month: monthRow });
      }

      case 'getMonthPayouts': {
        const { data } = await supabase
          .from('channel_payouts')
          .select('*')
          .eq('month_id', params.monthId ?? searchParams.get('monthId'))
          .order('total_views', { ascending: false });
        return NextResponse.json({ payouts: data ?? [] });
      }

      case 'markPayoutPaid': {
        const { payoutId, utr } = params;
        await supabase.from('channel_payouts').update({
          payment_status: 'paid',
          paid_at: new Date().toISOString(),
          utr_number: utr,
        }).eq('id', payoutId);
        return NextResponse.json({ ok: true });
      }

      case 'holdChannel': {
        const { channelId } = params;
        const { error } = await supabase.from('channels')
          .update({ status: 'held' })
          .eq('id', channelId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true });
      }

      case 'unholdChannel': {
        const { channelId } = params;
        const { error } = await supabase.from('channels')
          .update({ status: 'active' })
          .eq('id', channelId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true });
      }

      case 'deleteChannel': {
        const { channelId } = params;
        // Mark as deleted (soft delete — keeps data for audit)
        await supabase.from('channels').update({ status: 'deleted', approved: false }).eq('id', channelId);
        // Unpublish all their articles
        await supabase.from('news_articles').update({ status: 'unpublished' }).eq('channel_id', channelId);
        return NextResponse.json({ ok: true });
      }

      case 'approvePoliticianProfile': {
        const { profileId } = params;
        // Get profile details
        const { data: profile } = await supabase.from('politician_profiles')
          .select('*').eq('id', profileId).maybeSingle();
        if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

        // Create Supabase auth user
        const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
          email: profile.email,
          password: Math.random().toString(36).slice(-10) + 'A1!', // temp password
          email_confirm: true,
          user_metadata: {
            role: 'politician',
            level: profile.level,
            name: profile.full_name,
            state: profile.state,
            constituency: profile.constituency,
            politician_id: profile.politician_id,
          },
        });
        if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 });

        // Mark profile approved
        await supabase.from('politician_profiles').update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
        }).eq('id', profileId);

        return NextResponse.json({ ok: true, userId: authUser.user.id });
      }

      case 'rejectPoliticianProfile': {
        const { profileId, reason } = params;
        await supabase.from('politician_profiles').update({
          status: 'rejected',
          admin_note: reason ?? null,
          reviewed_at: new Date().toISOString(),
        }).eq('id', profileId);
        return NextResponse.json({ ok: true });
      }

      case 'savePerformance': {
        const { politician_id, politician_name, level, state, house, term,
                attendance_pct, questions_asked, debates_count, bills_introduced,
                private_bills, source_url } = params;
        if (!politician_id) return NextResponse.json({ error: 'politician_id required' }, { status: 400 });
        const { error } = await supabase.from('parliament_performance').upsert({
          politician_id, politician_name, level, state, house, term,
          attendance_pct: attendance_pct ?? null,
          questions_asked: questions_asked ?? null,
          debates_count: debates_count ?? null,
          bills_introduced: bills_introduced ?? null,
          private_bills: private_bills ?? null,
          source_url: source_url ?? null,
          last_scraped: new Date().toISOString(),
        }, { onConflict: 'politician_id,term' });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true });
      }

      case 'saveMinisters': {
        const { state, ministers } = params;
        if (!state || !ministers?.length) return NextResponse.json({ error: 'state and ministers required' }, { status: 400 });

        // Replace all ministers for this state
        await supabase.from('state_ministers').delete().eq('state', state);

        // Name normalization function (same as scraper)
        const normalizeName = n => {
          if (!n) return '';
          return n
            .replace(/^\s*(Shri|Smt|Dr|Prof|Adv|Mr|Mrs|Ms|Late|Er)\s+/gi, '')
            .replace(/([A-Za-z])\.([A-Za-z])/g, '$1 $2')
            .replace(/([A-Za-z])\.\s*/g, '$1 ')
            .replace(/\s+/g, ' ').trim()
            .split(' ').filter(Boolean)
            .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(' ');
        };

        // Build records with rank, minister_type and normalized names
        const records = ministers.map((m) => {
          let rank = 99;
          if (m.is_cm) rank = 1;
          else if (m.is_deputy_cm) rank = 2;
          else if (m.minister_type === 'Cabinet Minister') rank = 3;
          else if (m.minister_type === 'Minister of State (Independent Charge)') rank = 4;
          else if (m.minister_type === 'Minister of State') rank = 5;

          return {
            state,
            name: normalizeName(m.name),  // normalize on save
            portfolio: m.portfolio || null,
            party: m.party || null,
            constituency: m.constituency || null,
            is_cm: m.is_cm ?? false,
            is_deputy_cm: m.is_deputy_cm ?? false,
            minister_type: m.is_cm ? (state === 'India' ? 'Prime Minister' : 'Chief Minister') : (m.minister_type ?? 'Cabinet Minister'),
            rank,
            updated_at: new Date().toISOString(),
          };
        });

        const { data: inserted, error } = await supabase.from('state_ministers').insert(records).select('id, name, state, party, constituency, is_cm, minister_type');
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        // Load all politicians for matching
        const { data: allPols } = await supabase
          .from('politicians')
          .select('id, name, slug, state, level, constituency_name');

        const norm = n => (n ?? '').toLowerCase().replace(/\./g, ' ').replace(/\s+/g, ' ').trim();

        const polMap = new Map();
        for (const p of allPols ?? []) polMap.set(norm(p.name), p);

        for (const row of inserted ?? []) {
          const key = norm(row.name);
          let match = polMap.get(key);

          // First+last name fallback
          if (!match) {
            const parts = key.split(' ').filter(Boolean);
            if (parts.length >= 2) {
              const first = parts[0];
              const last = parts[parts.length - 1];
              match = [...polMap.values()].find(p => {
                const pp = norm(p.name).split(' ').filter(Boolean);
                return pp[0] === first && pp[pp.length - 1] === last &&
                  (state === 'India' ? p.level === 'MP' : p.state === state);
              });
            }
          }

          if (match?.id) {
            await supabase.from('state_ministers')
              .update({ politician_id: match.id })
              .eq('id', row.id);
          } else {
            // No match found — auto-create a politician profile for them
            // State ministers = MLA (or MLC), Central ministers = MP (Lok Sabha or Rajya Sabha)
            const level = state === 'India' ? 'MP' : 'MLA';
            const polState = state === 'India' ? (row.constituency ? 'Unknown' : 'India') : state;
            const slug = norm(row.name).replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

            // Check if slug already exists
            const { data: existing } = await supabase
              .from('politicians')
              .select('id')
              .eq('slug', slug)
              .eq('state', polState)
              .maybeSingle();

            if (!existing) {
              const { data: newPol } = await supabase.from('politicians').insert({
                name: row.name,
                slug,
                level,
                state: polState,
                party: row.party || null,
                constituency_name: row.constituency || null,
                election_year: new Date().getFullYear(),
              }).select('id').single();

              if (newPol?.id) {
                await supabase.from('state_ministers')
                  .update({ politician_id: newPol.id })
                  .eq('id', row.id);
              }
            } else {
              await supabase.from('state_ministers')
                .update({ politician_id: existing.id })
                .eq('id', row.id);
            }
          }
        }

        return NextResponse.json({ ok: true, count: records.length });
      }

      case 'runSql': {
        const { sql } = params;
        if (!sql?.trim()) return NextResponse.json({ error: 'No SQL provided' }, { status: 400 });
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
        if (error) {
          // Try direct query as fallback
          const result = await supabase.from('_sql').select(sql).catch(() => null);
          if (result?.error) return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ data, ok: true });
      }
    }

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'getRevenueMonths') {
    const { data } = await supabase
      .from('revenue_months')
      .select('*')
      .order('month', { ascending: false });
    return NextResponse.json({ months: data ?? [] });
  }

  if (action === 'getDisputeReports') {
    const { data, error } = await supabase
      .from('issue_reports')
      .select('*, issues(title, status, constituency_name, state, resolution_photo_url, resolved_by_politician_name)')
      .eq('type', 'dispute_resolution')
      .eq('review_status', 'pending')
      .order('created_at', { ascending: false });
    if (error) return NextResponse.json({ reports: [] });
    return NextResponse.json({ reports: data ?? [] });
  }

  if (action === 'getPoliticianProfiles') {
    const status = searchParams.get('status') ?? 'pending';
    const { data, error } = await supabase
      .from('politician_profiles')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });
    if (error) return NextResponse.json({ profiles: [] });
    return NextResponse.json({ profiles: data ?? [] });
  }

  if (action === 'getStateMinisters') {
    const state = searchParams.get('state');
    if (!state) return NextResponse.json({ ministers: [] });
    const { data, error } = await supabase
      .from('state_ministers')
      .select('*')
      .eq('state', state)
      .order('is_cm', { ascending: false })
      .order('is_deputy_cm', { ascending: false })
      .order('name');
    if (error) return NextResponse.json({ ministers: [] });
    return NextResponse.json({ ministers: data ?? [] });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
