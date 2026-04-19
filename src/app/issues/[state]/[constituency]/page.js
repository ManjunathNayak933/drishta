import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getIssuesByConstituency } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';
import IssueCard from '@/components/issues/IssueCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import PromiseScore from '@/components/promises/PromiseScore';

export async function generateMetadata({ params }) {
  const { state, constituency } = await params;
  const stateName = decodeURIComponent(state).replace(/-/g, ' ');
  const constName = decodeURIComponent(constituency).replace(/-/g, ' ');
  return {
    title: `${constName} Issues — Drishta`,
    description: `Civic issues reported in ${constName}, ${stateName}. Roads, water supply, electricity, and more — documented by citizens and tagged to elected representatives.`,
  };
}

export default async function ConstituencyIssuesPage({ params }) {
  const { state: stateParam, constituency: constParam } = await params;
  const state = decodeURIComponent(stateParam).replace(/-/g, ' ');
  const constSlug = decodeURIComponent(constParam);

  let data;
  try {
    data = await getIssuesByConstituency(state, constSlug);
    if (!data) notFound();
  } catch {
    notFound();
  }

  const { constituency, issues, total, politicians } = data;
  const mla = politicians?.find((p) => p.level === 'MLA');
  const mp  = politicians?.find((p) => p.level === 'MP');

  const openCount     = issues?.filter((i) => i.status === 'Open').length ?? 0;
  const resolvedCount = issues?.filter((i) => i.status === 'Resolved').length ?? 0;

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <Navbar active="issues" />

      <div className="max-w-content mx-auto px-4 py-10">
        {/* Breadcrumb */}
        <nav className="text-[11px] text-[#4a4a4a] mb-6 flex items-center gap-2">
          <Link href="/issues" className="hover:text-[#9a9a9a]">Issues</Link>
          <span>/</span>
          <span className="text-[#7a7a7a]">{constituency.name}</span>
        </nav>

        {/* Header */}
        <div className="mb-8 pb-8 border-b border-[#1f1f1f]">
          <h1 className="font-serif text-3xl font-bold text-white mb-1">{constituency.name}</h1>
          <p className="text-[#5a5a5a] text-sm mb-6">{state} · {constituency.type === 'LS' ? 'Lok Sabha' : 'Vidhan Sabha'}</p>

          {/* Stats */}
          <div className="flex flex-wrap gap-6 mb-6">
            {[
              { label: 'Total Issues', value: total, color: '#f5f5f5' },
              { label: 'Open', value: openCount, color: '#f59e0b' },
              { label: 'Resolved', value: resolvedCount, color: '#22c55e' },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <p className="text-[10px] tracking-[0.14em] uppercase text-[#4a4a4a] mb-1">{label}</p>
                <p className="font-mono font-bold text-2xl" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Tagged politicians */}
          {(mla || mp) && (
            <div className="flex flex-wrap gap-4">
              {[mla, mp].filter(Boolean).map((p) => (
                <Link
                  key={p.id}
                  href={`/politician/${encodeURIComponent(p.state)}/${p.slug}`}
                  className="flex items-center gap-3 bg-[#111] border border-[#2a2a2a] rounded-lg px-4 py-3 hover:border-[#3a3a3a] transition-colors group"
                >
                  {p.photo_url && (
                    <img src={p.photo_url} alt={p.name} className="w-9 h-9 rounded-full object-cover" />
                  )}
                  <div>
                    <p className="text-[11px] text-[#4a4a4a]">{p.level}</p>
                    <p className="text-[13px] font-medium text-[#c0c0c0] group-hover:text-white transition-colors">{p.name}</p>
                    <PromiseScore score={p.promise_score} count={p.promise_count} inline />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Issues grid */}
        {issues?.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[#1a1a1a]">
            {issues.map((issue) => (
              <div key={issue.id} className="bg-[#0f0f0f]">
                <IssueCard issue={issue} />
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <p className="text-[#3a3a3a] text-sm mb-4">No issues reported in this constituency yet.</p>
            <Link href="/submit/issue" className="btn-primary text-sm py-2">
              Be the first to report →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
