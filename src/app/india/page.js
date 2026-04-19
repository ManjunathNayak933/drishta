'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getStateGovernment,
  getStateMinisters,
  getStateBudgets,
  getStateAnnouncements,
} from '@/lib/api';
import Navbar from '@/components/layout/Navbar';

const PARTY_COLORS = {
  'BJP': '#f97316', 'Bharatiya Janata Party': '#f97316',
  'INC': '#3b82f6', 'Indian National Congress': '#3b82f6', 'Congress': '#3b82f6',
  'AAP': '#06b6d4', 'SP': '#e11d48', 'BSP': '#1d4ed8',
  'JDU': '#8b5cf6', 'TDP': '#f59e0b', 'NCP': '#0ea5e9',
};

function partyColor(party) {
  if (!party) return '#5a5a5a';
  for (const [k, v] of Object.entries(PARTY_COLORS)) {
    if (party.toLowerCase().includes(k.toLowerCase())) return v;
  }
  return '#5a5a5a';
}

const TABS = ['Overview', 'Ministers', 'Budget', 'Announcements'];
const STATE = 'India'; // Uses same tables with state='India'
const COLOR = '#f97316'; // Saffron for central govt

export default function IndiaGovtPage() {
  const [tab, setTab] = useState('Overview');
  const [loading, setLoading] = useState(true);
  const [govt, setGovt] = useState(null);
  const [ministers, setMinisters] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    Promise.all([
      getStateGovernment(STATE),
      getStateMinisters(STATE),
      getStateBudgets(STATE),
      getStateAnnouncements(STATE),
    ]).then(([g, m, b, a]) => {
      setGovt(g);
      setMinisters(m);
      setBudgets(b);
      setAnnouncements(a);
    }).finally(() => setLoading(false));
  }, []);

  const noData = !govt && ministers.length === 0 && budgets.length === 0 && announcements.length === 0;

  // Group ministers by type
  const pm = ministers.find(m => m.is_cm || m.minister_type === 'Prime Minister');
  const deputyPMs = ministers.filter(m => m.is_deputy_cm);
  const cabinetMinisters = ministers.filter(m => !m.is_cm && !m.is_deputy_cm && m.minister_type !== 'Minister of State' && m.minister_type !== 'Minister of State (Independent Charge)');
  const mosIC = ministers.filter(m => m.minister_type === 'Minister of State (Independent Charge)');
  const mos = ministers.filter(m => m.minister_type === 'Minister of State');

  return (
    <div className="min-h-screen bg-[#080808]">
      <Navbar />

      {/* Header */}
      <div className="border-b border-[#111] bg-[#060606]">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">🇮🇳</span>
            <h1 className="font-serif text-3xl font-black text-white">Government of India</h1>
          </div>
          <p className="text-[#4a4a4a] text-sm pl-11">Central government — Union Cabinet</p>
        </div>

        {/* Tabs */}
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex gap-0 border-b border-transparent -mb-px">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  tab === t
                    ? 'text-white border-[#f97316]'
                    : 'text-[#4a4a4a] border-transparent hover:text-[#8a8a8a]'
                }`}>
                {t}
                {t === 'Ministers' && ministers.length > 0 && (
                  <span className="ml-1.5 text-[10px] text-[#3a3a3a]">{ministers.length}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 rounded-full border-2 border-[#f97316] border-t-transparent animate-spin" />
          </div>
        ) : noData ? (
          <div className="text-center py-20">
            <p className="text-[#3a3a3a] text-sm mb-4">No central government data available yet.</p>
            <p className="text-[#2a2a2a] text-xs">An admin can add data via the admin panel → Ministers section using state = "India"</p>
          </div>
        ) : (
          <>
            {/* OVERVIEW */}
            {tab === 'Overview' && (
              <div className="space-y-5">

                {/* PM hero card */}
                {pm && (
                  <div className="relative overflow-hidden rounded-xl border p-5"
                    style={{ borderColor: COLOR + '30', background: `linear-gradient(135deg, ${COLOR}08 0%, transparent 100%)` }}>
                    <div className="flex items-start gap-4">
                      {pm.photo_url ? (
                        <img src={pm.photo_url} alt={pm.name}
                          className="w-16 h-16 rounded-full object-cover border-2 flex-shrink-0"
                          style={{ borderColor: COLOR + '50' }} />
                      ) : (
                        <div className="w-16 h-16 rounded-full flex-shrink-0 flex items-center justify-center text-2xl font-black border-2"
                          style={{ background: COLOR + '20', borderColor: COLOR + '40', color: COLOR }}>
                          {pm.name?.[0]}
                        </div>
                      )}
                      <div>
                        <span className="text-[9px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-full mb-1.5 inline-block"
                          style={{ background: COLOR + '20', color: COLOR }}>Prime Minister</span>
                        <p className="font-serif text-xl font-bold text-white">{pm.name}</p>
                        {(govt?.ruling_party ?? pm.party) && (
                          <p className="text-sm mt-0.5" style={{ color: COLOR }}>{govt?.ruling_party ?? pm.party}</p>
                        )}
                        {pm.politician?.constituency_name && (
                          <p className="text-[12px] text-[#4a4a4a] mt-0.5">
                            {pm.politician.constituency_name}, {pm.politician.state}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Lok Sabha composition bar */}
                {govt?.majority_seats && govt?.total_seats && (
                  <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-5">
                    <p className="text-[10px] uppercase tracking-wider text-[#4a4a4a] mb-4">Lok Sabha Composition</p>
                    <div className="flex items-end gap-6 mb-4">
                      <div>
                        <p className="font-mono text-3xl font-black" style={{ color: COLOR }}>{govt.majority_seats}</p>
                        <p className="text-[11px] text-[#5a5a5a] mt-0.5">NDA seats</p>
                      </div>
                      <div className="text-[#2a2a2a] text-2xl font-light">of</div>
                      <div>
                        <p className="font-mono text-3xl font-black text-white">{govt.total_seats}</p>
                        <p className="text-[11px] text-[#5a5a5a] mt-0.5">Total seats</p>
                      </div>
                      <div className="flex-1" />
                      <div className="text-right">
                        <p className="font-mono text-2xl font-black" style={{ color: COLOR }}>
                          {Math.round(govt.majority_seats / govt.total_seats * 100)}%
                        </p>
                        <p className="text-[11px] text-[#5a5a5a] mt-0.5">Share</p>
                      </div>
                    </div>
                    <div className="relative h-3 bg-[#1a1a1a] rounded-full overflow-hidden">
                      <div className="absolute top-0 bottom-0 w-px bg-[#3a3a3a] z-10" style={{ left: '50%' }} />
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${Math.min(govt.majority_seats / govt.total_seats * 100, 100)}%`, background: COLOR }} />
                    </div>
                    <div className="flex justify-between text-[10px] text-[#3a3a3a] mt-1.5">
                      <span>0</span>
                      <span>Majority (272)</span>
                      <span>543</span>
                    </div>
                  </div>
                )}

                {/* Alliance + election info */}
                <div className="grid grid-cols-2 gap-3">
                  {govt?.coalition && (
                    <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg p-4">
                      <p className="text-[10px] uppercase tracking-wider text-[#4a4a4a] mb-1">Alliance</p>
                      <p className="text-white font-medium text-sm">{govt.coalition}</p>
                    </div>
                  )}
                  {govt?.election_year && (
                    <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg p-4">
                      <p className="text-[10px] uppercase tracking-wider text-[#4a4a4a] mb-1">Elected in</p>
                      <p className="text-white font-medium text-sm">{govt.election_year}</p>
                    </div>
                  )}
                </div>

                {/* Cabinet summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Cabinet Ministers', value: cabinetMinisters.length },
                    { label: 'MoS (IC)', value: mosIC.length },
                    { label: 'Ministers of State', value: mos.length },
                    { label: 'Total Ministers', value: ministers.length },
                  ].map(s => (
                    <div key={s.label} className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg p-3 text-center">
                      <p className="font-mono text-2xl font-black text-white">{s.value}</p>
                      <p className="text-[10px] text-[#4a4a4a] mt-1 leading-tight">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Quick links */}
                <div className="flex gap-2 flex-wrap">
                  {[
                    { label: 'View Cabinet', tab: 'Ministers' },
                    { label: 'Union Budget', tab: 'Budget' },
                    { label: 'Announcements', tab: 'Announcements' },
                  ].map(({ label, tab: t }) => (
                    <button key={t} onClick={() => setTab(t)}
                      className="text-[12px] px-3 py-1.5 rounded border border-[#2a2a2a] text-[#6a6a6a] hover:text-white hover:border-[#3a3a3a] transition-colors">
                      {label} →
                    </button>
                  ))}
                </div>

                {govt?.last_scraped && (
                  <p className="text-[11px] text-[#2a2a2a] text-center">
                    Last updated {new Date(govt.last_scraped).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                )}
              </div>
            )}

            {/* MINISTERS */}
            {tab === 'Ministers' && (
              <div className="space-y-6">
                {/* PM */}
                {pm && (() => {
                  const polLink = pm.politician?.slug && pm.politician?.state && pm.politician.state !== 'Unknown'
                    ? `/politician/${encodeURIComponent(pm.politician.state)}/${pm.politician.slug}`
                    : null;
                  const card = (
                    <div className="relative overflow-hidden rounded-xl border p-5"
                      style={{ borderColor: COLOR + '30', background: `linear-gradient(135deg, ${COLOR}08 0%, transparent 100%)` }}>
                      <div className="flex items-center gap-4">
                        {pm.photo_url ? (
                          <img src={pm.photo_url} alt={pm.name}
                            className="w-16 h-16 rounded-full object-cover border-2 flex-shrink-0"
                            style={{ borderColor: COLOR + '50' }} />
                        ) : (
                          <div className="w-16 h-16 rounded-full flex-shrink-0 flex items-center justify-center text-2xl font-black border-2"
                            style={{ background: COLOR + '20', borderColor: COLOR + '40', color: COLOR }}>
                            {pm.name?.[0]}
                          </div>
                        )}
                        <div>
                          <span className="text-[9px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-full mb-1.5 inline-block"
                            style={{ background: COLOR + '20', color: COLOR }}>Prime Minister</span>
                          <p className="font-serif text-xl font-bold text-white">{pm.name}</p>
                          {pm.party && <p className="text-sm mt-0.5" style={{ color: COLOR }}>{pm.party}</p>}
                          {pm.politician?.constituency_name && (
                            <p className="text-[12px] text-[#5a5a5a] mt-0.5">
                              {pm.politician.constituency_name}, {pm.politician.state}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                  return polLink ? <Link href={polLink}>{card}</Link> : card;
                })()}

                {/* Cabinet Ministers */}
                {[
                  { label: 'Cabinet Ministers', items: cabinetMinisters },
                  { label: 'Ministers of State (Independent Charge)', items: mosIC },
                  { label: 'Ministers of State', items: mos },
                ].filter(g => g.items.length > 0).map(group => (
                  <div key={group.label}>
                    <p className="text-[10px] uppercase tracking-wider text-[#3a3a3a] mb-3">
                      {group.label} ({group.items.length})
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {group.items.map((m, i) => {
                        const mc = partyColor(m.party);
                        const polLink = m.politician?.slug && m.politician?.state && m.politician.state !== 'Unknown'
                          ? `/politician/${encodeURIComponent(m.politician.state)}/${m.politician.slug}`
                          : null;
                        const card = (
                          <div className="flex items-center gap-3 p-3 bg-[#080808] border border-[#141414] rounded-lg hover:border-[#1f1f1f] transition-colors">
                            <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                              style={{ background: mc + '20', color: mc }}>
                              {m.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white font-medium truncate">{m.name}</p>
                              {m.portfolio && <p className="text-[11px] text-[#4a4a4a] truncate">{m.portfolio}</p>}
                              {m.politician?.constituency_name && (
                                <p className="text-[10px] mt-0.5" style={{ color: mc }}>
                                  MP · {m.politician.constituency_name}
                                </p>
                              )}
                            </div>
                            {m.party && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded flex-shrink-0"
                                style={{ background: mc + '15', color: mc }}>
                                {m.party.split(' ').map(w => w[0]).join('').slice(0, 4)}
                              </span>
                            )}
                          </div>
                        );
                        return polLink
                          ? <Link key={i} href={polLink}>{card}</Link>
                          : <div key={i}>{card}</div>;
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* BUDGET */}
            {tab === 'Budget' && (
              <div>
                {budgets.length === 0 ? (
                  <div className="text-center py-16 text-[#3a3a3a] text-sm">No budget data yet.</div>
                ) : (
                  <div className="space-y-4">
                    {budgets.map((b, i) => (
                      <div key={i} className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-serif text-lg font-bold text-white">Union Budget {b.year}</p>
                            {b.total_outlay && <p className="text-sm mt-0.5" style={{ color: COLOR }}>Total outlay: {b.total_outlay}</p>}
                            {b.presented_by && <p className="text-[12px] text-[#5a5a5a] mt-0.5">Presented by {b.presented_by}</p>}
                          </div>
                          {b.pdf_url && (
                            <a href={b.pdf_url} target="_blank" rel="noreferrer"
                              className="text-[11px] text-[#3b82f6] hover:underline flex-shrink-0">PDF ↗</a>
                          )}
                        </div>
                        {b.key_highlights?.length > 0 && (
                          <ul className="space-y-1.5">
                            {b.key_highlights.map((h, j) => (
                              <li key={j} className="flex gap-2 text-[12px] text-[#7a7a7a]">
                                <span style={{ color: COLOR }}>›</span>{h}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ANNOUNCEMENTS */}
            {tab === 'Announcements' && (
              <div>
                {announcements.length === 0 ? (
                  <div className="text-center py-16 text-[#3a3a3a] text-sm">No announcements yet.</div>
                ) : (
                  <div className="space-y-3">
                    {announcements.map((a, i) => (
                      <div key={i} className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg p-4">
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <p className="text-sm text-[#d0d0d0] font-medium leading-snug">{a.title}</p>
                            {a.summary && <p className="text-[12px] text-[#5a5a5a] mt-1 leading-relaxed">{a.summary}</p>}
                          </div>
                          {a.url && (
                            <a href={a.url} target="_blank" rel="noreferrer"
                              className="text-[#3b82f6] hover:underline text-[11px] flex-shrink-0">↗</a>
                          )}
                        </div>
                        {a.published_at && (
                          <p className="text-[11px] text-[#3a3a3a] mt-2">
                            {new Date(a.published_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
