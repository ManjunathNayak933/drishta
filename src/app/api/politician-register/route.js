export const runtime = 'edge';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

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

export async function POST(request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  try {
    const formData = await request.formData();

    const full_name    = normalizeName(formData.get('full_name') ?? '');
    const constituency = normalizeConstituency(formData.get('constituency') ?? '');
    const phone        = (formData.get('phone') ?? '').trim();
    const email        = (formData.get('email') ?? '').trim().toLowerCase();
    const level        = formData.get('level') ?? 'MLA';
    const state        = formData.get('state') ?? '';

    if (!full_name || !phone || !email || !state || !constituency) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if email already registered
    const { data: existing } = await supabase
      .from('politician_profiles')
      .select('id, status')
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'approved') {
        return NextResponse.json({ error: 'This email is already registered and approved.' }, { status: 400 });
      }
      if (existing.status === 'pending') {
        return NextResponse.json({ error: 'A request with this email is already pending review.' }, { status: 400 });
      }
    }

    // Try to match existing politician in DB
    const { data: matchedPolitician } = await supabase
      .from('politicians')
      .select('id')
      .ilike('name', full_name)
      .ilike('constituency_name', constituency)
      .eq('state', state)
      .eq('level', level)
      .maybeSingle();

    // Save registration request
    const { error } = await supabase.from('politician_profiles').insert({
      full_name,
      phone,
      email,
      level,
      state,
      constituency,
      politician_id: matchedPolitician?.id ?? null,
      status: 'pending',
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
