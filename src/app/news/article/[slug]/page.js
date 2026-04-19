import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getArticleBySlug, getArticles } from '@/lib/api';
import { SidebarStory } from '@/components/news/ArticleCard';
import { format } from 'date-fns';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  try {
    const article = await getArticleBySlug(slug);
    return {
      title: `${article.title} | Drishta`,
      description: article.excerpt ?? article.subheadline ?? `Read "${article.title}" on Drishta.`,
      authors: article.author_name ? [{ name: article.author_name }] : undefined,
      openGraph: {
        type: 'article',
        title: article.title,
        description: article.excerpt,
        images: article.cover_image_url ? [article.cover_image_url] : undefined,
        publishedTime: article.published_at,
        authors: article.author_name ? [article.author_name] : undefined,
        siteName: 'Drishta',
      },
    };
  } catch {
    return { title: 'Article | Drishta' };
  }
}

export default async function ArticlePage({ params }) {
  const { slug } = await params;
  let article;
  try {
    article = await getArticleBySlug(slug);
  } catch {
    notFound();
  }

  // More from channel
  const { data: more } = await getArticles({
    channelId: article.channel_id,
    limit: 4,
  }).catch(() => ({ data: [] }));
  const moreArticles = more?.filter((a) => a.slug !== slug).slice(0, 3) ?? [];

  // Fetch tagged politicians
  let taggedPoliticians = [];
  if (article.politician_ids?.length > 0) {
    const { createClient } = await import('@supabase/supabase-js');
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { data: pols } = await sb.from('politicians')
      .select('id, name, slug, level, state, constituency_name, party')
      .in('id', article.politician_ids);
    taggedPoliticians = pols ?? [];
  }
  article.tagged_politicians = taggedPoliticians;

  const publishedDate = article.published_at
    ? format(new Date(article.published_at), 'EEEE, d MMMM yyyy')
    : '';

  // NewsArticle JSON-LD
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: article.excerpt ?? article.subheadline,
    image: article.cover_image_url ? [article.cover_image_url] : undefined,
    datePublished: article.published_at,
    dateModified: article.updated_at,
    author: article.author_name ? [{ '@type': 'Person', name: article.author_name }] : undefined,
    publisher: {
      '@type': 'NewsMediaOrganization',
      name: article.channel?.name ?? 'Drishta',
      logo: article.channel?.logo_url ?? undefined,
    },
    url: `${process.env.NEXT_PUBLIC_APP_URL}/news/article/${slug}`,
    isPartOf: {
      '@type': 'NewsMediaOrganization',
      name: 'Drishta',
      url: process.env.NEXT_PUBLIC_APP_URL,
    },
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Minimal news nav */}
      <nav className="border-b border-[#1a1a1a] px-4 h-10 flex items-center sticky top-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-sm">
        <Link href="/news" className="font-serif font-bold text-white hover:text-[#e0e0e0] transition-colors">
          Drishta
        </Link>
        {article.channel && (
          <>
            <span className="text-[#2a2a2a] mx-3">·</span>
            <Link
              href={`/channel/${article.channel.slug}`}
              className="text-[11px] tracking-[0.1em] uppercase text-[#5a5a5a] hover:text-[#a0a0a0] transition-colors"
            >
              {article.channel.name}
            </Link>
          </>
        )}
      </nav>

      <article className="max-w-article mx-auto px-4 py-12">
        {/* Category */}
        {article.category && (
          <span className="news-pill mb-5 inline-block">{article.category}</span>
        )}

        {/* Headline */}
        <h1 className="font-serif text-[clamp(1.8rem,5vw,2.8rem)] font-bold leading-[1.1] text-white mb-4">
          {article.title}
        </h1>

        {/* Subheadline */}
        {article.subheadline && (
          <p className="font-serif text-[1.1rem] italic text-[#7a7a7a] leading-relaxed mb-6">
            {article.subheadline}
          </p>
        )}

        {/* Byline row */}
        <div className="flex items-center gap-4 pb-6 border-b border-[#1a1a1a] mb-8">
          {article.author_name && (
            <span className="text-[13px] font-medium text-[#b0b0b0]">{article.author_name}</span>
          )}
          {article.author_name && publishedDate && (
            <span className="text-[#2a2a2a]">·</span>
          )}
          {publishedDate && (
            <time className="text-[13px] text-[#5a5a5a]" dateTime={article.published_at}>
              {publishedDate}
            </time>
          )}
          {article.channel && (
            <>
              <span className="text-[#2a2a2a] ml-auto">·</span>
              <Link
                href={`/channel/${article.channel.slug}`}
                className="text-[12px] text-[#5a5a5a] hover:text-white transition-colors"
              >
                {article.channel.name}
              </Link>
            </>
          )}
        </div>

        {/* Cover image — full article width */}
        {article.cover_image_url && (
          <div className="w-full aspect-[16/9] overflow-hidden bg-[#141414] mb-10">
            <img
              src={article.cover_image_url}
              alt={article.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Body — TipTap rendered HTML */}
        {article.body_html ? (
          <div
            className="article-body"
            dangerouslySetInnerHTML={{ __html: article.body_html }}
          />
        ) : (
          <div className="article-body">
            <p className="text-[#7a7a7a] italic">Article content not available.</p>
          </div>
        )}

        {/* Tagged politicians */}
        {article.tagged_politicians?.length > 0 && (
          <div className="mt-10 pt-6 border-t border-[#1a1a1a]">
            <p className="text-[10px] uppercase tracking-wider text-[#4a4a4a] mb-3">Politicians mentioned</p>
            <div className="flex flex-wrap gap-2">
              {article.tagged_politicians.map(p => (
                <Link key={p.id}
                  href={`/politician/${encodeURIComponent(p.state)}/${p.slug}`}
                  className="inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-full border border-[#2a2a2a] text-[#8a8a8a] hover:border-[#3a3a3a] hover:text-white transition-colors">
                  <span className="text-[9px] px-1.5 py-0.5 rounded" style={{
                    color: p.level === 'MP' ? '#3b82f6' : p.level === 'MLA' ? '#f59e0b' : '#22c55e',
                    background: p.level === 'MP' ? '#3b82f620' : p.level === 'MLA' ? '#f59e0b20' : '#22c55e20'
                  }}>{p.level}</span>
                  {p.name}
                  <span className="text-[10px] text-[#4a4a4a]">{p.constituency_name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>

      {/* More from channel */}
      {moreArticles.length > 0 && (
        <section className="border-t border-[#1a1a1a] mt-6">
          <div className="max-w-article mx-auto px-4 py-10">
            <p className="text-[10px] tracking-[0.2em] uppercase text-[#4a4a4a] mb-0 pb-3 border-b border-[#1a1a1a]">
              More from {article.channel?.name ?? 'Drishta'}
            </p>
            {moreArticles.map((a, i) => (
              <SidebarStory key={a.id} article={a} index={i + 1} />
            ))}
            <div className="mt-6 pt-4 border-t border-[#1a1a1a]">
              <Link href="/news" className="text-[12px] text-[#5a5a5a] hover:text-white transition-colors">
                ← All stories
              </Link>
            </div>
          </div>
        </section>
      )}

      <style>{`
        .article-body {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 1.05rem;
          line-height: 1.85;
          color: #c0c0c0;
        }
        .article-body p { margin-bottom: 1.5em; }
        .article-body h2 {
          font-size: 1.4rem;
          font-weight: 700;
          color: #f0f0f0;
          margin: 2em 0 0.75em;
          line-height: 1.25;
        }
        .article-body h3 {
          font-size: 1.15rem;
          font-weight: 600;
          color: #e0e0e0;
          margin: 1.5em 0 0.5em;
        }
        .article-body blockquote {
          border-left: 2px solid #b8860b;
          padding-left: 1.25rem;
          margin: 2em 0;
          font-style: italic;
          color: #9a9a9a;
        }
        .article-body a { color: #3b82f6; }
        .article-body a:hover { text-decoration: underline; }
        .article-body strong { color: #e0e0e0; font-weight: 600; }
        .article-body img {
          width: 100%;
          height: auto;
          margin: 2em 0;
        }
        .article-body ul, .article-body ol {
          padding-left: 1.5em;
          margin-bottom: 1.5em;
        }
        .article-body li { margin-bottom: 0.4em; }
        .article-body hr {
          border: none;
          border-top: 1px solid #2a2a2a;
          margin: 3em 0;
        }
      `}</style>
    </div>
  );
}
