import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const maxDuration = 300; // 5 minutes for Vercel/Next.js

export async function POST(req) {
  const { constituencyName, state } = await req.json();
  if (!constituencyName) return NextResponse.json({ error: 'constituencyName required' }, { status: 400 });

  try {
    const slug = constituencyName.toLowerCase().replace(/\s+/g, '-');
    const stateArg = state ? ` state:${state.toLowerCase().replace(/\s+/g, '-')}` : '';
    const cmd = `node scrapers/scrape-puppeteer.js constituency:${slug}${stateArg}`;
    const cwd = process.cwd();

    const { stdout, stderr } = await execAsync(cmd, {
      cwd,
      timeout: 180000, // 3 minutes
      env: {
        ...process.env, // pass all env vars including Supabase keys
        NODE_ENV: 'development',
      },
    });
    return NextResponse.json({ ok: true, output: (stdout + stderr).slice(-3000) }); // last 3000 chars
  } catch (err) {
    return NextResponse.json({ ok: true, output: ((err.stdout ?? '') + (err.stderr ?? '') + err.message).slice(-3000) });
  }
}
