'use client';

export const runtime = 'edge';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { getStates, getConstituenciesByState, getPoliticiansByConstituency, getConstituencyById, getConstituencyWithHistory, getMlaHistory, getParliamentPerformance } from '@/lib/api';
import ReportDataModal from '@/components/ReportDataModal';
import Navbar from '@/components/layout/Navbar';
import PromiseScore from '@/components/promises/PromiseScore';

// State combobox — fixed list, client-side filter
function Combobox({ options, value, onChange, placeholder, disabled }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);
  useEffect(() => {
    function handler(e) { if (!ref.current?.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  useEffect(() => { if (!value) setQuery(''); }, [value]);
  const filtered = query ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase())) : options;
  const selected = options.find(o => o.value === value);
  return (
    <div ref={ref} className="relative flex-1">
      <div className="input flex items-center gap-2"
        style={{ padding: '10px 14px', cursor: disabled ? 'not-allowed' : 'text', opacity: disabled ? 0.4 : 1 }}
        onClick={() => { if (!disabled) setOpen(true); }}>
        <input
          className="flex-1 bg-transparent outline-none text-sm text-white placeholder-[#4a4a4a] min-w-0 cursor-text"
          style={{ padding: 0, border: 'none', height: 'auto' }}
          placeholder={placeholder}
          value={open ? query : (selected?.label ?? '')}
          disabled={disabled}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { if (!disabled) { setQuery(''); setOpen(true); } }}
        />
        <svg width="12" height="8" fill="none" viewBox="0 0 12 8" className="flex-shrink-0 pointer-events-none">
          <path d="M1 1l5 5 5-5" stroke="#5a5a5a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      {open && !disabled && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg max-h-56 overflow-y-auto shadow-xl">
          {filtered.length === 0
            ? <div className="px-4 py-3 text-[#5a5a5a] text-sm">No results</div>
            : filtered.map(opt => (
              <button key={opt.value}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between gap-2 ${opt.value === value ? 'bg-[#222] text-white' : 'text-[#d0d0d0] hover:bg-[#222] hover:text-white'}`}
                onClick={() => { onChange(opt.value); setOpen(false); setQuery(''); }}>
                <span>{opt.label}</span>
                {opt.badge && <span className="text-[10px] text-[#5a5a5a] uppercase tracking-wider flex-shrink-0">{opt.badge}</span>}
              </button>
            ))
          }
        </div>
      )}
    </div>
  );
}

// Constituency combobox — searches DB on keypress (max 20 results)
function ConstituencyCombobox({ state, value, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [searching, setSearching] = useState(false);
  const ref = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    function handler(e) { if (!ref.current?.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Load initial 20 when state selected
  useEffect(() => {
    if (!state) { setOptions([]); return; }
    setSearching(true);
    getConstituenciesByState(state, '').then(data => {
      setOptions(data.map(c => ({ value: c.id, label: c.name, badge: c.type === 'LS' ? 'Lok Sabha' : 'Vidhan Sabha' })));
    }).catch(console.error).finally(() => setSearching(false));
  }, [state]);

  function handleInput(e) {
    const q = e.target.value;
    setQuery(q);
    setOpen(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (!state) return;
      setSearching(true);
      getConstituenciesByState(state, q).then(data => {
        setOptions(data.map(c => ({ value: c.id, label: c.name, badge: c.type === 'LS' ? 'Lok Sabha' : 'Vidhan Sabha' })));
      }).catch(console.error).finally(() => setSearching(false));
    }, 200);
  }

  const selected = options.find(o => o.value === value);

  return (
    <div ref={ref} className="relative flex-1">
      <div className="input flex items-center gap-2"
        style={{ padding: '10px 14px', cursor: disabled ? 'not-allowed' : 'text', opacity: disabled ? 0.4 : 1 }}
        onClick={() => { if (!disabled) setOpen(true); }}>
        <input
          className="flex-1 bg-transparent outline-none text-sm text-white placeholder-[#4a4a4a] min-w-0 cursor-text"
          style={{ padding: 0, border: 'none', height: 'auto' }}
          placeholder={disabled ? 'Select State first' : 'Search constituency…'}
          value={open ? query : (selected?.label ?? '')}
          disabled={disabled}
          onChange={handleInput}
          onFocus={() => { if (!disabled) { setQuery(''); setOpen(true); } }}
        />
        {searching
          ? <svg className="animate-spin w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#5a5a5a" strokeWidth="2" opacity="0.3"/>
              <path d="M12 2a10 10 0 0 1 10 10" stroke="#5a5a5a" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          : <svg width="12" height="8" fill="none" viewBox="0 0 12 8" className="flex-shrink-0 pointer-events-none">
              <path d="M1 1l5 5 5-5" stroke="#5a5a5a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
        }
      </div>
      {open && !disabled && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg max-h-56 overflow-y-auto shadow-xl">
          {options.length === 0
            ? <div className="px-4 py-3 text-[#5a5a5a] text-sm">{searching ? 'Searching…' : 'Type to search'}</div>
            : options.map(opt => (
              <button key={opt.value}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between gap-2 ${opt.value === value ? 'bg-[#222] text-white' : 'text-[#d0d0d0] hover:bg-[#222] hover:text-white'}`}
                onClick={() => { onChange(opt.value); setOpen(false); setQuery(''); }}>
                <span>{opt.label}</span>
                {opt.badge && <span className="text-[10px] text-[#5a5a5a] uppercase tracking-wider flex-shrink-0">{opt.badge}</span>}
              </button>
            ))
          }
          {options.length >= 20 && (
            <div className="px-4 py-2 text-[11px] text-[#3a3a3a] border-t border-[#222]">Type to narrow results</div>
          )}
        </div>
      )}
    </div>
  );
}

function getPartyColor(party) {
  if (!party) return '#3a3a3a';
  const p = party.toLowerCase();
  if (/bjp|bharatiya janata/.test(p)) return '#f97316';
  if (/congress|inc|indian national/.test(p)) return '#3b82f6';
  if (/aap|aam aadmi/.test(p)) return '#06b6d4';
  if (/tmc|trinamool/.test(p)) return '#10b981';
  if (/dmk|dravida/.test(p)) return '#ef4444';
  if (/aiadmk/.test(p)) return '#84cc16';
  if (/jds|janata dal/.test(p)) return '#8b5cf6';
  if (/sp|samajwadi/.test(p)) return '#e11d48';
  if (/bsp/.test(p)) return '#1d4ed8';
  if (/cpi|communist/.test(p)) return '#dc2626';
  if (/shiv sena/.test(p)) return '#f59e0b';
  return '#5a5a5a';
}

export default function HomePage() {
  const [states, setStates] = useState([]);
  const [statesLoading, setStatesLoading] = useState(true);
  const [selectedState, setSelectedState] = useState('');
  const [selectedConstituency, setSelectedConstituency] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setStatesLoading(true);
    getStates().then(setStates).catch(console.error).finally(() => setStatesLoading(false));
  }, []);

  const handleSearch = useCallback(async () => {
    if (!selectedState || !selectedConstituency) return;
    setLoading(true);
    setResult(null);
    try {
      const [constituency, politicians, mlaHistory] = await Promise.all([
        getConstituencyWithHistory(selectedConstituency),
        getPoliticiansByConstituency(selectedConstituency),
        getMlaHistory(selectedConstituency),
      ]);
      const mla = politicians.find(p => p.level === 'MLA');
      const mp  = politicians.find(p => p.level === 'MP');

      // Fetch parliament performance for both
      const [mlaPerf, mpPerf] = await Promise.all([
        mla?.id ? getParliamentPerformance(mla.id) : Promise.resolve(null),
        mp?.id  ? getParliamentPerformance(mp.id)  : Promise.resolve(null),
      ]);
      if (mla && mlaPerf) mla.perf = mlaPerf;
      if (mp  && mpPerf)  mp.perf  = mpPerf;

      const combined = politicians.length
        ? Math.round(politicians.reduce((s, p) => s + (p.promise_score ?? 0), 0) / politicians.length)
        : null;
      setResult({ constituency, mla, mp, combined, mlaHistory });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [selectedState, selectedConstituency]);

  const [showReport, setShowReport] = useState(false);
  const stateOptions = states.map(s => ({ value: s.state, label: s.state }));

  return (
    <main className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <Navbar
        onReport={result ? () => setShowReport(true) : null}
        showReport={!!result}
      />
      <section className="flex-1 flex flex-col items-center justify-center px-4 pt-20 pb-12 animate-fade-in">
        <div className="w-full max-w-xl text-center">
          <h1 className="font-serif text-[clamp(3rem,8vw,5.5rem)] font-black leading-[1.02] tracking-tight text-white mb-3">
            Drishta
          </h1>
          <p className="text-[11px] font-sans font-medium tracking-[0.22em] uppercase text-[#5a5a5a] mb-1">
            Know your constituency
          </p>
          <p className="text-[13px] font-sans text-[#4a4a4a] mb-12 italic font-serif">
            "A mirror. A glass. See what was promised. See what was done."
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <Combobox
              options={stateOptions}
              value={selectedState}
              onChange={v => { setSelectedState(v); setSelectedConstituency(''); }}
              placeholder={statesLoading ? 'Loading states…' : `Select State (${states.length})`}
              disabled={statesLoading}
            />
            <ConstituencyCombobox
              state={selectedState}
              value={selectedConstituency}
              onChange={setSelectedConstituency}
              disabled={!selectedState}
            />
          </div>

          <button
            className="btn-primary w-full justify-center text-base py-3 rounded-lg"
            onClick={handleSearch}
            disabled={!selectedState || !selectedConstituency || loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.2"/>
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Searching…
              </span>
            ) : 'Search →'}
          </button>

          {selectedState && (
            <Link
              href={`/state/${encodeURIComponent(selectedState)}`}
              className="flex items-center justify-center gap-2 mt-3 text-[12px] text-[#5a5a5a] hover:text-[#9a9a9a] transition-colors py-2">
              🏛️ Track {selectedState} State Government →
            </Link>
          )}

          {/* Central Government always visible */}
          <div className="mt-4 pt-4 border-t border-[#141414]">
            <Link href="/india"
              className="flex items-center justify-center gap-2 text-[12px] hover:text-white transition-colors py-2 group"
              style={{ color: '#f97316' }}>
              <span className="text-base">🇮🇳</span>
              <span>Track Central Government → Union Cabinet, Budget, Announcements</span>
            </Link>
          </div>
        </div>

        {result && (
          <div className="w-full max-w-2xl mt-14 animate-fade-up">
            {/* Header with Report button top-right on desktop */}
            <div className="text-center mb-8">
              <h2 className="font-serif text-3xl font-bold text-white">{result.constituency?.name}</h2>
              <p className="text-[#5a5a5a] text-sm mt-1 tracking-wide uppercase">{result.constituency?.state}</p>
              {result.constituency?.formed_year && (
                <p className="text-[#4a4a4a] text-xs mt-1">Formed {result.constituency.formed_year}</p>
              )}
              {result.combined !== null && (
                <div className="mt-3 inline-flex items-center gap-2 text-sm text-[#9a9a9a]">
                  <span>Combined Promise Score</span>
                  <span className="font-mono font-bold text-lg" style={{
                    color: result.combined >= 70 ? '#22c55e' : result.combined >= 40 ? '#f59e0b' : '#ef4444'
                  }}>{result.combined}%</span>
                </div>
              )}
            </div>

            {/* Two separate cards: one for MP (LS), one for MLA (VS) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {[
                { pol: result.mp,  label: 'MP', sublabel: 'Lok Sabha', color: '#3b82f6' },
                { pol: result.mla, label: 'MLA', sublabel: 'Vidhan Sabha', color: '#f59e0b' },
              ].map(({ pol, label, sublabel, color }) => (
                pol ? (
                  <Link
                    key={label}
                    href={`/politician/${encodeURIComponent(pol.state)}/${pol.slug}`}
                    className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl p-5 flex items-start gap-4 hover:border-[#3a3a3a] transition-colors group"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#1a1a1a] overflow-hidden flex-shrink-0 border-2" style={{ borderColor: color + '40' }}>
                      {pol.photo_url
                        ? <img src={pol.photo_url} alt={pol.name} className="w-full h-full object-cover"/>
                        : <div className="w-full h-full flex items-center justify-center font-serif text-xl" style={{ color }}>{pol.name[0]}</div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono tracking-widest uppercase px-1.5 py-0.5 rounded" style={{ color, background: color + '18' }}>
                          {label}
                        </span>
                        <span className="text-[10px] text-[#4a4a4a]">{sublabel}</span>
                      </div>
                      <p className="font-serif font-semibold text-white text-base leading-tight group-hover:text-[#e0e0e0] truncate">{pol.name}</p>
                      <p className="text-[12px] text-[#6a6a6a] mt-0.5">{pol.party}</p>
                      <PromiseScore score={pol.promise_score} count={pol.promise_count} inline/>
                      {pol.perf && (
                        <div className="flex gap-3 mt-2 flex-wrap">
                          {pol.perf.attendance_pct && (
                            <span className="text-[10px] text-[#5a5a5a]">
                              🗓 <span className="text-[#9a9a9a]">{pol.perf.attendance_pct}%</span> attendance
                            </span>
                          )}
                          {pol.perf.questions_asked > 0 && (
                            <span className="text-[10px] text-[#5a5a5a]">
                              ❓ <span className="text-[#9a9a9a]">{pol.perf.questions_asked}</span> questions
                            </span>
                          )}
                          {pol.perf.debates_count > 0 && (
                            <span className="text-[10px] text-[#5a5a5a]">
                              🗣 <span className="text-[#9a9a9a]">{pol.perf.debates_count}</span> debates
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </Link>
                ) : (
                  <div key={label} className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-xl p-5 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-[11px] tracking-wider uppercase mb-1" style={{ color }}>{label}</div>
                      <div className="text-[#3a3a3a] text-sm">{sublabel} data unavailable</div>
                    </div>
                  </div>
                )
              ))}
            </div>

            {/* Parliament Performance */}
            <div className="mb-6 bg-[#0f0f0f] border border-[#1f1f1f] rounded-lg p-4">
              <p className="text-[10px] uppercase tracking-wider text-[#4a4a4a] mb-4">Parliament Performance</p>
              {(result.mla?.perf || result.mp?.perf) ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { pol: result.mla, label: 'MLA', color: '#f59e0b' },
                    { pol: result.mp,  label: 'MP',  color: '#3b82f6' },
                  ].filter(({ pol }) => pol?.perf).map(({ pol, label, color }) => (
                    <div key={label}>
                      <p className="text-[11px] mb-2" style={{ color }}>{pol.name}</p>
                      <div className="space-y-2">
                        {pol.perf.term && (
                          <p className="text-[11px] text-[#4a4a4a]">{pol.perf.term}</p>
                        )}
                        {[
                          { key: 'attendance_pct', label: 'Attendance', suffix: '%', icon: '🗓' },
                          { key: 'days_signed', label: 'Days signed register', suffix: '', icon: '🗓' },
                          { key: 'questions_asked', label: 'Questions asked', suffix: '', icon: '❓' },
                          { key: 'debates_count', label: 'Minutes debated', suffix: ' min', icon: '🗣' },
                          { key: 'bills_introduced', label: 'Bills introduced', suffix: '', icon: '📜' },
                        ].filter(({ key }) => pol.perf[key] != null && pol.perf[key] > 0).map(({ key, label, suffix, icon }) => (
                          <div key={key} className="flex items-center justify-between py-1.5 border-b border-[#1a1a1a] last:border-0">
                            <span className="text-[12px] text-[#5a5a5a] flex items-center gap-1.5">
                              <span>{icon}</span>{label}
                            </span>
                            <span className="text-[12px] font-mono text-white">
                              {pol.perf[key]}{suffix}
                            </span>
                          </div>
                        ))}
                        {pol.perf.source_url && (
                          <a href={pol.perf.source_url} target="_blank" rel="noreferrer"
                            className="text-[11px] text-[#3b82f6] hover:underline block mt-1">
                            Source ↗
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-[#3a3a3a] text-sm">
                  No performance data available yet.
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'View Promises', href: `/promises?state=${encodeURIComponent(result.constituency?.state ?? '')}`, icon: '📋' },
                { label: 'View History', href: `/constituency/${result.constituency?.id}/history`, icon: '🏛️' },
                { label: 'View Issues', href: `/issues/${encodeURIComponent(result.constituency?.state ?? '')}/${result.constituency?.slug}`, icon: '🔍' },
                { label: 'Post a Promise', href: '/submit/promise', icon: '✍️' },
              ].map(({ label, href, icon }) => (
                <Link key={label} href={href}
                  className="flex flex-col items-center gap-1.5 py-4 px-2 bg-[#111] border border-[#2a2a2a] rounded-lg text-center hover:bg-[#161616] hover:border-[#3a3a3a] transition-colors text-[#9a9a9a] hover:text-white text-xs font-medium">
                  <span className="text-lg">{icon}</span>
                  {label}
                </Link>
              ))}
              <button
                onClick={() => setShowReport(true)}
                className="col-span-2 flex items-center justify-center gap-2 py-3 px-2 bg-[#111] border border-[#f59e0b]/20 hover:border-[#f59e0b]/50 rounded-lg text-center hover:bg-[#161616] transition-colors text-[#f59e0b] text-xs font-medium">
                ⚑ Report Data Issue
              </button>
            </div>

            {/* MLA History */}
            <div className="mt-8 pt-6 border-t border-[#1f1f1f]">
              <h3 className="text-[10px] tracking-[0.15em] uppercase text-[#4a4a4a] mb-4 flex items-center justify-between">
                <span>Past Representatives</span>
                {result.constituency?.formed_year && (
                  <span className="text-[#3a3a3a] normal-case font-normal">Since {result.constituency.formed_year}</span>
                )}
              </h3>
              {result.mlaHistory?.length > 0 ? (
                <div className="space-y-0">
                  {result.mlaHistory.map((m, i) => {
                    const isFirst = i === 0;
                    const partyColor = getPartyColor(m.party);
                    return (
                      <div key={i} className={`flex items-center gap-3 py-2.5 border-b border-[#1a1a1a] last:border-0 ${isFirst ? 'opacity-100' : 'opacity-60'}`}>
                        <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ background: partyColor }}/>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#c0c0c0] truncate">{m.name}</p>
                          {m.party && <p className="text-[11px] text-[#4a4a4a] truncate">{m.party}</p>}
                        </div>
                        <span className="text-[11px] font-mono text-[#4a4a4a] flex-shrink-0">{m.term_year}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[12px] text-[#2a2a2a] italic">No history available yet.</p>
              )}
              {result.constituency?.wikipedia_url && (
                <a href={result.constituency.wikipedia_url} target="_blank" rel="noreferrer"
                  className="text-[11px] text-[#3b82f6] hover:underline mt-3 block">
                  Full history on Wikipedia ↗
                </a>
              )}
            </div>
            {/* Report Issue — mobile only (desktop has it top-right) */}
            <div className="mt-6 pt-4 border-t border-[#1a1a1a] flex items-center justify-between sm:hidden">
              <p className="text-[12px] text-[#3a3a3a]">Data incorrect or missing?</p>
              <button
                onClick={() => setShowReport(true)}
                className="text-[12px] text-[#f59e0b] hover:text-[#fbbf24] transition-colors flex items-center gap-1.5 border border-[#f59e0b]/20 hover:border-[#f59e0b]/40 px-3 py-1.5 rounded">
                ⚑ Report Issue
              </button>
            </div>
          </div>
        )}

        {showReport && result && (
          <ReportDataModal
            constituency={result.constituency}
            mla={result.mla}
            mp={result.mp}
            onClose={() => setShowReport(false)}
          />
        )}
      </section>

      <section className="border-t border-[#1a1a1a] px-4 py-12">
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-px bg-[#1a1a1a]">
          {[
            { href: '/promises', title: 'Promise Tracker', desc: 'Every electoral promise. Every broken one.', color: '#f59e0b' },
            { href: '/issues', title: 'Issue Board', desc: 'Civic problems, documented with evidence.', color: '#3b82f6' },
            { href: '/news', title: 'News', desc: 'Independent journalism on Indian democracy.', color: '#b8860b' },
          ].map(({ href, title, desc, color }) => (
            <Link key={href} href={href} className="bg-[#0a0a0a] px-6 py-7 group hover:bg-[#0d0d0d] transition-colors">
              <div className="w-1 h-5 rounded-full mb-4" style={{ background: color }}/>
              <h3 className="font-serif text-base font-semibold text-white mb-2 group-hover:text-[#e0e0e0]">{title}</h3>
              <p className="text-[13px] text-[#5a5a5a] leading-relaxed">{desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}