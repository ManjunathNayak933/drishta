'use client';

export const runtime = 'edge';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getPromiseById } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';
import { StatusBadge, CategoryPill } from '@/components/ui/StatusBadge';
import ReportModal from '@/components/promises/ReportModal';
import { format } from 'date-fns';

export default function PromisePage() {
  const { id } = useParams();
  const [promise, setPromise] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    getPromiseById(id)
      .then(setPromise)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-[#3a3a3a] text-sm">Loading…</div>
      </div>
    );
  }

  if (!promise) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center text-center px-4">
        <div>
          <p className="text-[#3a3a3a] mb-4">Promise not found or removed.</p>
          <Link href="/promises" className="btn-ghost text-sm py-2">← Back to Promises</Link>
        </div>
      </div>
    );
  }

  const pol = promise.politician;
  const polHref = pol
    ? `/politician/${encodeURIComponent(pol.state)}/${pol.slug}`
    : null;

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <Navbar active="promises"/>

      <div className="max-w-article mx-auto px-4 py-10">
        {/* Breadcrumb */}
        <nav className="text-[11px] text-[#4a4a4a] mb-8 flex items-center gap-2">
          <Link href="/promises" className="hover:text-[#9a9a9a]">Promises</Link>
          <span>/</span>
          {polHref && (
            <>
              <Link href={polHref} className="hover:text-[#9a9a9a]">{promise.politician_name}</Link>
              <span>/</span>
            </>
          )}
          <span className="text-[#7a7a7a]">Promise</span>
        </nav>

        {/* Header */}
        <div className="mb-8 pb-8 border-b border-[#1f1f1f]">
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <StatusBadge status={promise.status}/>
            <CategoryPill category={promise.promise_category} type="promise"/>
          </div>

          <blockquote className="font-serif text-[1.5rem] font-semibold text-white leading-[1.35] mb-5">
            "{promise.promise_text}"
          </blockquote>

          {/* Politician attribution */}
          <div className="flex items-center gap-3">
            {pol?.photo_url && (
              <img src={pol.photo_url} alt={pol.name} className="w-10 h-10 rounded-full object-cover"/>
            )}
            <div>
              {polHref ? (
                <Link href={polHref} className="font-semibold text-[#c0c0c0] hover:text-white transition-colors text-sm">
                  {promise.politician_name}
                </Link>
              ) : (
                <span className="font-semibold text-[#c0c0c0] text-sm">{promise.politician_name}</span>
              )}
              <p className="text-[12px] text-[#5a5a5a]">
                {promise.party} · {promise.politician_level}
                {promise.constituency_name && ` · ${promise.constituency_name}, ${promise.state}`}
              </p>
            </div>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 pb-8 border-b border-[#1f1f1f]">
          {[
            ['Source', promise.source],
            ['Date Made', promise.date_made ? format(new Date(promise.date_made), 'dd MMM yyyy') : '—'],
            ['Category', promise.promise_category],
            ['Verified', promise.verified ? 'Yes' : 'Pending review'],
          ].map(([label, value]) => (
            <div key={label} className="bg-[#111] border border-[#1f1f1f] p-4">
              <p className="text-[10px] tracking-[0.12em] uppercase text-[#4a4a4a] mb-1">{label}</p>
              <p className="text-[13px] text-[#c0c0c0]">{value}</p>
            </div>
          ))}
        </div>

        {/* Source */}
        {(promise.source_url || promise.source_description) && (
          <section className="mb-8 pb-8 border-b border-[#1f1f1f]">
            <h2 className="text-[10px] tracking-[0.15em] uppercase text-[#4a4a4a] mb-3">Source</h2>
            {promise.source_description && (
              <p className="text-sm text-[#9a9a9a] mb-2">{promise.source_description}</p>
            )}
            {promise.source_url && (
              <a href={promise.source_url} target="_blank" rel="noopener noreferrer"
                className="text-[#3b82f6] text-sm hover:underline break-all">
                {promise.source_url} ↗
              </a>
            )}
          </section>
        )}

        {/* Evidence */}
        {(promise.evidence_text || promise.evidence_url) && (
          <section className="mb-8 pb-8 border-b border-[#1f1f1f]">
            <h2 className="text-[10px] tracking-[0.15em] uppercase text-[#4a4a4a] mb-3">
              Status Evidence
            </h2>
            <div className="border-l-2 pl-4" style={{
              borderColor: promise.status === 'Kept' ? '#22c55e'
                : promise.status === 'Broken' ? '#ef4444' : '#f59e0b'
            }}>
              {promise.evidence_text && (
                <p className="text-sm text-[#b0b0b0] leading-relaxed mb-2">{promise.evidence_text}</p>
              )}
              {promise.evidence_url && (
                <a href={promise.evidence_url} target="_blank" rel="noreferrer"
                  className="text-[#3b82f6] text-sm hover:underline">
                  View evidence ↗
                </a>
              )}
            </div>
          </section>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 flex-wrap">
          {polHref && (
            <Link href={polHref} className="btn-ghost text-sm py-2">
              ← All {promise.politician_name} promises
            </Link>
          )}
          <button
            onClick={() => setShowReport(true)}
            className="text-[12px] text-[#3a3a3a] hover:text-[#ef4444] transition-colors ml-auto border border-[#2a2a2a] hover:border-[#ef4444]/40 px-3 py-1.5 rounded"
          >
            Report as inaccurate ⚑
          </button>
        </div>
      </div>

      {showReport && (
        <ReportModal type="promise" id={promise.id} onClose={() => setShowReport(false)}/>
      )}
    </div>
  );
}
