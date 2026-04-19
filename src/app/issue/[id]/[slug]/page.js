'use client';

import { useState, useEffect } from 'react';
import { useParams, notFound } from 'next/navigation';
import Link from 'next/link';
import { getIssueById, upvoteIssue } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';
import { StatusBadge, CategoryPill } from '@/components/ui/StatusBadge';
import ReportModal from '@/components/promises/ReportModal';
import { formatDistanceToNow, format } from 'date-fns';

// NOTE: This page is written as a client component for upvoting interactivity.
// For full SSR + JSON-LD, split into a server wrapper + client interaction shell.

export default function IssueDetailPage() {
  const params = useParams();
  const { id } = params;

  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upvoteEmail, setUpvoteEmail] = useState('');
  const [upvoting, setUpvoting] = useState(false);
  const [upvoted, setUpvoted] = useState(false);
  const [showUpvoteInput, setShowUpvoteInput] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [localUpvotes, setLocalUpvotes] = useState(0);

  useEffect(() => {
    getIssueById(id)
      .then((i) => { setIssue(i); setLocalUpvotes(i.upvote_count ?? 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  async function handleUpvote() {
    if (!upvoteEmail) return;
    setUpvoting(true);
    try {
      await upvoteIssue(id, upvoteEmail);
      setUpvoted(true);
      setLocalUpvotes((n) => n + 1);
      setShowUpvoteInput(false);
    } catch {
      alert("You've already upvoted this issue, or something went wrong.");
    } finally {
      setUpvoting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-[#3a3a3a] text-sm">Loading…</div>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center text-center px-4">
        <div>
          <p className="text-[#3a3a3a] mb-4">Issue not found or removed.</p>
          <Link href="/issues" className="btn-ghost text-sm py-2">← Back to Issues</Link>
        </div>
      </div>
    );
  }

  const mla = issue.mla;
  const mp  = issue.mp;
  const timeAgo = issue.created_at ? formatDistanceToNow(new Date(issue.created_at), { addSuffix: true }) : '';
  const dateStr = issue.created_at ? format(new Date(issue.created_at), 'dd MMMM yyyy') : '';

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <Navbar active="issues" />

      {/* Cover photo — full width */}
      <div className="relative w-full aspect-[21/9] bg-[#0a0a0a] overflow-hidden max-h-[480px]">
        <img src={issue.photo_url} alt={issue.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        {/* Overlay badges */}
        <div className="absolute bottom-4 left-4 flex items-center gap-2">
          <StatusBadge status={issue.status} />
          <CategoryPill category={issue.category} type="issue" />
        </div>
      </div>

      <div className="max-w-article mx-auto px-4 py-10">
        {/* Breadcrumb */}
        <nav className="text-[11px] text-[#4a4a4a] mb-6 flex items-center gap-2">
          <Link href="/issues" className="hover:text-[#9a9a9a]">Issues</Link>
          <span>/</span>
          <Link
            href={`/issues/${encodeURIComponent(issue.state)}/${issue.constituency_id}`}
            className="hover:text-[#9a9a9a]"
          >
            {issue.constituency_name}
          </Link>
          <span>/</span>
          <span className="text-[#7a7a7a] line-clamp-1">{issue.title}</span>
        </nav>

        {/* Title */}
        <h1 className="font-serif text-[clamp(1.5rem,4vw,2.2rem)] font-bold text-white leading-[1.2] mb-4">
          {issue.title}
        </h1>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[#5a5a5a] mb-8 pb-6 border-b border-[#1f1f1f]">
          {issue.submitter_name && <span>Posted by <span className="text-[#9a9a9a]">{issue.submitter_name}</span></span>}
          <span>{dateStr}</span>
          <span>{issue.constituency_name}, {issue.state}</span>
          {issue.location_text && <span>📍 {issue.location_text}</span>}
          {issue.ward && <span>Ward: {issue.ward}</span>}
        </div>

        {/* Description */}
        <div className="prose prose-invert max-w-none mb-10">
          <p className="text-[#b0b0b0] text-[1rem] leading-[1.8] whitespace-pre-wrap">
            {issue.description}
          </p>
        </div>

        {/* ─── Tagged politicians ─── */}
        {(mla || mp) && (
          <section className="mb-10 pb-8 border-b border-[#1f1f1f]">
            <p className="text-[10px] tracking-[0.18em] uppercase text-[#4a4a4a] mb-4">
              This issue is tagged to:
            </p>
            <div className="flex flex-wrap gap-4">
              {[mla, mp].filter(Boolean).map((p) => (
                <Link
                  key={p.id}
                  href={`/politician/${encodeURIComponent(p.state)}/${p.slug}`}
                  className="flex items-center gap-3 bg-[#111] border border-[#2a2a2a] rounded-lg px-4 py-3 hover:border-[#3a3a3a] transition-colors group min-w-[200px]"
                >
                  {p.photo_url ? (
                    <img src={p.photo_url} alt={p.name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center text-[#3a3a3a] font-serif">
                      {p.name[0]}
                    </div>
                  )}
                  <div>
                    <p className="text-[11px] text-[#4a4a4a]">{p.level} · {p.party}</p>
                    <p className="text-[14px] font-semibold text-[#d0d0d0] group-hover:text-white transition-colors">
                      {p.name}
                    </p>
                    <p className="text-[11px] text-[#3b82f6] group-hover:underline mt-0.5">
                      View promise record →
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ─── Actions ─── */}
        <div className="flex flex-wrap gap-4 mb-10">
          {/* Upvote */}
          <div>
            {!showUpvoteInput && !upvoted ? (
              <button
                className="btn-ghost text-sm py-2.5 flex items-center gap-2"
                onClick={() => setShowUpvoteInput(true)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                I've seen this too — <span className="font-mono">{localUpvotes}</span>
              </button>
            ) : upvoted ? (
              <div className="btn-ghost text-sm py-2.5 border-[#22c55e]/30 text-[#22c55e] cursor-default">
                ✓ Upvoted · <span className="font-mono">{localUpvotes}</span>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="email"
                  className="input text-sm py-2 w-48"
                  placeholder="your@email.com"
                  value={upvoteEmail}
                  onChange={(e) => setUpvoteEmail(e.target.value)}
                  autoFocus
                />
                <button className="btn-primary text-sm py-2" onClick={handleUpvote} disabled={upvoting || !upvoteEmail}>
                  {upvoting ? '…' : '✓'}
                </button>
                <button className="btn-ghost text-sm py-2" onClick={() => setShowUpvoteInput(false)}>×</button>
              </div>
            )}
          </div>

          {/* Share */}
          <button
            className="btn-ghost text-sm py-2.5 flex items-center gap-2"
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: issue.title, url: window.location.href });
              } else {
                navigator.clipboard.writeText(window.location.href);
                alert('Link copied!');
              }
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Share
          </button>

          {/* Report */}
          <button
            className="btn-ghost text-sm py-2.5 text-[#3a3a3a] hover:text-[#ef4444] hover:border-[#ef4444]/30 ml-auto"
            onClick={() => setShowReport(true)}
          >
            Report as fake ⚑
          </button>
        </div>

        {/* Back link */}
        <Link href="/issues" className="text-[12px] text-[#4a4a4a] hover:text-white transition-colors">
          ← Back to all issues
        </Link>
      </div>

      {showReport && (
        <ReportModal type="issue" id={issue.id} onClose={() => setShowReport(false)} />
      )}
    </div>
  );
}
