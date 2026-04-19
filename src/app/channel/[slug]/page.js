import { notFound } from 'next/navigation';
import { getChannelBySlug, getArticles } from '@/lib/api';
import { ArticleCard } from '@/components/news/ArticleCard';
import Link from 'next/link';
import { format } from 'date-fns';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  try {
    const channel = await getChannelBySlug(slug);
    return {
      title: `${channel.name} | Drishta`,
      description: channel.tagline ?? `Independent journalism by ${channel.name} on Drishta.`,
    };
  } catch {
    return { title: 'Channel | Drishta' };
  }
}

export default async function ChannelPage({ params }) {
  const { slug } = await params;
  let channel;
  try {
    channel = await getChannelBySlug(slug);
  } catch {
    notFound();
  }

  const { data: articles } = await getArticles({ channelId: channel.id, limit: 20 });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsMediaOrganization',
    name: channel.name,
    description: channel.tagline,
    logo: channel.logo_url,
    url: `${process.env.NEXT_PUBLIC_APP_URL}/channel/${slug}`,
  };

  const accentColor = channel.accent_color ?? '#b8860b';

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Channel masthead */}
      <header className="border-b border-[#1a1a1a] py-10 text-center px-4">
        {channel.logo_url && (
          <img src={channel.logo_url} alt={channel.name} className="w-16 h-16 rounded-full mx-auto mb-4 object-cover" />
        )}
        <div className="w-12 h-1 rounded-full mx-auto mb-4" style={{ background: accentColor }} />
        <h1 className="font-serif text-3xl font-bold text-white mb-2">{channel.name}</h1>
        {channel.tagline && (
          <p className="text-[#6a6a6a] text-sm max-w-sm mx-auto">{channel.tagline}</p>
        )}
        <div className="flex items-center justify-center gap-4 mt-4 text-[11px] text-[#4a4a4a]">
          <span>{articles?.length ?? 0} articles</span>
          <span>·</span>
          <Link href="/news" className="hover:text-white transition-colors">← All Channels</Link>
        </div>
      </header>

      {/* Articles */}
      <div className="max-w-content mx-auto px-4 py-10">
        {articles?.length ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {articles.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center text-[#3a3a3a] text-sm">No articles published yet.</div>
        )}
      </div>
    </div>
  );
}
