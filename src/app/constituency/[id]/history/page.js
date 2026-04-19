'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getConstituencyById, getMlaHistory, getPoliticiansByConstituency } from '@/lib/api';

const PARTY_COLORS = {
  'BJP': '#f97316', 'Bharatiya Janata Party': '#f97316',
  'INC': '#3b82f6', 'Indian National Congress': '#3b82f6', 'Congress': '#3b82f6',
  'JD': '#8b5cf6', 'JDS': '#8b5cf6', 'Janata Dal': '#8b5cf6',
  'AAP': '#06b6d4', 'Aam Aadmi Party': '#06b6d4',
  'TMC': '#10b981', 'Trinamool': '#10b981',
  'DMK': '#ef4444', 'AIADMK': '#84cc16',
  'SP': '#e11d48', 'Samajwadi': '#e11d48',
  'BSP': '#1d4ed8',
  'CPM': '#dc2626', 'CPI': '#dc2626', 'Communist': '#dc2626',
  'Shiv Sena': '#f59e0b', 'SS': '#f59e0b',
  'NCP': '#0ea5e9',
  'TRS': '#22c55e', 'BRS': '#22c55e',
  'TDP': '#f59e0b',
  'YSR': '#6366f1',
};

function getPartyColor(party) {
  if (!party) return '#3a3a3a';
  for (const [key, color] of Object.entries(PARTY_COLORS)) {
    if (party.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return '#5a5a5a';
}

function getPartyShort(party) {
  if (!party) return '?';
  const map = {
    'Indian National Congress': 'INC', 'Bharatiya Janata Party': 'BJP',
    'Janata Dal': 'JD', 'Aam Aadmi Party': 'AAP', 'Trinamool': 'TMC',
    'Communist Party of India': 'CPI', 'Samajwadi Party': 'SP',
    'Bahujan Samaj Party': 'BSP', 'Shiv Sena': 'SS',
  };
  for (const [long, short] of Object.entries(map)) {
    if (party.toLowerCase().includes(long.toLowerCase())) return short;
  }
  return party.slice(0, 4).toUpperCase();
}

export default function HistoryPage() {
  const params = useParams();
  const constituencyId = params.id;

  const [loading, setLoading] = useState(true);
  const [constituency, setConstituency] = useState(null);
  const [history, setHistory] = useState([]);
  const [currentPols, setCurrentPols] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const [c, h, pols] = await Promise.all([
          getConstituencyById(constituencyId),
          getMlaHistory(constituencyId),
          getPoliticiansByConstituency(constituencyId),
        ]);
        setConstituency(c);
        setHistory(h);
        setCurrentPols(pols);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    if (constituencyId) load();
  }, [constituencyId]);

  if (loading) return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center">
      <div className="animate-pulse text-[#3a3a3a] text-sm">Loading history…</div>
    </div>
  );

  if (!constituency) return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center">
      <p className="text-[#5a5a5a]">Constituency not found.</p>
    </div>
  );

  const currentMLA = currentPols.find(p => p.level === 'MLA');
  const currentMP  = currentPols.find(p => p.level === 'MP');

  // Group history by party to show dominance
  const partyCounts = {};
  history.forEach(h => {
    const p = h.party ?? 'Unknown';
    partyCounts[p] = (partyCounts[p] || 0) + 1;
  });
  const dominantParty = Object.entries(partyCounts).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="min-h-screen bg-[#080808]">
      {/* Header */}
      <div className="border-b border-[#1a1a1a]">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <Link href="/" className="text-[12px] text-[#4a4a4a] hover:text-white transition-colors">
            ← Back
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Constituency title */}
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold text-white">{constituency.name}</h1>
          <p className="text-[#5a5a5a] text-sm mt-1 uppercase tracking-wider">{constituency.state}</p>
          {constituency.formed_year && (
            <p className="text-[#3a3a3a] text-xs mt-1">Constituency formed: {constituency.formed_year}</p>
          )}
        </div>

        {/* Current representatives */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {[{ label: 'Current MLA', pol: currentMLA }, { label: 'Current MP', pol: currentMP }].map(({ label, pol }) => (
            <div key={label} className="bg-[#111] border border-[#1f1f1f] rounded-lg p-4">
              <p className="text-[10px] uppercase tracking-wider text-[#4a4a4a] mb-2">{label}</p>
              {pol ? (
                <>
                  <p className="text-sm font-medium text-white leading-tight">{pol.name}</p>
                  <p className="text-[11px] mt-1" style={{ color: getPartyColor(pol.party) }}>{pol.party ?? '—'}</p>
                </>
              ) : (
                <p className="text-[12px] text-[#3a3a3a] italic">No data</p>
              )}
            </div>
          ))}
        </div>

        {/* Party dominance summary */}
        {history.length > 0 && dominantParty && (
          <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-lg p-4 mb-6">
            <p className="text-[10px] uppercase tracking-wider text-[#4a4a4a] mb-3">Party dominance</p>
            <div className="flex gap-1 h-6 rounded overflow-hidden">
              {Object.entries(partyCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([party, count]) => (
                  <div
                    key={party}
                    title={`${party}: ${count} term${count > 1 ? 's' : ''}`}
                    className="h-full transition-all"
                    style={{
                      width: `${(count / history.length) * 100}%`,
                      background: getPartyColor(party),
                      minWidth: count > 0 ? '4px' : 0,
                    }}
                  />
                ))}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
              {Object.entries(partyCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([party, count]) => (
                  <span key={party} className="text-[11px] flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ background: getPartyColor(party) }}/>
                    <span className="text-[#6a6a6a]">{getPartyShort(party)}</span>
                    <span className="text-[#3a3a3a]">×{count}</span>
                  </span>
                ))}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="mb-6">
          <p className="text-[10px] uppercase tracking-wider text-[#4a4a4a] mb-4">
            Election History {history.length > 0 ? `(${history.length} elections)` : ''}
          </p>

          {history.length === 0 ? (
            <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg p-6 text-center">
              <p className="text-[#3a3a3a] text-sm">No history available yet.</p>
            </div>
          ) : (
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-[23px] top-0 bottom-0 w-px bg-[#1f1f1f]"/>

              <div className="space-y-0">
                {history.map((h, i) => {
                  const color = getPartyColor(h.party);
                  const isCurrent = i === 0;
                  return (
                    <div key={i} className="flex items-start gap-4 pb-5 relative">
                      {/* Year dot */}
                      <div className="flex-shrink-0 w-12 flex flex-col items-center pt-1">
                        <div className="w-3 h-3 rounded-full border-2 z-10"
                          style={{
                            background: isCurrent ? color : '#1a1a1a',
                            borderColor: color,
                          }}
                        />
                        <span className="text-[10px] font-mono text-[#4a4a4a] mt-1">{h.term_year}</span>
                      </div>

                      {/* Content */}
                      <div className={`flex-1 bg-[#0f0f0f] border rounded-lg p-3 ${isCurrent ? 'border-[#2a2a2a]' : 'border-[#181818]'}`}>
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm font-medium ${isCurrent ? 'text-white' : 'text-[#8a8a8a]'}`}>
                            {h.name}
                          </p>
                          {isCurrent && (
                            <span className="text-[10px] px-2 py-0.5 rounded"
                              style={{ color, background: color + '20' }}>
                              Current
                            </span>
                          )}
                        </div>
                        {h.party && (
                          <p className="text-[11px] mt-0.5" style={{ color: isCurrent ? color : '#4a4a4a' }}>
                            {h.party}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Wikipedia source */}
        {constituency.wikipedia_url && (
          <a href={constituency.wikipedia_url} target="_blank" rel="noreferrer"
            className="text-[12px] text-[#3b82f6] hover:underline flex items-center gap-1">
            Full history on Wikipedia ↗
          </a>
        )}
      </div>
    </div>
  );
}
