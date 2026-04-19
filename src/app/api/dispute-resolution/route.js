export const runtime = 'edge';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  );

  try {
    const body = await request.json();
    const { issue_id, reporter_email, reason, proof_url } = body;

    if (!issue_id || !reporter_email || !reason) {
      return NextResponse.json({ error: 'issue_id, reporter_email and reason are required' }, { status: 400 });
    }

    // Check issue exists and is resolved
    const { data: issue } = await supabase
      .from('issues')
      .select('id, status, title')
      .eq('id', issue_id)
      .maybeSingle();

    if (!issue) return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    if (issue.status !== 'Resolved') {
      return NextResponse.json({ error: 'Can only dispute resolved issues' }, { status: 400 });
    }

    // Use service role for insert to bypass RLS
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );

    const { error } = await adminClient.from('issue_reports').insert({
      issue_id,
      reporter_email: reporter_email.toLowerCase().trim(),
      reason,
      proof_url: proof_url ?? null,
      type: 'dispute_resolution',
      review_status: 'pending',
    });

    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'You have already reported this issue' }, { status: 400 });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
