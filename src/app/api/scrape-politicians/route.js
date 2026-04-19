export const runtime = 'edge';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') ?? '';
  if (q.length < 2) return NextResponse.json({ politicians: [] });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const { data } = await supabase
    .from('politicians')
    .select('id, name, level, state, constituency_name, party')
    .ilike('name', `%${q}%`)
    .limit(10);

  return NextResponse.json({ politicians: data ?? [] });
}
