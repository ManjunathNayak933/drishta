import { getArticles } from '@/lib/api';
import { NewsMasthead, ArticleCard, SidebarStory } from '@/components/news/ArticleCard';
import Navbar from '@/components/layout/Navbar';
import Link from 'next/link';
import { format } from 'date-fns';

export const metadata = {
  title: 'Drishta News — Independent Civic Journalism',
  description: 'Independent journalism covering Indian politics, civic accountability, and democracy. Published by citizen journalists on the Drishta platform.',
};

const CATEGORIES = ['Politics','Infrastructure','Accountability','Elections','Development','Health','Education','Economy'];

export default async function NewsPage({ searchParams }) {
  const params = await searchParams;
  const { category } = params ?? {};

  const { data: articles } = await getArticles({ category, limit: 30 });

  const featured = articles?.[0] ?? null;
  const secondary = articles?.slice(1, 5) ?? [];
  const rest = articles?.slice(5) ?? [];

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* News-specific nav — no logo (masthead IS the branding) */}
      <nav className="border-b border-[#1a1a1a] px-4 sticky top-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-sm">
        <div className="max-w-content mx-auto">
          {/* Category nav */}
          <div className="flex items-center gap-0 overflow-x-auto hide-scrollbar h-10">
            <Link
              href="/news"
              className={`px-4 h-full flex items-center text-[11px] tracking-[0.12em] uppercase transition-colors whitespace-nowrap ${!category ? 'text-white border-b border-white' : 'text-[#5a5a5a] hover:text-[#a0a0a0]'}`}
            >
              All
            </Link>
            {CATEGORIES.map((c) => (
              <Link
                key={c}
                href={`/news?category=${encodeURIComponent(c)}`}
                className={`px-4 h-full flex items-center text-[11px] tracking-[0.12em] uppercase transition-colors whitespace-nowrap ${category === c ? 'text-white border-b border-white' : 'text-[#5a5a5a] hover:text-[#a0a0a0]'}`}
              >
                {c}
              </Link>
            ))}
            <div className="ml-auto flex items-center gap-3 pl-4 flex-shrink-0">
              <span className="text-[11px] text-[#3a3a3a] whitespace-nowrap hidden sm:block">
                {format(new Date(), 'EEE, d MMM yyyy')}
              </span>
              <Link
                href="/channel/dashboard"
                className="text-[11px] tracking-[0.1em] uppercase text-[#5a5a5a] hover:text-white transition-colors whitespace-nowrap border border-[#2a2a2a] hover:border-[#3a3a3a] px-3 py-1 rounded"
              >
                My Channel
              </Link>
              <Link
                href="/auth/login"
                className="text-[11px] tracking-[0.1em] uppercase text-[#b8860b] hover:text-[#d4a017] transition-colors whitespace-nowrap"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-content mx-auto px-4 py-8">
        {/* Masthead */}
        <NewsMasthead date={format(new Date(), 'EEEE, d MMMM yyyy')} />

        {/* ─── FEATURED LAYOUT ─── */}
        {featured && (
          <div className="grid grid-cols-1 lg:grid-cols-[3fr_1fr] gap-8 mb-12 pb-12 border-b border-[#1a1a1a]">
            {/* Featured article */}
            <ArticleCard article={featured} size="featured" />

            {/* Secondary sidebar — numbered list */}
            <div>
              <p className="text-[10px] tracking-[0.2em] uppercase text-[#4a4a4a] mb-0 border-b border-[#1a1a1a] pb-3">
                Also Today
              </p>
              {secondary.map((a, i) => (
                <SidebarStory key={a.id} article={a} index={i + 1} />
              ))}
            </div>
          </div>
        )}

        {/* ─── ARTICLE GRID ─── */}
        {rest.length > 0 && (
          <>
            <p className="text-[10px] tracking-[0.2em] uppercase text-[#4a4a4a] mb-6 pb-3 border-b border-[#1a1a1a]">
              More Stories
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 mb-12">
              {rest.map((a) => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>
          </>
        )}

        {/* Empty state */}
        {!featured && (
          <div className="py-24 text-center">
            <p className="font-serif text-2xl text-[#2a2a2a] mb-2">No articles yet.</p>
            <p className="text-[#3a3a3a] text-sm mb-6">Be the first to publish on Drishta.</p>
            <Link href="/channel/apply" className="btn-ghost text-sm py-2">Apply for a Channel →</Link>
          </div>
        )}

        {/* Channel CTA */}
        <div className="border-t border-[#1a1a1a] pt-10 mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-[11px] tracking-[0.15em] uppercase text-[#4a4a4a] mb-1">Publish on Drishta</p>
            <p className="font-serif text-white text-lg">Start your civic journalism channel.</p>
          </div>
          <div className="flex items-center gap-3">
            <a href="/auth/login" className="btn-ghost text-sm py-2">Sign in →</a>
            <a href="/channel/apply" className="btn-primary text-sm py-2">Apply →</a>
          </div>
        </div>
      </div>
    </div>
  );
}
