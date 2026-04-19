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
    const body = await request.json();

    // Validate required fields
    if (!body.title || !body.description || !body.state || !body.category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!body.submitter_email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    if (!body.photo_url) {
      return NextResponse.json({ error: 'Photo is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('issues')
      .insert([{
        title: body.title,
        description: body.description,
        category: body.category,
        state: body.state,
        constituency_id: body.constituency_id ?? null,
        constituency_name: body.constituency_name ?? null,
        mla_id: body.mla_id ?? null,
        mla_name: body.mla_name ?? null,
        mp_id: body.mp_id ?? null,
        mp_name: body.mp_name ?? null,
        photo_url: body.photo_url,
        submitter_name: body.submitter_name ?? null,
        submitter_email: body.submitter_email,
        location_text: body.location_text ?? null,
        ward: body.ward ?? null,
        tagged_minister_ids: body.tagged_minister_ids?.length ? body.tagged_minister_ids : null,
        minister_names: body.minister_names?.length ? body.minister_names : null,
      }])
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
