export const runtime = 'edge';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  try {
    // Verify politician is authenticated
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Check user is a politician
    const metadata = user.user_metadata ?? {};
    if (metadata.role !== 'politician') {
      return NextResponse.json({ error: 'Only politicians can resolve issues' }, { status: 403 });
    }

    const body = await request.json();
    const { issue_id, resolution_note, resolution_photo_url } = body;

    if (!issue_id) return NextResponse.json({ error: 'issue_id required' }, { status: 400 });
    if (!resolution_photo_url) return NextResponse.json({ error: 'Photo proof is mandatory' }, { status: 400 });

    const politician_id = metadata.politician_id;
    const politician_name = metadata.name;
    const level = metadata.level;

    if (!politician_id) return NextResponse.json({ error: 'Politician profile not linked' }, { status: 400 });

    // Verify this issue is in their constituency
    const { data: issue } = await supabase
      .from('issues')
      .select('id, status, mla_id, mp_id, constituency_name, state')
      .eq('id', issue_id)
      .maybeSingle();

    if (!issue) return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    if (issue.status === 'Resolved') return NextResponse.json({ error: 'Issue already resolved' }, { status: 400 });

    // Check politician is linked to this issue
    const isLinked = issue.mla_id === politician_id || issue.mp_id === politician_id;
    if (!isLinked) return NextResponse.json({ error: 'This issue is not in your constituency' }, { status: 403 });

    // Mark resolved
    const { error } = await supabase.from('issues').update({
      status: 'Resolved',
      resolved_by_politician_id: politician_id,
      resolved_by_politician_name: politician_name,
      resolution_note: resolution_note ?? null,
      resolution_photo_url,
      action_tag: level === 'MP' ? 'MP Action' : 'MLA Action',
      resolved_at: new Date().toISOString(),
    }).eq('id', issue_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });

  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
