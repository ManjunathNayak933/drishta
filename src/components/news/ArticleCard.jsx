import Link from 'next/link';
import { format } from 'date-fns';

// ============================================================
// ArticleCard — used in grids and lists
// ============================================================
export function ArticleCard({ article, size = 'normal' }) {
  const date = article.published_at
    ? format(new Date(article.published_at), 'dd MMM yyyy')
    : '';

  if (size === 'featured') {
    return (
      <Link href={`/news/article/${article.slug}`} className="group block">
        <div className="aspect-[16/10] overflow-hidden bg-[#141414] mb-4">
          {article.cover_image_url && (
            <img
              src={article.cover_image_url}
              alt={article.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
            />
          )}
        </div>
        {article.category && (
          <span className="news-pill mb-3 inline-block">{article.category}</span>
        )}
        <h2 className="font-serif text-[1.6rem] font-bold leading-[1.2] text-white group-hover:text-[#e0e0e0] transition-colors mb-2">
          {article.title}
        </h2>
        {article.subheadline && (
          <p className="text-[#7a7a7a] text-[14px] leading-relaxed mb-3 line-clamp-2">
            {article.subheadline}
          </p>
        )}
        <div className="flex items-center gap-3 text-[12px] text-[#5a5a5a]">
          {article.author_name && <span>{article.author_name}</span>}
          {article.author_name && date && <span>·</span>}
          {date && <span>{date}</span>}
        </div>
      </Link>
    );
  }

  // Normal card
  return (
    <Link href={`/news/article/${article.slug}`} className="group block">
      <div className="aspect-[4/3] overflow-hidden bg-[#141414] mb-3 relative">
        {article.cover_image_url && (
          <img
            src={article.cover_image_url}
            alt={article.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
        )}
        {article.category && (
          <span className="news-pill absolute bottom-0 left-0">{article.category}</span>
        )}
      </div>
      <h3 className="font-serif text-[15px] font-semibold text-[#d0d0d0] group-hover:text-white leading-snug mb-1.5 line-clamp-2 transition-colors">
        {article.title}
      </h3>
      <div className="flex items-center gap-2 text-[11px] text-[#4a4a4a]">
        {article.channel_name && (
          <span className="text-[#6a6a6a]">{article.channel_name}</span>
        )}
        {date && <span>{date}</span>}
      </div>
    </Link>
  );
}

// ============================================================
// SidebarStory — numbered secondary story for the sidebar list
// ============================================================
export function SidebarStory({ article, index }) {
  const date = article.published_at
    ? format(new Date(article.published_at), 'dd MMM')
    : '';

  return (
    <Link
      href={`/news/article/${article.slug}`}
      className="group flex items-start gap-4 py-4 border-b border-[#1a1a1a] last:border-b-0 hover:bg-[#0d0d0d] -mx-4 px-4 transition-colors"
    >
      <span className="font-mono text-[#3a3a3a] text-sm pt-0.5 flex-shrink-0 w-5">
        {String(index).padStart(2, '0')}
      </span>
      <div className="flex-1 min-w-0">
        {article.category && (
          <span className="news-pill mb-1.5 inline-block text-[9px]">{article.category}</span>
        )}
        <h4 className="font-serif text-[14px] font-semibold text-[#c0c0c0] group-hover:text-white leading-snug line-clamp-2 transition-colors">
          {article.title}
        </h4>
        <span className="text-[11px] text-[#4a4a4a] mt-1 block">{date}</span>
      </div>
    </Link>
  );
}

// ============================================================
// NewsMasthead — centered publication header for /news
// ============================================================
export function NewsMasthead({ channelName, date }) {
  return (
    <header className="border-b border-[#1a1a1a] pb-5 mb-8 text-center">
      {channelName && (
        <p className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-2 font-sans">
          By {channelName}
        </p>
      )}
      <h1 className="font-serif text-[clamp(3rem,7vw,5rem)] font-black leading-none tracking-tight text-white">
        Drishta
      </h1>
      <div className="flex items-center justify-center gap-6 mt-3 text-[11px] text-[#4a4a4a] tracking-[0.12em] uppercase">
        <span>Independent Civic Journalism</span>
        <span>·</span>
        <span>{date ?? format(new Date(), 'EEEE, d MMMM yyyy')}</span>
      </div>
    </header>
  );
}
