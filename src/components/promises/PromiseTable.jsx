'use client';

import { useState } from 'react';
import Link from 'next/link';
import { StatusBadge, CategoryPill } from '@/components/ui/StatusBadge';
import ReportModal from './ReportModal';
import { format } from 'date-fns';

// Mobile card for a single promise
function PromiseCard({ p, showPolitician, onReport }) {
  return (
    <div className="border-b border-[#1a1a1a] py-4 last:border-b-0">
      {/* Top row: status + date */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <StatusBadge status={p.status} />
          <CategoryPill category={p.promise_category} type="promise" />
        </div>
        <span className="text-[11px] text-[#4a4a4a]">
          {p.date_made ? format(new Date(p.date_made), 'dd MMM yy') : ''}
        </span>
      </div>

      {/* Promise text */}
      <Link
        href={`/promise/${p.id}/${p.slug}`}
        className="block text-[14px] text-[#d0d0d0] leading-snug mb-1 hover:text-white transition-colors"
      >
        {p.promise_text}
      </Link>

      {p.evidence_text && (
        <p className="text-[12px] text-[#5a5a5a] mb-1">↳ {p.evidence_text}</p>
      )}

      {/* Bottom row: politician + source + report */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2 text-[11px] text-[#5a5a5a]">
          {showPolitician && (
            <Link
              href={`/politician/${encodeURIComponent(p.state)}/${p.politician?.slug}`}
              className="text-[#8a8a8a] hover:text-white transition-colors font-medium"
            >
              {p.politician_name}
            </Link>
          )}
          {showPolitician && <span>·</span>}
          <span>{p.source}</span>
          {p.source_url && (
            <a href={p.source_url} target="_blank" rel="noreferrer" className="text-[#3b82f6]">↗</a>
          )}
        </div>
        <button
          onClick={() => onReport(p.id)}
          className="text-[#3a3a3a] hover:text-[#ef4444] transition-colors text-xs"
          title="Report as inaccurate"
        >
          ⚑
        </button>
      </div>
    </div>
  );
}

export default function PromiseTable({ promises, showPolitician = false }) {
  const [reportTarget, setReportTarget] = useState(null);

  if (!promises?.length) {
    return (
      <div className="py-12 text-center text-[#3a3a3a] font-sans text-sm">
        No promises found.
      </div>
    );
  }

  return (
    <>
      {/* ── MOBILE: card list (< md) ── */}
      <div className="md:hidden">
        {promises.map((p) => (
          <PromiseCard
            key={p.id}
            p={p}
            showPolitician={showPolitician}
            onReport={setReportTarget}
          />
        ))}
      </div>

      {/* ── DESKTOP: data table (≥ md) ── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              {showPolitician && <th style={{ width: '16%' }}>Politician</th>}
              <th>Promise</th>
              <th style={{ width: '12%' }}>Category</th>
              <th style={{ width: '10%' }}>Source</th>
              <th style={{ width: '9%' }}>Date</th>
              <th style={{ width: '11%' }}>Status</th>
              <th style={{ width: '4%' }} />
            </tr>
          </thead>
          <tbody>
            {promises.map((p) => (
              <tr key={p.id}>
                {showPolitician && (
                  <td>
                    <Link
                      href={`/politician/${encodeURIComponent(p.state)}/${p.politician?.slug}`}
                      className="text-[#c0c0c0] hover:text-white font-medium text-sm transition-colors"
                    >
                      {p.politician_name}
                    </Link>
                    <div className="text-[11px] text-[#5a5a5a] mt-0.5">{p.party}</div>
                  </td>
                )}
                <td className="max-w-xs">
                  <Link
                    href={`/promise/${p.id}/${p.slug}`}
                    className="text-[#d0d0d0] hover:text-white text-[13.5px] leading-snug line-clamp-2 transition-colors"
                  >
                    {p.promise_text}
                  </Link>
                  {p.evidence_text && (
                    <p className="text-[11px] text-[#5a5a5a] mt-1 line-clamp-1">↳ {p.evidence_text}</p>
                  )}
                </td>
                <td><CategoryPill category={p.promise_category} type="promise" /></td>
                <td>
                  <span className="text-[12px] text-[#5a5a5a]">{p.source}</span>
                  {p.source_url && (
                    <a href={p.source_url} target="_blank" rel="noreferrer"
                       className="block text-[11px] text-[#3b82f6] hover:underline truncate max-w-[100px]">
                      source ↗
                    </a>
                  )}
                </td>
                <td className="text-[12px] text-[#5a5a5a] whitespace-nowrap">
                  {p.date_made ? format(new Date(p.date_made), 'dd MMM yy') : '—'}
                </td>
                <td><StatusBadge status={p.status} /></td>
                <td>
                  <button
                    onClick={() => setReportTarget(p.id)}
                    className="text-[#3a3a3a] hover:text-[#ef4444] transition-colors text-xs"
                    title="Report as inaccurate"
                  >⚑</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {reportTarget && (
        <ReportModal type="promise" id={reportTarget} onClose={() => setReportTarget(null)} />
      )}
    </>
  );
}
