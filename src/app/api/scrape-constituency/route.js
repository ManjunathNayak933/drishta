export const runtime = 'edge';
import { NextResponse } from 'next/server';

export async function POST(req) {
  return NextResponse.json({ error: 'Scraping is only available locally. Run scrapers via CLI.' }, { status: 400 });
}
