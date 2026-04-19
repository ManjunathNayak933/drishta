'use client';

import { useState } from 'react';

export default function AdminPerformanceUpload() {
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({
    house: 'Lok Sabha',
    term: '18th Lok Sabha (2024–2029)',
    attendance_pct: '',
    questions_asked: '',
    debates_count: '',
    bills_introduced: '',
    private_bills: '',
    source_url: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function handleSearch(q) {
    setSearch(q);
    if (q.length < 2) { setSearchResults([]); return; }
    try {
      const res = await fetch(`/api/search-politicians?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSearchResults(data.politicians ?? []);
    } catch { setSearchResults([]); }
  }

  function selectPolitician(p) {
    setSelected(p);
    setSearchResults([]);
    setSearch(p.name);
    // Pre-fill house based on level
    setForm(prev => ({
      ...prev,
      house: p.level === 'MP' ? 'Lok Sabha' : `${p.state} Legislative Assembly`,
      term: p.level === 'MP' ? '18th Lok Sabha (2024–2029)' : `${p.state} Assembly (2023–2028)`,
    }));
  }

  async function handleSave() {
    if (!selected) { setError('Select a politician first'); return; }
    setSaving(true); setError(''); setSaved(false);
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'savePerformance',
          politician_id: selected.id,
          politician_name: selected.name,
          level: selected.level,
          state: selected.state,
          house: form.house,
          term: form.term,
          attendance_pct: form.attendance_pct ? parseFloat(form.attendance_pct) : null,
          questions_asked: form.questions_asked ? parseInt(form.questions_asked) : null,
          debates_count: form.debates_count ? parseInt(form.debates_count) : null,
          bills_introduced: form.bills_introduced ? parseInt(form.bills_introduced) : null,
          private_bills: form.private_bills ? parseInt(form.private_bills) : null,
          source_url: form.source_url || null,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const FIELDS = [
    { key: 'attendance_pct', label: 'Attendance %', placeholder: '85.5', hint: 'e.g. 85.5 for 85.5%' },
    { key: 'questions_asked', label: 'Questions asked', placeholder: '142', hint: 'Total questions in this term' },
    { key: 'debates_count', label: 'Debates participated', placeholder: '67', hint: '' },
    { key: 'bills_introduced', label: 'Bills introduced', placeholder: '3', hint: '' },
    { key: 'private_bills', label: 'Private member bills', placeholder: '1', hint: '' },
  ];

  return (
    <div className="min-h-screen bg-[#080808]">
      <div className="max-w-xl mx-auto px-4 py-8">
        <a href="/admin" className="text-[12px] text-[#4a4a4a] hover:text-white transition-colors">← Back</a>
        <h1 className="font-serif text-2xl font-bold text-white mt-6 mb-2">Parliament Performance</h1>
        <p className="text-[#5a5a5a] text-sm mb-8">
          Manually enter performance data for any MP or MLA.
          Source: <a href="https://sansad.in" target="_blank" rel="noreferrer" className="text-[#3b82f6] hover:underline">sansad.in</a> for MPs,
          state assembly websites for MLAs.
        </p>

        {/* Politician search */}
        <div className="mb-6 relative">
          <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">
            Search politician
          </label>
          <input className="input py-2 text-sm" placeholder="Type name…"
            value={search} onChange={e => handleSearch(e.target.value)} />
          {searchResults.length > 0 && (
            <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg max-h-48 overflow-y-auto shadow-xl">
              {searchResults.map(p => (
                <button key={p.id} onClick={() => selectPolitician(p)}
                  className="w-full text-left px-4 py-2.5 text-sm text-[#d0d0d0] hover:bg-[#222] transition-colors">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-[11px] text-[#5a5a5a] ml-2">{p.level} · {p.constituency_name}, {p.state}</span>
                </button>
              ))}
            </div>
          )}
          {selected && (
            <p className="text-[12px] text-[#22c55e] mt-1.5">
              ✓ {selected.name} — {selected.level} · {selected.constituency_name}
            </p>
          )}
        </div>

        {selected && (
          <div className="space-y-4">
            {/* House and term */}
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">House / Assembly</label>
                <input className="input py-2 text-sm" value={form.house}
                  onChange={e => setForm(p => ({ ...p, house: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">Term</label>
                <input className="input py-2 text-sm" value={form.term}
                  onChange={e => setForm(p => ({ ...p, term: e.target.value }))} />
              </div>
            </div>

            {/* Performance fields */}
            <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-lg p-4 space-y-3">
              {FIELDS.map(({ key, label, placeholder, hint }) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-[#c0c0c0]">{label}</p>
                    {hint && <p className="text-[11px] text-[#3a3a3a]">{hint}</p>}
                  </div>
                  <input type="number" className="input py-1.5 text-sm w-24 text-right"
                    placeholder={placeholder}
                    value={form[key]}
                    onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
                </div>
              ))}
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">Source URL</label>
              <input className="input py-2 text-sm" placeholder="https://sansad.in/ls/members/..."
                value={form.source_url} onChange={e => setForm(p => ({ ...p, source_url: e.target.value }))} />
            </div>

            {error && (
              <p className="text-[12px] text-[#ef4444] bg-[#ef4444]/10 border border-[#ef4444]/20 rounded px-3 py-2">{error}</p>
            )}

            <button onClick={handleSave} disabled={saving}
              className="btn-primary w-full justify-center py-3 text-sm">
              {saved ? '✓ Saved!' : saving ? 'Saving…' : `Save Performance for ${selected.name}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
