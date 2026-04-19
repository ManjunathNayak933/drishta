'use client';

import { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import PromiseScore from '@/components/promises/PromiseScore';
import { searchPoliticians, getPromisesByPolitician, getParliamentPerformance } from '@/lib/api';

const STATUSES = ['Kept','In Progress','Partially Kept','Broken','Expired','Unverified'];
const COLORS = {
  'Kept': '#22c55e', 'In Progress': '#f59e0b', 'Partially Kept': '#a855f7',
  'Broken': '#ef4444', 'Expired': '#6b7280', 'Unverified': '#3b82f6',
};

function countByStatus(promises) {
  const counts = {};
  for (const p of promises ?? []) counts[p.status] = (counts[p.status] ?? 0) + 1;
  return counts;
}

function PoliticianSearchSlot({ label, onSelect, filterLevel }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  async function search(q) {
    setQuery(q);
    if (q.length < 2) { setResults([]); return; }
    let r = await searchPoliticians(q).catch(() => []);
    // Filter to same level if filterLevel is set
    if (filterLevel) r = r.filter(p => p.level === filterLevel);
    setResults(r);
  }

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] tracking-[0.18em] uppercase text-[#4a4a4a]">{label}</p>
        {filterLevel && (
          <span className="text-[10px] px-2 py-0.5 rounded"
            style={{ color: filterLevel === 'MP' ? '#3b82f6' : '#f59e0b',
                     background: filterLevel === 'MP' ? '#3b82f620' : '#f59e0b20' }}>
            {filterLevel} only
          </span>
        )}
      </div>
      <input
        className="input text-sm"
        placeholder={filterLevel ? `Search ${filterLevel}…` : 'Search politician…'}
        value={query}
        onChange={(e) => search(e.target.value)}
      />
      {results.length > 0 && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg max-h-48 overflow-y-auto shadow-xl">
          {results.map((p) => (
            <button key={p.id}
              className="w-full text-left px-4 py-2.5 text-sm text-[#d0d0d0] hover:bg-[#222] transition-colors"
              onClick={() => { onSelect(p); setQuery(p.name); setResults([]); }}>
              <span className="font-medium">{p.name}</span>
              <span className="text-[11px] text-[#5a5a5a] ml-2">{p.level} · {p.state}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PoliticianPanel({ pol, promises, perf }) {
  const counts = countByStatus(promises);
  if (!pol) {
    return (
      <div className="bg-[#0a0a0a] border border-[#1f1f1f] p-6 flex items-center justify-center text-[#2a2a2a] text-sm min-h-[200px]">
        Select a politician above
      </div>
    );
  }

  const levelColor = pol.level === 'MP' ? '#3b82f6' : '#f59e0b';

  return (
    <div className="bg-[#111] border border-[#1f1f1f] rounded-lg divide-y divide-[#1f1f1f]">
      {/* Header */}
      <div className="p-5 flex items-start gap-4">
        {pol.photo_url && (
          <img src={pol.photo_url} alt={pol.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono"
              style={{ color: levelColor, background: levelColor + '20' }}>{pol.level}</span>
          </div>
          <h2 className="font-serif text-base font-bold text-white leading-tight truncate">{pol.name}</h2>
          <p className="text-[12px] text-[#5a5a5a] mt-0.5 truncate">{pol.party}</p>
          <p className="text-[11px] text-[#3a3a3a]">{pol.constituency_name}, {pol.state}</p>
          <PromiseScore score={pol.promise_score} count={pol.promise_count} inline />
        </div>
      </div>

      {/* Score */}
      <div className="p-5 flex justify-center">
        <PromiseScore score={pol.promise_score} count={pol.promise_count} />
      </div>

      {/* Promise breakdown */}
      <div className="p-5">
        <p className="text-[10px] tracking-wider uppercase text-[#4a4a4a] mb-3">Promise Breakdown</p>
        {STATUSES.map((s) => (
          <div key={s} className="flex items-center justify-between py-1.5 border-b border-[#1a1a1a] last:border-0 text-[12px]">
            <span className="text-[#6a6a6a]">{s}</span>
            <span className="font-mono font-bold" style={{ color: COLORS[s] }}>{counts[s] ?? 0}</span>
          </div>
        ))}
      </div>

      {/* Parliament performance */}
      {perf && (perf.attendance_pct || perf.questions_asked || perf.debates_count) && (
        <div className="p-5">
          <p className="text-[10px] tracking-wider uppercase text-[#4a4a4a] mb-3">Parliament Performance</p>
          {perf.term && <p className="text-[11px] text-[#3a3a3a] mb-2">{perf.term}</p>}
          {[
            { key: 'attendance_pct', label: 'Attendance', suffix: '%' },
            { key: 'questions_asked', label: 'Questions asked', suffix: '' },
            { key: 'debates_count', label: 'Debates', suffix: '' },
            { key: 'bills_introduced', label: 'Bills introduced', suffix: '' },
          ].filter(({ key }) => perf[key] != null && perf[key] > 0).map(({ key, label, suffix }) => (
            <div key={key} className="flex items-center justify-between py-1.5 border-b border-[#1a1a1a] last:border-0 text-[12px]">
              <span className="text-[#6a6a6a]">{label}</span>
              <span className="font-mono font-bold text-white">{perf[key]}{suffix}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const LEVEL_OPTIONS = [
  { value: '', label: 'Any (MLA or MP)' },
  { value: 'MLA', label: 'MLAs only' },
  { value: 'MP',  label: 'MPs only' },
];

export default function ComparePage() {
  const [levelFilter, setLevelFilter] = useState('MLA');
  const [polA, setPolA] = useState(null);
  const [polB, setPolB] = useState(null);
  const [promisesA, setPromisesA] = useState([]);
  const [promisesB, setPromisesB] = useState([]);
  const [perfA, setPerfA] = useState(null);
  const [perfB, setPerfB] = useState(null);

  // Reset selections when filter changes
  function handleFilterChange(val) {
    setLevelFilter(val);
    setPolA(null); setPolB(null);
    setPromisesA([]); setPromisesB([]);
    setPerfA(null); setPerfB(null);
  }

  async function selectA(p) {
    setPolA(p);
    const [proms, perf] = await Promise.all([
      getPromisesByPolitician(p.id, { limit: 200 }).catch(() => []),
      getParliamentPerformance(p.id).catch(() => null),
    ]);
    setPromisesA(proms); setPerfA(perf);
  }

  async function selectB(p) {
    setPolB(p);
    const [proms, perf] = await Promise.all([
      getPromisesByPolitician(p.id, { limit: 200 }).catch(() => []),
      getParliamentPerformance(p.id).catch(() => null),
    ]);
    setPromisesB(proms); setPerfB(perf);
  }

  // Warning if levels differ
  const levelMismatch = polA && polB && polA.level !== polB.level;

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <Navbar active="promises" />
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="mb-8 pb-6 border-b border-[#1f1f1f]">
          <h1 className="font-serif text-3xl font-bold text-white mb-1">Compare Politicians</h1>
          <p className="text-[#5a5a5a] text-sm">Side-by-side promise record and parliament performance</p>
        </div>

        {/* Level filter */}
        <div className="mb-6">
          <p className="text-[10px] uppercase tracking-wider text-[#4a4a4a] mb-2">Compare</p>
          <div className="flex gap-2 flex-wrap">
            {LEVEL_OPTIONS.map(({ value, label }) => (
              <button key={value} onClick={() => handleFilterChange(value)}
                className={`px-3 py-1.5 text-[12px] rounded transition-colors border ${
                  levelFilter === value
                    ? 'bg-white text-black border-white font-medium'
                    : 'bg-transparent text-[#5a5a5a] border-[#2a2a2a] hover:border-[#3a3a3a] hover:text-white'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Level mismatch warning */}
        {levelMismatch && (
          <div className="mb-4 bg-[#f59e0b]/10 border border-[#f59e0b]/20 rounded-lg p-3">
            <p className="text-[12px] text-[#f59e0b]">
              ⚠ You are comparing an {polA.level} with an {polB.level}. This may not be a fair comparison — their roles, responsibilities, and performance metrics are different.
            </p>
          </div>
        )}

        {/* Search */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <PoliticianSearchSlot label="Politician A" onSelect={selectA} filterLevel={levelFilter} />
          <PoliticianSearchSlot label="Politician B" onSelect={selectB} filterLevel={levelFilter} />
        </div>

        {/* Panels */}
        {(polA || polB) ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PoliticianPanel pol={polA} promises={promisesA} perf={perfA} />
            <PoliticianPanel pol={polB} promises={promisesB} perf={perfB} />
          </div>
        ) : (
          <div className="py-20 text-center">
            <p className="font-serif text-xl text-[#2a2a2a]">
              Search for two {levelFilter || 'politicians'} to compare.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
