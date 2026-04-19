import { getIssues, getTopConstituenciesByIssues } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';
import IssueCard from '@/components/issues/IssueCard';
import Link from 'next/link';

export const metadata = {
  title: 'Issue Board — Civic Problems Across India | Drishta',
  description: 'Browse civic issues reported by citizens across India. Roads, water, electricity, sanitation — documented with evidence and tagged to responsible politicians.',
};

const CATEGORIES = ['Roads','Water Supply','Electricity','Sanitation','Public Safety','Healthcare','Education','Other'];
const STATUSES = ['Open','Acknowledged','Resolved','Disputed'];

export default async function IssuesPage({ searchParams }) {
  const params = await searchParams;
  const { state, category, status, sort = 'newest', page: pageStr } = params ?? {};
  const page = Math.max(1, parseInt(pageStr ?? '1', 10));
  const limit = 24;
  const offset = (page - 1) * limit;

  const [{ data: issues, total }, topConstituencies] = await Promise.all([
    getIssues({ state, category, status, sort, limit, offset }),
    getTopConstituenciesByIssues(8),
  ]);

  const totalPages = Math.ceil((total ?? 0) / limit);

  const buildUrl = (overrides) => {
    const q = new URLSearchParams({
      ...(state && { state }),
      ...(category && { category }),
      ...(status && { status }),
      ...(sort !== 'newest' && { sort }),
      ...overrides,
    });
    return `/issues?${q}`;
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <Navbar active="issues" />

      <div className="max-w-content mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8 pb-6 border-b border-[#1f1f1f] flex items-end justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold text-white mb-1">Issue Board</h1>
            <p className="text-[#5a5a5a] text-sm">
              {total?.toLocaleString() ?? 0} civic issues documented by citizens
            </p>
          </div>
          <Link href="/submit/issue" className="btn-primary text-sm py-2">
            + Post an Issue
          </Link>
        </div>

        <div className="flex flex-col lg:flex-row gap-10">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Sort + Status filters — always visible, wrapping */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Link href={buildUrl({ sort: 'newest', page: 1 })}
                className={`btn-ghost text-xs py-1.5 ${sort === 'newest' || !sort ? 'border-[#4a4a4a] text-white' : ''}`}>
                Newest
              </Link>
              <Link href={buildUrl({ sort: 'upvotes', page: 1 })}
                className={`btn-ghost text-xs py-1.5 ${sort === 'upvotes' ? 'border-[#4a4a4a] text-white' : ''}`}>
                Most Upvoted
              </Link>
              {STATUSES.map((s) => (
                <Link key={s} href={buildUrl({ status: status === s ? '' : s, page: 1 })}
                  className={`btn-ghost text-xs py-1.5 ${status === s ? 'border-[#4a4a4a] text-white' : ''}`}>
                  {s}
                </Link>
              ))}
            </div>

            {/* Category pills — horizontal scroll on mobile */}
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 mb-6">
              {CATEGORIES.map((c) => (
                <Link key={c}
                  href={buildUrl({ category: category === c ? '' : c, page: 1 })}
                  className={`btn-ghost text-xs py-1.5 flex-shrink-0 ${category === c ? 'border-[#4a4a4a] text-white' : ''}`}>
                  {c}
                </Link>
              ))}
              {(state || category || status || sort !== 'newest') && (
                <Link href="/issues" className="text-xs text-[#ef4444] hover:underline flex-shrink-0 self-center ml-1">
                  Clear
                </Link>
              )}
            </div>

            {/* Grid */}
            {issues?.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-px bg-[#1a1a1a]">
                {issues.map((issue) => (
                  <div key={issue.id} className="bg-[#0f0f0f]">
                    <IssueCard issue={issue} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center text-[#3a3a3a] text-sm">No issues found.</div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center gap-4 mt-10 pt-6 border-t border-[#1f1f1f]">
                {page > 1 && (
                  <Link href={buildUrl({ page: page - 1 })} className="btn-ghost text-sm py-2">
                    ← Previous
                  </Link>
                )}
                <span className="text-[#5a5a5a] text-sm ml-auto">Page {page} of {totalPages}</span>
                {page < totalPages && (
                  <Link href={buildUrl({ page: page + 1 })} className="btn-ghost text-sm py-2">
                    Next →
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="w-full lg:w-64 flex-shrink-0">
            <div className="sticky top-16">
              <p className="text-[10px] tracking-[0.18em] uppercase text-[#4a4a4a] mb-4">
                Top Constituencies by Open Issues
              </p>
              <div className="space-y-0">
                {topConstituencies.map((c, i) => (
                  <Link
                    key={`${c.name}-${c.state}`}
                    href={`/issues/${c.state.toLowerCase().replace(/\s+/g, '-')}/${c.name.toLowerCase().replace(/\s+/g, '-')}`}
                    className="flex items-center gap-3 py-3 border-b border-[#1a1a1a] hover:bg-[#0d0d0d] -mx-2 px-2 transition-colors group"
                  >
                    <span className="font-mono text-[11px] text-[#3a3a3a] w-5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-[#c0c0c0] group-hover:text-white truncate transition-colors">{c.name}</p>
                      <p className="text-[11px] text-[#4a4a4a]">{c.state}</p>
                    </div>
                    <span className="text-[#ef4444] text-[12px] font-mono font-bold">{c.count}</span>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
