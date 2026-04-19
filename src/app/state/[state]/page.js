'use client';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  getStateGovernment,
  getStateMinisters,
  getStateBudgets,
  getStateAnnouncements,
} from '@/lib/api';

const PARTY_COLORS = {
  'BJP': '#f97316', 'Bharatiya Janata Party': '#f97316',
  'INC': '#3b82f6', 'Indian National Congress': '#3b82f6', 'Congress': '#3b82f6',
  'AAP': '#06b6d4', 'Aam Aadmi Party': '#06b6d4',
  'TMC': '#10b981', 'Trinamool': '#10b981',
  'DMK': '#ef4444', 'JDS': '#8b5cf6', 'Janata Dal': '#8b5cf6',
  'SP': '#e11d48', 'BSP': '#1d4ed8', 'CPM': '#dc2626', 'CPI': '#dc2626',
  'BRS': '#22c55e', 'TRS': '#22c55e', 'TDP': '#f59e0b',
  'AIADMK': '#84cc16', 'Shiv Sena': '#f59e0b', 'NCP': '#0ea5e9',
};

function partyColor(party) {
  if (!party) return '#5a5a5a';
  for (const [k, v] of Object.entries(PARTY_COLORS)) {
    if (party.toLowerCase().includes(k.toLowerCase())) return v;
  }
  return '#5a5a5a';
}

const TABS = ['Overview', 'Ministers', 'Budget', 'Announcements'];

const CATEGORY_COLORS = {
  'Budget': '#f59e0b', 'Infrastructure': '#3b82f6', 'Welfare': '#22c55e',
  'Health': '#ec4899', 'Education': '#8b5cf6', 'Agriculture': '#84cc16',
  'Law & Order': '#ef4444', 'Policy': '#6b7280',
};

export default function StateGovtPage() {
  const params = useParams();
  const state = decodeURIComponent(params.state);

  const [tab, setTab] = useState('Overview');
  const [loading, setLoading] = useState(true);
  const [govt, setGovt] = useState(null);
  const [ministers, setMinisters] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [noData, setNoData] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [g, m, b, a] = await Promise.all([
          getStateGovernment(state),
          getStateMinisters(state),
          getStateBudgets(state),
          getStateAnnouncements(state),
        ]);
        setGovt(g);
        setMinisters(m);
        setBudgets(b);
        setAnnouncements(a);
        if (!g && !m.length && !b.length && !a.length) setNoData(true);
      } catch (e) {
        console.error(e);
        setNoData(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [state]);

  if (loading) return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center">
      <div className="animate-pulse text-[#3a3a3a] text-sm">Loading state government…</div>
    </div>
  );

  const color = partyColor(govt?.ruling_party);

  return (
    <div className="min-h-screen bg-[#080808]">
      {/* Header */}
      <div className="border-b border-[#1a1a1a] sticky top-0 bg-[#080808] z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="text-[#4a4a4a] hover:text-white transition-colors text-sm">←</Link>
          <div className="flex-1">
            <h1 className="font-serif text-lg font-bold text-white leading-tight">{state}</h1>
            <p className="text-[11px] text-[#4a4a4a]">State Government</p>
          </div>
          {govt?.ruling_party && (
            <span className="text-[11px] px-2 py-1 rounded"
              style={{ color, background: color + '20' }}>
              {govt.ruling_party}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="max-w-2xl mx-auto px-4 flex gap-0 overflow-x-auto">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-[12px] font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === t
                  ? 'border-white text-white'
                  : 'border-transparent text-[#4a4a4a] hover:text-[#9a9a9a]'
              }`}>
              {t}
              {t === 'Ministers' && ministers.length > 0 && (
                <span className="ml-1.5 text-[10px] text-[#3a3a3a]">{ministers.length}</span>
              )}
              {t === 'Announcements' && announcements.length > 0 && (
                <span className="ml-1.5 text-[10px] text-[#3a3a3a]">{announcements.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">

        {noData && (
          <div className="text-center py-16 border border-[#1a1a1a] rounded-lg">
            <p className="text-[#5a5a5a] text-sm">No data available for {state} yet.</p>
          </div>
        )}

        {/* OVERVIEW TAB */}
        {tab === 'Overview' && !noData && (
          <div className="space-y-5">

            {/* CM + Deputy CM hero cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* CM */}
              {(govt?.chief_minister || ministers.find(m => m.is_cm)) && (() => {
                const cm = ministers.find(m => m.is_cm);
                const cmName = govt?.chief_minister ?? cm?.name;
                return (
                  <div className="relative overflow-hidden rounded-xl border p-5"
                    style={{ borderColor: color + '30', background: `linear-gradient(135deg, ${color}08 0%, transparent 100%)` }}>
                    <div className="flex items-start gap-4">
                      {cm?.photo_url ? (
                        <img src={cm.photo_url} alt={cmName}
                          className="w-14 h-14 rounded-full object-cover flex-shrink-0 border-2"
                          style={{ borderColor: color + '40' }} />
                      ) : (
                        <div className="w-14 h-14 rounded-full flex-shrink-0 flex items-center justify-center text-xl font-bold border-2"
                          style={{ background: color + '20', borderColor: color + '40', color }}>
                          {cmName?.[0]}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="text-[9px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-full mb-2 inline-block"
                          style={{ background: color + '20', color }}>Chief Minister</span>
                        <p className="font-serif text-lg font-bold text-white leading-tight">{cmName}</p>
                        {(govt?.ruling_party ?? cm?.party) && (
                          <p className="text-[12px] mt-0.5" style={{ color }}>{govt?.ruling_party ?? cm?.party}</p>
                        )}
                        {cm?.constituency && (
                          <p className="text-[11px] text-[#4a4a4a] mt-0.5">{cm.constituency}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Deputy CM */}
              {ministers.find(m => m.is_deputy_cm) && (() => {
                const dcm = ministers.find(m => m.is_deputy_cm);
                const dcmColor = partyColor(dcm.party);
                return (
                  <div className="relative overflow-hidden rounded-xl border border-[#2a2a2a] p-5 bg-[#0a0a0a]">
                    <div className="flex items-start gap-4">
                      {dcm.photo_url ? (
                        <img src={dcm.photo_url} alt={dcm.name}
                          className="w-14 h-14 rounded-full object-cover flex-shrink-0 border border-[#2a2a2a]" />
                      ) : (
                        <div className="w-14 h-14 rounded-full flex-shrink-0 flex items-center justify-center text-xl font-bold border border-[#2a2a2a]"
                          style={{ background: dcmColor + '20', color: dcmColor }}>
                          {dcm.name?.[0]}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="text-[9px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-full mb-2 inline-block bg-[#1a1a1a] text-[#6a6a6a]">
                          Deputy Chief Minister
                        </span>
                        <p className="font-serif text-lg font-bold text-white leading-tight">{dcm.name}</p>
                        {dcm.party && <p className="text-[12px] mt-0.5" style={{ color: dcmColor }}>{dcm.party}</p>}
                        {dcm.constituency && <p className="text-[11px] text-[#4a4a4a] mt-0.5">{dcm.constituency}</p>}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Assembly composition bar */}
            {govt?.majority_seats && govt?.total_seats && (
              <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-5">
                <p className="text-[10px] uppercase tracking-wider text-[#4a4a4a] mb-4">Assembly Composition</p>
                <div className="flex items-end gap-6 mb-4">
                  <div>
                    <p className="font-mono text-3xl font-black" style={{ color }}>{govt.majority_seats}</p>
                    <p className="text-[11px] text-[#5a5a5a] mt-0.5">Seats won</p>
                  </div>
                  <div className="text-[#2a2a2a] text-2xl font-light">of</div>
                  <div>
                    <p className="font-mono text-3xl font-black text-white">{govt.total_seats}</p>
                    <p className="text-[11px] text-[#5a5a5a] mt-0.5">Total seats</p>
                  </div>
                  <div className="flex-1"/>
                  <div className="text-right">
                    <p className="font-mono text-2xl font-black" style={{ color }}>
                      {Math.round(govt.majority_seats / govt.total_seats * 100)}%
                    </p>
                    <p className="text-[11px] text-[#5a5a5a] mt-0.5">Share</p>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="relative h-3 bg-[#1a1a1a] rounded-full overflow-hidden">
                  {/* Majority line at 50% */}
                  <div className="absolute top-0 bottom-0 w-px bg-[#3a3a3a] z-10" style={{ left: '50%' }}/>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(govt.majority_seats / govt.total_seats * 100, 100)}%`, background: color }} />
                </div>
                <div className="flex justify-between text-[10px] text-[#3a3a3a] mt-1.5">
                  <span>0</span>
                  <span>Majority ({Math.ceil(govt.total_seats / 2)})</span>
                  <span>{govt.total_seats}</span>
                </div>
              </div>
            )}

            {/* Coalition + election info */}
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
                  {govt?.next_election && (
                    <p className="text-[11px] text-[#4a4a4a] mt-0.5">Next: {govt.next_election}</p>
                  )}
                </div>
              )}
            </div>

            {/* Cabinet summary */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Cabinet Ministers', value: ministers.filter(m => !m.is_cm && !m.is_deputy_cm).length },
                { label: 'Total Ministers', value: ministers.length },
                { label: 'Portfolios', value: ministers.filter(m => m.portfolio).length },
              ].map(s => (
                <div key={s.label} className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg p-3 text-center">
                  <p className="font-mono text-2xl font-black text-white">{s.value}</p>
                  <p className="text-[10px] text-[#4a4a4a] mt-1 leading-tight">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Quick links row */}
            <div className="flex gap-2 flex-wrap">
              {[
                { label: 'View Ministers', tab: 'Ministers' },
                { label: 'State Budget', tab: 'Budget' },
                { label: 'Announcements', tab: 'Announcements' },
              ].map(({ label, tab: t }) => (
                <button key={t} onClick={() => setTab(t)}
                  className="text-[12px] px-3 py-1.5 rounded border border-[#2a2a2a] text-[#6a6a6a] hover:text-white hover:border-[#3a3a3a] transition-colors">
                  {label} →
                </button>
              ))}
              {govt?.manifesto_url && (
                <a href={govt.manifesto_url} target="_blank" rel="noreferrer"
                  className="text-[12px] px-3 py-1.5 rounded border border-[#2a2a2a] text-[#3b82f6] hover:border-[#3b82f6]/50 transition-colors">
                  Manifesto ↗
                </a>
              )}
            </div>

            {govt?.last_scraped && (
              <p className="text-[11px] text-[#2a2a2a] text-center">
                Last updated {new Date(govt.last_scraped).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            )}
          </div>
        )}

        {/* MINISTERS TAB */}
        {tab === 'Ministers' && (
          <div>
            {ministers.length === 0 ? (
              <EmptyState state={state} />
            ) : (
              <div className="space-y-6">
                {/* CM at top */}
                {ministers.filter(m => m.is_cm).map((m, i) => {
                  const polLink = m.politician?.slug && m.politician?.state && m.politician.state !== 'Unknown'
                    ? `/politician/${encodeURIComponent(m.politician.state)}/${m.politician.slug}`
                    : null;
                  const card = (
                    <div className="relative overflow-hidden rounded-xl border p-5"
                      style={{ borderColor: color + '30', background: `linear-gradient(135deg, ${color}08 0%, transparent 100%)` }}>
                      <div className="flex items-center gap-4">
                        {m.photo_url ? (
                          <img src={m.photo_url} alt={m.name}
                            className="w-16 h-16 rounded-full object-cover border-2 flex-shrink-0"
                            style={{ borderColor: color + '50' }} />
                        ) : (
                          <div className="w-16 h-16 rounded-full flex-shrink-0 flex items-center justify-center text-2xl font-black border-2"
                            style={{ background: color + '20', borderColor: color + '40', color }}>
                            {m.name?.[0]}
                          </div>
                        )}
                        <div>
                          <span className="text-[9px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-full mb-1.5 inline-block"
                            style={{ background: color + '20', color }}>Chief Minister</span>
                          <p className="font-serif text-xl font-bold text-white">{m.name}</p>
                          {m.party && <p className="text-sm mt-0.5" style={{ color }}>{m.party}</p>}
                          {m.politician?.constituency_name && (
                            <p className="text-[12px] text-[#4a4a4a] mt-0.5">
                              {m.politician.constituency_name} constituency
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                  return polLink
                    ? <Link key={i} href={polLink}>{card}</Link>
                    : <div key={i}>{card}</div>;
                })}

                {/* Deputy CMs */}
                {ministers.filter(m => m.is_deputy_cm).length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {ministers.filter(m => m.is_deputy_cm).map((m, i) => {
                      const mc = partyColor(m.party);
                      return (
                        <div key={i} className="flex items-center gap-3 p-4 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl">
                          {m.photo_url ? (
                            <img src={m.photo_url} alt={m.name}
                              className="w-12 h-12 rounded-full object-cover flex-shrink-0 border border-[#2a2a2a]" />
                          ) : (
                            <div className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center font-bold border border-[#2a2a2a]"
                              style={{ background: mc + '20', color: mc }}>
                              {m.name?.[0]}
                            </div>
                          )}
                          <div>
                            <span className="text-[9px] uppercase tracking-widest text-[#5a5a5a] font-semibold">Deputy CM</span>
                            <p className="text-sm font-semibold text-white">{m.name}</p>
                            {m.party && <p className="text-[11px] mt-0.5" style={{ color: mc }}>{m.party}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Cabinet Ministers */}
                {ministers.filter(m => !m.is_cm && !m.is_deputy_cm).length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[#3a3a3a] mb-3">
                      Cabinet ({ministers.filter(m => !m.is_cm && !m.is_deputy_cm).length} Ministers)
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {ministers.filter(m => !m.is_cm && !m.is_deputy_cm).map((m, i) => {
                        const mc = partyColor(m.party);
                        const polLink = m.politician?.slug && m.politician?.state && m.politician.state !== 'Unknown'
                          ? `/politician/${encodeURIComponent(m.politician.state)}/${m.politician.slug}`
                          : null;
                        const card = (
                          <div className="flex items-center gap-3 p-3 bg-[#080808] border border-[#141414] rounded-lg hover:border-[#1f1f1f] transition-colors cursor-pointer">
                            <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                              style={{ background: mc + '20', color: mc }}>
                              {m.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white font-medium truncate">{m.name}</p>
                              {m.portfolio && (
                                <p className="text-[11px] text-[#4a4a4a] truncate">{m.portfolio}</p>
                              )}
                              {m.politician?.constituency_name && (
                                <p className="text-[10px] mt-0.5" style={{ color: mc }}>
                                  {m.politician.level === 'MP' ? '⚑ MP' : '⚑ MLA'} · {m.politician.constituency_name}
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
                )}
              </div>
            )}
          </div>
        )}

        {/* BUDGET TAB */}
        {tab === 'Budget' && (
          <BudgetTab budgets={budgets} state={state} />
        )}

        {/* ANNOUNCEMENTS TAB */}
        {tab === 'Announcements' && (
          <div>
            {announcements.length === 0 ? (
              <EmptyState state={state} />
            ) : (
              <>
                <p className="text-[11px] text-[#3a3a3a] mb-4">
                  Recent government announcements — refreshed every 3 months
                </p>
                <div className="space-y-3">
                  {announcements.map((a, i) => {
                    const catColor = CATEGORY_COLORS[a.category] ?? '#6b7280';
                    return (
                      <div key={i} className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg p-4">
                        <div className="flex items-start gap-2 mb-2">
                          <span className="text-[10px] px-2 py-0.5 rounded flex-shrink-0 mt-0.5"
                            style={{ color: catColor, background: catColor + '20' }}>
                            {a.category}
                          </span>
                        </div>
                        <p className="text-sm text-[#c0c0c0] leading-relaxed">{a.title}</p>
                        {a.summary && (
                          <p className="text-[12px] text-[#5a5a5a] mt-1.5 leading-relaxed line-clamp-3">{a.summary}</p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          {a.announced_on && (
                            <p className="text-[11px] text-[#3a3a3a]">
                              {new Date(a.announced_on).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          )}
                          {a.source_url && (
                            <a href={`https://${a.source_url}`} target="_blank" rel="noreferrer"
                              className="text-[11px] text-[#3b82f6] hover:underline">
                              Source ↗
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const SECTOR_CATEGORIES = ['All','Agriculture','Education','Health','Infrastructure',
  'Energy','Water','Housing','Women & Child','Employment','Industry','Social Welfare','Other'];

function BudgetTab({ budgets, state }) {
  const [selectedYear, setSelectedYear] = useState(budgets[0]?.year ?? null);
  const [sectorFilter, setSectorFilter] = useState('All');

  const budget = budgets.find(b => b.year === selectedYear) ?? budgets[0];
  if (!budget) return <EmptyState state={state} />;

  const filteredSectors = sectorFilter === 'All'
    ? (budget.sector_allocations ?? [])
    : (budget.sector_allocations ?? []).filter(s =>
        s.sector?.toLowerCase().includes(sectorFilter.toLowerCase())
      );

  const filteredSchemes = sectorFilter === 'All'
    ? (budget.key_schemes ?? [])
    : (budget.key_schemes ?? []).filter(s => s.category === sectorFilter);

  return (
    <div>
      {/* Year selector */}
      {budgets.length > 1 && (
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {budgets.map(b => (
            <button key={b.year} onClick={() => setSelectedYear(b.year)}
              className={`px-3 py-1.5 rounded text-[12px] whitespace-nowrap transition-colors ${
                selectedYear === b.year
                  ? 'bg-[#f59e0b] text-black font-medium'
                  : 'bg-[#111] text-[#5a5a5a] hover:text-white border border-[#1f1f1f]'
              }`}>
              {b.year}–{String(b.year+1).slice(-2)}
            </button>
          ))}
        </div>
      )}

      {/* Overview card */}
      <div className="bg-[#0f0f0f] border border-[#f59e0b]/20 rounded-lg p-4 mb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-serif text-lg font-bold text-white">
              Budget {budget.year}–{String(budget.year+1).slice(-2)}
            </h3>
            {budget.presented_by && (
              <p className="text-[11px] text-[#5a5a5a] mt-0.5">Presented by {budget.presented_by}</p>
            )}
            <div className="flex gap-3 mt-2 flex-wrap">
              {budget.fiscal_deficit && (
                <span className="text-[11px] text-[#9a9a9a]">
                  Fiscal deficit: <strong className="text-white">{budget.fiscal_deficit}</strong>
                </span>
              )}
              {budget.revenue_deficit && (
                <span className="text-[11px] text-[#9a9a9a]">
                  Revenue deficit: <strong className="text-white">{budget.revenue_deficit}</strong>
                </span>
              )}
            </div>
          </div>
          {budget.total_outlay && (
            <p className="text-[#f59e0b] font-mono font-bold text-lg whitespace-nowrap">{budget.total_outlay}</p>
          )}
        </div>
        {budget.summary && (
          <p className="text-[12px] text-[#6a6a6a] leading-relaxed mt-3 border-t border-[#1a1a1a] pt-3">
            {budget.summary}
          </p>
        )}
      </div>

      {/* Key highlights */}
      {budget.key_highlights?.length > 0 && (
        <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-lg p-4 mb-4">
          <p className="text-[10px] uppercase tracking-wider text-[#4a4a4a] mb-3">Key Highlights</p>
          <ul className="space-y-1.5">
            {budget.key_highlights.map((h, i) => (
              <li key={i} className="text-[12px] text-[#8a8a8a] flex gap-2">
                <span className="text-[#f59e0b] flex-shrink-0">•</span>{h}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sector filter */}
      {((budget.sector_allocations?.length > 0) || (budget.key_schemes?.length > 0)) && (
        <>
          <div className="mb-4">
            <p className="text-[10px] uppercase tracking-wider text-[#4a4a4a] mb-2">Filter by Sector</p>
            <div className="flex gap-1.5 flex-wrap">
              {SECTOR_CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setSectorFilter(cat)}
                  className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                    sectorFilter === cat
                      ? 'bg-[#3b82f6] text-white'
                      : 'bg-[#111] text-[#5a5a5a] hover:text-white border border-[#1a1a1a]'
                  }`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Sector allocations */}
          {filteredSectors.length > 0 && (
            <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-lg p-4 mb-4">
              <p className="text-[10px] uppercase tracking-wider text-[#4a4a4a] mb-3">
                Sector Allocations {sectorFilter !== 'All' ? `— ${sectorFilter}` : `(${filteredSectors.length})`}
              </p>
              <div className="space-y-2">
                {filteredSectors.map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-[#1a1a1a] last:border-0">
                    <div>
                      <p className="text-sm text-[#c0c0c0]">{s.sector}</p>
                      {s.notes && <p className="text-[11px] text-[#4a4a4a]">{s.notes}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono text-white">{s.amount}</p>
                      {s.percent_change && (
                        <p className={`text-[11px] ${s.percent_change.startsWith('+') ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                          {s.percent_change}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key schemes */}
          {filteredSchemes.length > 0 && (
            <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-lg p-4 mb-4">
              <p className="text-[10px] uppercase tracking-wider text-[#4a4a4a] mb-3">
                Key Schemes {sectorFilter !== 'All' ? `— ${sectorFilter}` : `(${filteredSchemes.length})`}
              </p>
              <div className="space-y-2">
                {filteredSchemes.map((s, i) => (
                  <div key={i} className="bg-[#0a0a0a] rounded p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-[#c0c0c0] font-medium">{s.name}</p>
                      <span className="text-[11px] font-mono text-[#f59e0b] flex-shrink-0">{s.allocation}</span>
                    </div>
                    {s.beneficiaries && (
                      <p className="text-[11px] text-[#4a4a4a] mt-1">{s.beneficiaries}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Tax changes */}
      {budget.tax_changes?.length > 0 && (
        <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-lg p-4 mb-4">
          <p className="text-[10px] uppercase tracking-wider text-[#4a4a4a] mb-3">Tax Changes</p>
          <ul className="space-y-1">
            {budget.tax_changes.map((t, i) => (
              <li key={i} className="text-[12px] text-[#8a8a8a] flex gap-2">
                <span className="text-[#3b82f6] flex-shrink-0">•</span>{t}
              </li>
            ))}
          </ul>
        </div>
      )}

      {budget.pdf_url && (
        <a href={budget.pdf_url} target="_blank" rel="noreferrer"
          className="text-[11px] text-[#3b82f6] hover:underline">Source ↗</a>
      )}
    </div>
  );
}

function EmptyState({ state }) {
  return (
    <div className="py-16 text-center border border-[#1a1a1a] rounded-lg">
      <p className="text-[#4a4a4a] text-sm">No data available yet.</p>
    </div>
  );
}
