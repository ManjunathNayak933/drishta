'use client';

import { useState, useEffect } from 'react';

const STATES = [
  'India', // Central government
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh',
  'Goa','Gujarat','Haryana','Himachal Pradesh','Jammu and Kashmir','Jharkhand','Karnataka','Ladakh',
  'Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
  'Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Puducherry',
];

const MINISTER_TYPES = ['Cabinet Minister', 'Minister of State (Independent Charge)', 'Minister of State'];

const EMPTY_MINISTER = { name: '', portfolio: '', party: '', constituency: '', is_cm: false, is_deputy_cm: false, minister_type: 'Cabinet Minister' };

export default function AdminMinistersUpload() {
  const [state, setState] = useState('Karnataka');
  const [ministers, setMinisters] = useState([{ ...EMPTY_MINISTER }]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [csvMode, setCsvMode] = useState(false);
  const [csvText, setCsvText] = useState('');

  // Load existing ministers when state changes
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/admin?action=getStateMinisters&state=${encodeURIComponent(state)}`);
        const data = await res.json();
        if (data.ministers?.length > 0) {
          setMinisters(data.ministers.map(m => ({
            name: m.name ?? '',
            portfolio: m.portfolio ?? '',
            party: m.party ?? '',
            constituency: m.constituency ?? '',
            is_cm: m.is_cm ?? false,
            is_deputy_cm: m.is_deputy_cm ?? false,
            minister_type: m.minister_type ?? 'Cabinet Minister',
          })));
        } else {
          setMinisters([{ ...EMPTY_MINISTER }]);
        }
      } catch {
        setMinisters([{ ...EMPTY_MINISTER }]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [state]);

  function updateMinister(index, field, value) {
    const updated = [...ministers];
    updated[index] = { ...updated[index], [field]: value };
    // auto-set is_cm/is_deputy_cm based on portfolio
    if (field === 'portfolio') {
      updated[index].is_cm = /^(chief minister|prime minister)$/i.test(value.trim());
      updated[index].is_deputy_cm = /deputy (chief minister|prime minister)/i.test(value);
      if (updated[index].is_cm) updated[index].minister_type = 'Cabinet Minister';
    }
    setMinisters(updated);
  }

  function addRow() {
    setMinisters([...ministers, { ...EMPTY_MINISTER }]);
  }

  function removeRow(index) {
    setMinisters(ministers.filter((_, i) => i !== index));
  }

  function parseCSV() {
    const lines = csvText.trim().split('\n').filter(l => l.trim());
    if (!lines.length) return;
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    const parsed = lines.slice(1).map(line => {
      const cells = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      const row = {};
      headers.forEach((h, i) => { row[h] = cells[i] ?? ''; });
      return {
        name: row.name ?? '',
        portfolio: row.portfolio ?? '',
        party: row.party ?? '',
        constituency: row.constituency ?? '',
        is_cm: /^(yes|true|1)$/i.test(row.is_cm ?? ''),
        is_deputy_cm: /^(yes|true|1)$/i.test(row.is_deputy_cm ?? ''),
      };
    }).filter(m => m.name);
    if (parsed.length) { setMinisters(parsed); setCsvMode(false); }
  }

  async function handleSave() {
    const valid = ministers.filter(m => m.name.trim());
    if (!valid.length) { setError('Add at least one minister'); return; }
    setSaving(true); setError(''); setSaved(false);
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveMinisters', state, ministers: valid }),
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

  const cmCount = ministers.filter(m => m.is_cm).length;
  const deputyCount = ministers.filter(m => m.is_deputy_cm).length;

  return (
    <div className="min-h-screen bg-[#080808]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <a href="/admin" className="text-[12px] text-[#4a4a4a] hover:text-white transition-colors">← Back</a>

        <div className="flex items-start justify-between gap-4 mt-6 mb-6">
          <div>
            <h1 className="font-serif text-2xl font-bold text-white mb-1">Cabinet Ministers</h1>
            <p className="text-[#5a5a5a] text-sm">Add or update the council of ministers for any state.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setCsvMode(!csvMode)}
              className="btn-ghost text-xs py-1.5 px-3">
              {csvMode ? 'Form mode' : 'CSV paste'}
            </button>
          </div>
        </div>

        {/* State selector */}
        <div className="mb-6">
          <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">State</label>
          <select className="input py-2 text-sm max-w-xs" value={state} onChange={e => setState(e.target.value)}>
            {STATES.map(s => <option key={s}>{s}</option>)}
          </select>
          {!loading && ministers.filter(m => m.name).length > 0 && (
            <p className="text-[11px] text-[#4a4a4a] mt-1">
              {ministers.filter(m => m.name).length} ministers loaded
              {cmCount > 0 && ` · CM: ${ministers.find(m => m.is_cm)?.name}`}
            </p>
          )}
        </div>

        {loading ? (
          <div className="text-center py-8 text-[#4a4a4a] text-sm">Loading existing ministers…</div>
        ) : csvMode ? (
          /* CSV mode */
          <div className="space-y-4">
            <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-lg p-4">
              <p className="text-[11px] uppercase tracking-wider text-[#4a4a4a] mb-2">CSV Format</p>
              <p className="text-[11px] font-mono text-[#5a5a5a]">
                name,portfolio,party,constituency,is_cm,is_deputy_cm
              </p>
              <p className="text-[11px] font-mono text-[#3a3a3a] mt-1">
                Siddaramaiah,Chief Minister,Indian National Congress,Varuna,yes,no
              </p>
              <p className="text-[11px] font-mono text-[#3a3a3a]">
                D. K. Shivakumar,Deputy Chief Minister,INC,Kanakapura,no,yes
              </p>
            </div>
            <textarea
              className="input text-[12px] font-mono resize-none"
              rows={12}
              placeholder="Paste CSV here..."
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
            />
            <button onClick={parseCSV} disabled={!csvText.trim()}
              className="btn-primary text-sm py-2 px-4 justify-center">
              Parse CSV →
            </button>
          </div>
        ) : (
          /* Form mode */
          <div>
            {/* Stats bar */}
            <div className="flex gap-4 mb-4 text-[11px] text-[#4a4a4a]">
              <span>{ministers.filter(m => m.name).length} ministers</span>
              {cmCount > 0 && <span className="text-[#22c55e]">✓ CM set</span>}
              {deputyCount > 0 && <span className="text-[#3b82f6]">✓ Deputy CM set</span>}
            </div>

            {/* Header row */}
            <div className="hidden sm:grid grid-cols-[1fr_1.5fr_0.8fr_0.8fr_60px_60px_32px] gap-2 mb-1 px-1">
              {['Name','Portfolio','Party','Constituency','CM','Dy CM',''].map(h => (
                <p key={h} className="text-[10px] uppercase tracking-wider text-[#3a3a3a]">{h}</p>
              ))}
            </div>

            <div className="space-y-2">
              {ministers.map((m, i) => (
                <div key={i} className="space-y-1.5 sm:space-y-0">
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.5fr_0.8fr_0.8fr_60px_60px_32px] gap-2 items-center">
                    <input className="input text-sm py-1.5"
                      placeholder="Full name *"
                      value={m.name}
                      onChange={e => updateMinister(i, 'name', e.target.value)} />
                    <input className="input text-sm py-1.5"
                      placeholder="Portfolio / Ministry"
                      value={m.portfolio}
                      onChange={e => updateMinister(i, 'portfolio', e.target.value)} />
                    <input className="input text-sm py-1.5"
                      placeholder="Party"
                      value={m.party}
                      onChange={e => updateMinister(i, 'party', e.target.value)} />
                    <input className="input text-sm py-1.5"
                      placeholder="Constituency"
                      value={m.constituency}
                      onChange={e => updateMinister(i, 'constituency', e.target.value)} />
                    <label className="flex items-center gap-1.5 cursor-pointer justify-center">
                      <input type="checkbox" checked={m.is_cm}
                        onChange={e => updateMinister(i, 'is_cm', e.target.checked)}
                        className="w-3.5 h-3.5" />
                      <span className="text-[10px] text-[#4a4a4a] sm:hidden">CM/PM</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer justify-center">
                      <input type="checkbox" checked={m.is_deputy_cm}
                        onChange={e => updateMinister(i, 'is_deputy_cm', e.target.checked)}
                        className="w-3.5 h-3.5" />
                      <span className="text-[10px] text-[#4a4a4a] sm:hidden">Dy CM</span>
                    </label>
                    <button onClick={() => removeRow(i)}
                      className="text-[#3a3a3a] hover:text-[#ef4444] transition-colors text-center text-lg leading-none">
                      ×
                    </button>
                  </div>
                  {/* Minister type — shown for India (central govt) */}
                  {state === 'India' && !m.is_cm && (
                    <div className="sm:ml-0 pl-0">
                      <select className="input text-xs py-1 w-64"
                        value={m.minister_type ?? 'Cabinet Minister'}
                        onChange={e => updateMinister(i, 'minister_type', e.target.value)}>
                        {MINISTER_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button onClick={addRow}
              className="mt-3 text-[12px] text-[#3b82f6] hover:text-[#60a5fa] transition-colors flex items-center gap-1">
              + Add minister
            </button>
          </div>
        )}

        {error && (
          <p className="text-[12px] text-[#ef4444] bg-[#ef4444]/10 border border-[#ef4444]/20 rounded px-3 py-2 mt-4">
            {error}
          </p>
        )}

        {!csvMode && (
          <button onClick={handleSave} disabled={saving}
            className="btn-primary w-full justify-center py-3 text-sm mt-6">
            {saved ? '✓ Saved!' : saving
              ? 'Saving…'
              : `Save ${ministers.filter(m => m.name).length} Ministers for ${state}`}
          </button>
        )}
      </div>
    </div>
  );
}
