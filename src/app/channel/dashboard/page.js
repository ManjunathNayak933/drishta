'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getChannelByOwnerEmail, getArticlesByChannel, deleteArticle } from '@/lib/api';
import { format } from 'date-fns';

export default function ChannelDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [channel, setChannel] = useState(null);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/auth/login');
        return;
      }
      setUser(session.user);
      loadChannel(session.user.email);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') router.replace('/auth/login');
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadChannel(email) {
    setLoading(true);
    try {
      const ch = await getChannelByOwnerEmail(email);
      if (ch) {
        setChannel(ch);
        const arts = await getArticlesByChannel(ch.id);
        setArticles(arts);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); setAuthChecked(true); }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this article? This cannot be undone.')) return;
    await deleteArticle(id);
    setArticles(a => a.filter(x => x.id !== id));
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/auth/login');
  }

  if (!authChecked || loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-[#3a3a3a] text-sm">Loading…</div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center text-center px-4">
        <h2 className="font-serif text-2xl font-bold text-white mb-2">No channel found</h2>
        <p className="text-[#5a5a5a] text-sm max-w-sm mb-6">
          Your email ({user?.email}) doesn't have an approved channel yet. Apply for one to start publishing.
        </p>
        <div className="flex gap-3">
          <Link href="/channel/apply" className="btn-primary text-sm py-2">Apply for a channel →</Link>
          <button onClick={handleSignOut} className="btn-ghost text-sm py-2">Sign out</button>
        </div>
      </div>
    );
  }

  const published = articles.filter(a => a.status === 'published').length;
  const drafts    = articles.filter(a => a.status === 'draft').length;

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="border-b border-[#1a1a1a] px-4 h-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/news" className="font-serif font-bold text-white hover:text-[#e0e0e0] transition-colors">
            Drishta
          </Link>
          <span className="text-[#2a2a2a]">·</span>
          <span className="text-[13px] text-[#6a6a6a]">{channel.name}</span>
        </div>
        <button onClick={handleSignOut} className="text-[12px] text-[#4a4a4a] hover:text-white transition-colors">
          Sign out
        </button>
      </header>

      <div className="max-w-content mx-auto px-4 py-10">
        {/* Channel header */}
        <div className="flex items-start justify-between mb-8 pb-6 border-b border-[#1f1f1f]">
          <div>
            <p className="text-[10px] tracking-wider uppercase text-[#4a4a4a] mb-1">Channel Dashboard</p>
            <h1 className="font-serif text-2xl font-bold text-white">{channel.name}</h1>
            {channel.tagline && <p className="text-[#5a5a5a] text-sm mt-1">{channel.tagline}</p>}
          </div>
          <Link href="/channel/dashboard/editor/new" className="btn-primary text-sm py-2">
            + New Article
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Articles', value: articles.length, color: '#f5f5f5' },
            { label: 'Published', value: published, color: '#22c55e' },
            { label: 'Drafts', value: drafts, color: '#f59e0b' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-[#0f0f0f] border border-[#1f1f1f] p-5">
              <p className="text-[10px] tracking-wider uppercase text-[#4a4a4a] mb-2">{label}</p>
              <p className="font-mono text-3xl font-bold" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Articles */}
        {articles.length === 0 ? (
          <div className="py-20 text-center border border-[#1a1a1a]">
            <p className="font-serif text-xl text-[#2a2a2a] mb-2">No articles yet.</p>
            <p className="text-[#3a3a3a] text-sm mb-6">Write your first article for {channel.name}.</p>
            <Link href="/channel/dashboard/editor/new" className="btn-primary text-sm py-2">
              Write your first article →
            </Link>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {articles.map(a => (
                <div key={a.id} className="bg-[#0f0f0f] border border-[#1f1f1f] p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="text-sm text-[#c0c0c0] font-medium line-clamp-2">{a.title}</p>
                    <span className={`badge flex-shrink-0 ${a.status === 'published' ? 'badge-kept' : a.status === 'draft' ? 'badge-unverified' : 'badge-expired'}`}>
                      {a.status}
                    </span>
                  </div>
                  <p className="text-[12px] text-[#4a4a4a] mb-3">
                    {a.published_at ? format(new Date(a.published_at), 'dd MMM yyyy') : 'Not published'}
                  </p>
                  <div className="flex gap-3">
                    <Link href={`/channel/dashboard/editor/${a.id}`} className="text-xs text-[#3b82f6] hover:underline">Edit</Link>
                    {a.status === 'published' && (
                      <Link href={`/news/article/${a.slug}`} className="text-xs text-[#5a5a5a] hover:text-white">View ↗</Link>
                    )}
                    <button onClick={() => handleDelete(a.id)} className="text-xs text-[#ef4444]/60 hover:text-[#ef4444] ml-auto">Delete</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th style={{ width: '12%' }}>Status</th>
                    <th style={{ width: '14%' }}>Published</th>
                    <th style={{ width: '10%' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {articles.map(a => (
                    <tr key={a.id}>
                      <td>
                        <Link href={`/channel/dashboard/editor/${a.id}`}
                          className="text-[#c0c0c0] hover:text-white text-sm transition-colors">
                          {a.title}
                        </Link>
                        {a.category && <div className="text-[11px] text-[#4a4a4a] mt-0.5">{a.category}</div>}
                      </td>
                      <td>
                        <span className={`badge ${a.status === 'published' ? 'badge-kept' : a.status === 'draft' ? 'badge-unverified' : 'badge-expired'}`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="text-[12px] text-[#5a5a5a]">
                        {a.published_at ? format(new Date(a.published_at), 'dd MMM yyyy') : '—'}
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          <Link href={`/channel/dashboard/editor/${a.id}`} className="text-[12px] text-[#4a4a4a] hover:text-white transition-colors">Edit</Link>
                          {a.status === 'published' && (
                            <Link href={`/news/article/${a.slug}`} className="text-[12px] text-[#3b82f6] hover:underline">View ↗</Link>
                          )}
                          <button onClick={() => handleDelete(a.id)} className="text-[12px] text-[#ef4444]/60 hover:text-[#ef4444] transition-colors ml-1">Del</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Channel link */}
        <div className="mt-8 pt-6 border-t border-[#1a1a1a] flex items-center justify-between text-[13px] text-[#4a4a4a]">
          <span>Channel: <Link href={`/channel/${channel.slug}`} className="text-[#5a5a5a] hover:text-white transition-colors">drishta.in/channel/{channel.slug}</Link></span>
          <Link href="/news" className="hover:text-white transition-colors">← Back to News</Link>
        </div>
      </div>
    </div>
  );
}
