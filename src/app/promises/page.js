'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getPromises, getConstituenciesByState } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';
import PromiseTable from '@/components/promises/PromiseTable';

const CATEGORIES = ['Infrastructure','Water','Employment','Health','Education','Electricity','Women Safety','Agriculture','Other'];
const STATUSES   = ['Kept','In Progress','Partially Kept','Broken','Expired','Unverified'];
const STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Delhi','Puducherry',
];

export default function PromisesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [state, setState] = useState(searchParams.get('state') ?? '');
  const [constituency, setConstituency] = useState(searchParams.get('constituency') ?? '');
  const [category, setCategory] = useState(searchParams.get('category') ?? '');
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [page, setPage] = useState(parseInt(searchParams.get('page') ?? '1', 10));

  const [constituencies, setConstituencies] = useState([]);
  const [promises, setPromises] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const limit = 50;
  const totalPages = Math.ceil(total / limit);

  // Load constituencies when state changes
  useEffect(() => {
    if (!state) { setConstituencies([]); setConstituency(''); return; }
    getConstituenciesByState(state)
      .then(setConstituencies)
      .catch(() => setConstituencies([]));
    setConstituency(''); // reset constituency when state changes
  }, [state]);

  // Load promises when any filter changes
  useEffect(() => {
    setLoading(true);
    getPromises({
      state: state || undefined,
      constituency: constituency || undefined,
      category: category || undefined,
      status: status || undefined,
      limit,
      offset: (page - 1) * limit,
    }).then(({ data, total: t }) => {
      setPromises(data ?? []);
      setTotal(t ?? 0);
    }).catch(() => {
      setPromises([]);
      setTotal(0);
    }).finally(() => setLoading(false));
  }, [state, constituency, category, status, page]);

  function clearFilters() {
    setState(''); setConstituency(''); setCategory(''); setStatus(''); setPage(1);
  }

  const hasFilters = state || constituency || category || status;

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <Navbar active="promises"/>
      <div className="max-w-content mx-auto px-4 py-10">
        <div className="mb-8 pb-6 border-b border-[#1f1f1f]">
          <h1 className="font-serif text-3xl font-bold text-white mb-1">Promise Tracker</h1>
          <p className="text-[#5a5a5a] text-sm">{total.toLocaleString()} promises tracked</p>
        </div>

        {/* ── FILTERS ── */}
        <div className="flex flex-wrap gap-3 mb-4">
          {/* State */}
          <select
            value={state}
            onChange={e => { setState(e.target.value); setPage(1); }}
            className="input select w-auto text-sm py-2 min-w-[150px]"
          >
            <option value="">All States</option>
            {STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Constituency — appears only when a state is selected */}
          {state && (
            <select
              value={constituency}
              onChange={e => { setConstituency(e.target.value); setPage(1); }}
              className="input select w-auto text-sm py-2 min-w-[200px]"
            >
              <option value="">All Constituencies</option>
              {constituencies.map(c => (
                <option key={c.id} value={c.name}>
                  {c.name} ({c.type === 'LS' ? 'Lok Sabha' : 'Vidhan Sabha'})
                </option>
              ))}
            </select>
          )}

          {/* Category */}
          <select
            value={category}
            onChange={e => { setCategory(e.target.value); setPage(1); }}
            className="input select w-auto text-sm py-2 min-w-[140px]"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Status */}
          <select
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="input select w-auto text-sm py-2 min-w-[140px]"
          >
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="btn-ghost py-2 text-sm text-[#ef4444] border-[#ef4444]/30 hover:border-[#ef4444]/60"
            >
              Clear
            </button>
          )}
        </div>

        {/* Active filter badges */}
        {hasFilters && (
          <div className="flex flex-wrap gap-2 mb-6">
            {state        && <span className="badge badge-unverified">{state}</span>}
            {constituency && <span className="badge badge-unverified">{constituency}</span>}
            {category     && <span className="badge badge-progress">{category}</span>}
            {status       && <span className="badge badge-kept">{status}</span>}
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="py-20 text-center text-[#3a3a3a] text-sm">Loading…</div>
        ) : (
          <PromiseTable promises={promises} showPolitician/>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center gap-4 mt-10 pt-6 border-t border-[#1f1f1f]">
            {page > 1 && (
              <button onClick={() => setPage(p => p - 1)} className="btn-ghost text-sm py-2">
                ← Previous
              </button>
            )}
            <span className="text-[#5a5a5a] text-sm ml-auto">Page {page} of {totalPages}</span>
            {page < totalPages && (
              <button onClick={() => setPage(p => p + 1)} className="btn-ghost text-sm py-2">
                Next →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
