'use client';

import { useState } from 'react';
import Link from 'next/link';
import { StatusBadge, CategoryPill } from '@/components/ui/StatusBadge';
import { formatDistanceToNow } from 'date-fns';

function DisputeModal({ issue, onClose }) {
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!email || !reason) { setError('Email and reason are required'); return; }
    setSubmitting(true); setError('');
    try {
      // Upload proof photo if provided
      let proof_url = null;
      if (proofFile) {
        const { supabase } = await import('@/lib/supabase');
        const path = `dispute-proof/${Date.now()}-${proofFile.name}`;
        const { data: upload } = await supabase.storage.from('uploads').upload(path, proofFile);
        if (upload) {
          const { data: url } = supabase.storage.from('uploads').getPublicUrl(path);
          proof_url = url.publicUrl;
        }
      }

      const res = await fetch('/api/dispute-resolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issue_id: issue.id, reporter_email: email, reason, proof_url }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDone(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6">
        {done ? (
          <div className="text-center py-4">
            <p className="text-2xl mb-3">✓</p>
            <p className="text-white font-medium mb-1">Report submitted</p>
            <p className="text-[#5a5a5a] text-sm mb-4">Our team will review this and revert the status if the resolution is found to be false.</p>
            <button onClick={onClose} className="btn-ghost text-sm py-2 px-4">Close</button>
          </div>
        ) : (
          <>
            <h3 className="font-serif text-lg font-bold text-white mb-1">Report false resolution</h3>
            <p className="text-[#5a5a5a] text-sm mb-4">
              If this issue hasn't actually been resolved, report it here. Admin will review and revert if valid.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">Your email *</label>
                <input className="input py-2 text-sm" placeholder="your@email.com"
                  value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">Why is this resolution false? *</label>
                <textarea className="input py-2 text-sm resize-none" rows={3}
                  placeholder="Describe why the issue is not actually resolved…"
                  value={reason} onChange={e => setReason(e.target.value)} />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">
                  Photo proof (recommended)
                </label>
                <div onClick={() => document.getElementById('dispute-proof').click()}
                  className={`border border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors ${
                    proofFile ? 'border-[#22c55e]/40 bg-[#22c55e]/5' : 'border-[#2a2a2a] hover:border-[#3a3a3a]'
                  }`}>
                  <input id="dispute-proof" type="file" accept="image/*" className="hidden"
                    onChange={e => setProofFile(e.target.files?.[0] ?? null)} />
                  {proofFile
                    ? <p className="text-[#22c55e] text-sm">{proofFile.name}</p>
                    : <p className="text-[#4a4a4a] text-sm">Upload photo showing issue still exists</p>
                  }
                </div>
              </div>
              {error && <p className="text-[12px] text-[#ef4444] bg-[#ef4444]/10 border border-[#ef4444]/20 rounded px-3 py-2">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button onClick={onClose} className="btn-ghost text-sm py-2 flex-1 justify-center">Cancel</button>
                <button onClick={handleSubmit} disabled={submitting}
                  className="btn-primary text-sm py-2 flex-1 justify-center">
                  {submitting ? 'Submitting…' : 'Submit Report'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function IssueCard({ issue }) {
  const [showDispute, setShowDispute] = useState(false);

  const timeAgo = issue.created_at
    ? formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })
    : '';

  const isResolved = issue.status === 'Resolved';
  const hasActionTag = !!issue.action_tag;

  return (
    <>
      <div className="group block bg-[#0f0f0f] border border-[#1f1f1f] hover:border-[#2a2a2a] transition-colors overflow-hidden">
        <Link href={`/issue/${issue.id}/${issue.slug}`}>
          {/* Cover photo */}
          <div className="relative aspect-[16/9] bg-[#141414] overflow-hidden">
            <img src={issue.photo_url} alt={issue.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
            <div className="absolute bottom-2 left-2">
              <CategoryPill category={issue.category} type="issue" />
            </div>
            {/* MLA/MP Action tag */}
            {hasActionTag && (
              <div className="absolute top-2 right-2 bg-[#22c55e] text-black text-[10px] font-bold px-2 py-0.5 rounded-full">
                {issue.action_tag}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <StatusBadge status={issue.status} />
              <span className="text-[11px] text-[#4a4a4a] whitespace-nowrap">{timeAgo}</span>
            </div>

            <h3 className="font-serif text-[15px] font-semibold text-[#e0e0e0] group-hover:text-white leading-snug mb-2 line-clamp-2">
              {issue.title}
            </h3>

            {/* Resolution info */}
            {isResolved && issue.resolved_by_politician_name && (
              <div className="bg-[#22c55e]/10 border border-[#22c55e]/20 rounded px-2.5 py-1.5 mb-2">
                <p className="text-[11px] text-[#22c55e]">
                  ✓ Resolved by {issue.resolved_by_politician_name}
                </p>
                {issue.resolution_note && (
                  <p className="text-[11px] text-[#5a8a6a] mt-0.5 line-clamp-1">{issue.resolution_note}</p>
                )}
              </div>
            )}

            {/* Tagged politicians */}
            {(issue.mla_name || issue.mp_name) && (
              <div className="flex flex-wrap gap-x-3 gap-y-1 mb-2">
                {issue.mla_name && (
                  <span className="text-[11px] text-[#5a5a5a]">
                    MLA: <span className="text-[#8a8a8a]">{issue.mla_name}</span>
                  </span>
                )}
                {issue.mp_name && (
                  <span className="text-[11px] text-[#5a5a5a]">
                    MP: <span className="text-[#8a8a8a]">{issue.mp_name}</span>
                  </span>
                )}
              </div>
            )}

            {/* Tagged ministers */}
            {issue.minister_names?.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {issue.minister_names.map((name, i) => (
                  <span key={i} className="text-[10px] px-1.5 py-0.5 rounded border border-[#22c55e]/20 text-[#22c55e] bg-[#22c55e]/5">
                    ⚑ {name}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between text-[11px] text-[#4a4a4a] pt-2 border-t border-[#1a1a1a]">
              <span>{issue.constituency_name}, {issue.state}</span>
              <span className="flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {issue.upvote_count ?? 0}
              </span>
            </div>
          </div>
        </Link>

        {/* Dispute button — only on resolved issues */}
        {isResolved && (
          <div className="px-4 pb-3">
            <button onClick={() => setShowDispute(true)}
              className="w-full text-[11px] text-[#5a5a5a] hover:text-[#ef4444] border border-[#1a1a1a] hover:border-[#ef4444]/30 rounded py-1.5 transition-colors">
              Not resolved? Report
            </button>
          </div>
        )}
      </div>

      {showDispute && <DisputeModal issue={issue} onClose={() => setShowDispute(false)} />}
    </>
  );
}
