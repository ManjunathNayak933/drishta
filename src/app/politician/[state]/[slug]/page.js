import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPoliticianBySlug, getPromisesByPolitician, getArticlesByPolitician } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';
import PromiseTable from '@/components/promises/PromiseTable';
import PromiseScore from '@/components/promises/PromiseScore';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { format } from 'date-fns';

export async function generateMetadata({ params }) {
  const { state, slug } = await params;
  try {
    const politician = await getPoliticianBySlug(
      decodeURIComponent(state).replace(/-/g, ' '),
      slug
    );
    return {
      title: `${politician.name} — Promises & Record | Drishta`,
      description: `Track ${politician.name}'s electoral promises, delivery record, and constituency issues. ${politician.party} | ${politician.level} | ${politician.constituency_name}.`,
      openGraph: {
        images: politician.photo_url ? [politician.photo_url] : undefined,
      },
    };
  } catch {
    return { title: 'Politician | Drishta' };
  }
}

const STATUS_ORDER = ['Kept','Partially Kept','In Progress','Unverified','Expired','Broken'];

function BreakdownBar({ promises }) {
  if (!promises?.length) return null;
  const total = promises.length;
  const counts = {};
  for (const p of promises) counts[p.status] = (counts[p.status] ?? 0) + 1;

  const colors = {
    'Kept': '#22c55e', 'In Progress': '#f59e0b', 'Partially Kept': '#a855f7',
    'Broken': '#ef4444', 'Expired': '#6b7280', 'Unverified': '#3b82f6',
  };

  return (
    <div>
      {/* Stacked bar */}
      <div className="flex h-2 rounded-full overflow-hidden mb-3 gap-px">
        {STATUS_ORDER.map((s) => {
          const pct = ((counts[s] ?? 0) / total) * 100;
          if (!pct) return null;
          return (
            <div
              key={s}
              style={{ width: `${pct}%`, background: colors[s] }}
              title={`${s}: ${counts[s]}`}
            />
          );
        })}
      </div>
      {/* Legend */}
      <div className="space-y-1.5">
        {STATUS_ORDER.map((s) => {
          if (!counts[s]) return null;
          return (
            <div key={s} className="flex items-center justify-between text-[12px]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: colors[s] }} />
                <span className="text-[#9a9a9a]">{s}</span>
              </div>
              <span className="font-mono text-[#c0c0c0]">
                {counts[s]} <span className="text-[#5a5a5a]">({Math.round((counts[s]/total)*100)}%)</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default async function PoliticianPage({ params }) {
  const { state: stateParam, slug } = await params;
  const state = decodeURIComponent(stateParam).replace(/-/g, ' ');

  let politician, promises, articles;
  try {
    politician = await getPoliticianBySlug(state, slug);
    [promises, articles] = await Promise.all([
      getPromisesByPolitician(politician.id, { limit: 200 }),
      getArticlesByPolitician(politician.id).catch(() => []),
    ]);
  } catch {
    notFound();
  }

  const termStr = [
    politician.term_start ? format(new Date(politician.term_start), 'MMM yyyy') : null,
    politician.term_end   ? format(new Date(politician.term_end), 'MMM yyyy') : 'Present',
  ].filter(Boolean).join(' – ');

  // JSON-LD
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: politician.name,
    jobTitle: `${politician.level}, ${politician.constituency_name}`,
    memberOf: { '@type': 'Organization', name: politician.party },
    image: politician.photo_url,
    url: `${process.env.NEXT_PUBLIC_APP_URL}/politician/${stateParam}/${slug}`,
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar active="promises" />

      <div className="max-w-content mx-auto px-4 py-10">
        {/* Breadcrumb */}
        <nav className="text-[11px] text-[#4a4a4a] mb-6 flex items-center gap-2">
          <Link href="/promises" className="hover:text-[#9a9a9a]">Promises</Link>
          <span>/</span>
          <Link href={`/promises?state=${encodeURIComponent(state)}`} className="hover:text-[#9a9a9a]">{state}</Link>
          <span>/</span>
          <span className="text-[#7a7a7a]">{politician.name}</span>
        </nav>

        {/* ─── NEWSPAPER TWO-COLUMN ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-10">

          {/* LEFT: Record */}
          <div>
            {/* Politician header */}
            <div className="flex items-start gap-5 pb-7 border-b border-[#1f1f1f] mb-7">
              {politician.photo_url ? (
                <img
                  src={politician.photo_url}
                  alt={politician.name}
                  className="w-20 h-20 rounded-full object-cover flex-shrink-0 border border-[#2a2a2a]"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-[#1a1a1a] flex items-center justify-center text-[#3a3a3a] text-3xl font-serif flex-shrink-0">
                  {politician.name[0]}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono tracking-widest uppercase text-[#5a5a5a]">{politician.level}</span>
                  <span className="text-[#2a2a2a]">·</span>
                  <span className="text-[10px] text-[#5a5a5a]">{politician.party}</span>
                </div>
                <h1 className="font-serif text-[2rem] font-bold text-white leading-tight">{politician.name}</h1>
                <p className="text-[#5a5a5a] text-sm mt-1">
                  {politician.constituency_name}, {politician.state}
                  {termStr && <span className="ml-2 text-[#4a4a4a]">({termStr})</span>}
                </p>
                {politician.criminal_cases > 0 && (
                  <p className="text-[12px] text-[#ef4444] mt-1">
                    {politician.criminal_cases} declared criminal case{politician.criminal_cases !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>

            {/* Promises table */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-lg font-semibold text-white">
                Promises <span className="font-sans font-normal text-[#5a5a5a] text-sm ml-2">({promises.length})</span>
              </h2>
              <Link
                href={`/submit/promise?politician=${politician.id}`}
                className="text-[12px] text-[#5a5a5a] hover:text-white border border-[#2a2a2a] hover:border-[#3a3a3a] px-3 py-1.5 rounded transition-colors"
              >
                + Add promise
              </Link>
            </div>
            <PromiseTable promises={promises} />

            {/* News coverage */}
            {articles.length > 0 && (
              <div className="mt-10 pt-8 border-t border-[#1f1f1f]">
                <h2 className="font-serif text-lg font-semibold text-white mb-5">
                  News Coverage
                </h2>
                <div className="space-y-4">
                  {articles.map((a) => (
                    <Link key={a.id} href={`/news/article/${a.slug}`} className="flex items-start gap-4 group">
                      {a.cover_image_url && (
                        <img src={a.cover_image_url} alt={a.title} className="w-20 h-14 object-cover flex-shrink-0 bg-[#1a1a1a]" />
                      )}
                      <div>
                        <p className="text-[13px] text-[#c0c0c0] group-hover:text-white leading-snug transition-colors">
                          {a.title}
                        </p>
                        <p className="text-[11px] text-[#4a4a4a] mt-1">
                          {a.channel_name} · {a.published_at ? format(new Date(a.published_at), 'dd MMM yyyy') : ''}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Stats sidebar */}
          <aside className="space-y-8">
            {/* Score */}
            <div className="bg-[#111] border border-[#1f1f1f] p-6">
              <p className="text-[10px] tracking-[0.15em] uppercase text-[#5a5a5a] mb-4">Promise Score</p>
              <PromiseScore score={politician.promise_score} count={politician.promise_count} />
            </div>

            {/* Breakdown */}
            {promises.length > 0 && (
              <div className="bg-[#111] border border-[#1f1f1f] p-6">
                <p className="text-[10px] tracking-[0.15em] uppercase text-[#5a5a5a] mb-4">Breakdown</p>
                <BreakdownBar promises={promises} />
              </div>
            )}

            {/* Metadata */}
            <div className="bg-[#111] border border-[#1f1f1f] p-6">
              <p className="text-[10px] tracking-[0.15em] uppercase text-[#5a5a5a] mb-4">Details</p>
              <dl className="space-y-3 text-[13px]">
                {[
                  ['Party', politician.party],
                  ['Level', politician.level],
                  ['Constituency', politician.constituency_name],
                  ['State', politician.state],
                  ['Election Year', politician.election_year],
                  ['Gender', politician.gender === 'M' ? 'Male' : politician.gender === 'F' ? 'Female' : null],
                  ['Declared Assets', politician.assets ? `₹${(politician.assets/10000000).toFixed(2)} Cr` : null],
                  ['Liabilities', politician.liabilities ? `₹${(politician.liabilities/10000000).toFixed(2)} Cr` : null],
                ].filter(([,v]) => v).map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <dt className="text-[#5a5a5a]">{label}</dt>
                    <dd className="text-[#c0c0c0] text-right">{value}</dd>
                  </div>
                ))}
              </dl>

              {/* Asset history across elections */}
              {politician.asset_history?.length > 1 && (
                <div className="mt-4 pt-4 border-t border-[#1a1a1a]">
                  <p className="text-[10px] uppercase tracking-wider text-[#4a4a4a] mb-3">Asset History</p>
                  <div className="space-y-2">
                    {[...politician.asset_history]
                      .sort((a, b) => b.year - a.year)
                      .map((h, i) => {
                        const prev = politician.asset_history
                          .sort((a, b) => b.year - a.year)[i + 1];
                        const change = prev?.assets && h.assets
                          ? ((h.assets - prev.assets) / prev.assets * 100).toFixed(0)
                          : null;
                        return (
                          <div key={h.year} className="flex items-center justify-between">
                            <span className="text-[11px] text-[#4a4a4a]">{h.year}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[12px] text-[#c0c0c0] font-mono">
                                ₹{h.assets ? (h.assets/10000000).toFixed(2) : '?'} Cr
                              </span>
                              {change && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                  parseFloat(change) > 0
                                    ? 'text-[#ef4444] bg-[#ef4444]/10'
                                    : 'text-[#22c55e] bg-[#22c55e]/10'
                                }`}>
                                  {parseFloat(change) > 0 ? '+' : ''}{change}%
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            {/* Compare link */}
            <Link
              href={`/compare?a=${stateParam}/${slug}`}
              className="btn-ghost w-full justify-center text-sm py-2.5"
            >
              Compare with another politician →
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
}
