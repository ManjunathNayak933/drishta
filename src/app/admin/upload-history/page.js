'use client';

import { useState } from 'react';

const SAMPLE_CSV = `constituency_name,state,type,term_year,mla_name,party
Varuna,Karnataka,VS,2023,Siddaramaiah,Indian National Congress
Varuna,Karnataka,VS,2018,Yathindra Siddaramaiah,Indian National Congress
Varuna,Karnataka,VS,2013,Siddaramaiah,Indian National Congress
Udupi Chikmagalur,Karnataka,LS,2024,Kota Srinivas Poojary,Bharatiya Janata Party
Udupi Chikmagalur,Karnataka,LS,2019,Shobha Karandlaje,Bharatiya Janata Party`;

function parseCSV(text) {
  const lines = text.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return { rows: [], errors: ['CSV must have a header row and at least one data row'] };

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const required = ['constituency_name', 'state', 'term_year', 'mla_name'];
  const missing = required.filter(r => !headers.includes(r));
  if (missing.length) return { rows: [], errors: [`Missing columns: ${missing.join(', ')}`] };

  const rows = [];
  const errors = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    const row = {};
    headers.forEach((h, idx) => { row[h] = cells[idx] ?? ''; });

    const year = parseInt(row.term_year);
    if (!row.constituency_name) { errors.push(`Row ${i + 1}: missing constituency_name`); continue; }
    if (!row.state) { errors.push(`Row ${i + 1}: missing state`); continue; }
    if (!row.mla_name) { errors.push(`Row ${i + 1}: missing mla_name`); continue; }
    if (isNaN(year) || year < 1950 || year > 2030) { errors.push(`Row ${i + 1}: invalid year ${row.term_year}`); continue; }

    rows.push({
      constituency_name: row.constituency_name,
      state: row.state,
      type: row.type || 'VS',
      term_year: year,
      name: row.mla_name,
      party: row.party ?? null,
    });
  }

  return { rows, errors };
}

export default function AdminCSVUpload() {
  const [csvText, setCsvText] = useState('');
  const [parsed, setParsed] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [errors, setErrors] = useState([]);

  function handleParse() {
    const { rows, errors } = parseCSV(csvText);
    setParsed(rows);
    setErrors(errors);
    setResult(null);
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setCsvText(ev.target.result);
      const { rows, errors } = parseCSV(ev.target.result);
      setParsed(rows);
      setErrors(errors);
    };
    reader.readAsText(file);
  }

  async function handleUpload() {
    if (!parsed?.length) return;
    setUploading(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bulkUploadHistory', rows: parsed }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (e) {
      setErrors(prev => [...prev, e.message]);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#080808]">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <a href="/admin" className="text-[12px] text-[#4a4a4a] hover:text-white transition-colors">← Back to Admin</a>
        </div>

        <h1 className="font-serif text-2xl font-bold text-white mb-2">Bulk Upload History</h1>
        <p className="text-[#5a5a5a] text-sm mb-8">Upload a CSV to bulk-insert MLA history for multiple constituencies at once.</p>

        {/* Format guide */}
        <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-lg p-4 mb-6">
          <p className="text-[11px] uppercase tracking-wider text-[#4a4a4a] mb-3">Required CSV format</p>
          <pre className="text-[11px] font-mono text-[#6a6a6a] overflow-x-auto whitespace-pre leading-relaxed">
{`constituency_name  — exact name as in your DB (e.g. Varuna, KARKALA)
state              — exact state name (e.g. Karnataka, Goa)
type               — VS for MLA constituency, LS for MP constituency (default: VS)
term_year          — election year (e.g. 2023, 2018)
mla_name           — winner's name
party              — party name (optional)`}
          </pre>
        </div>

        {/* Upload area */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-2">Upload CSV file</label>
            <input type="file" accept=".csv,.txt"
              onChange={handleFile}
              className="block w-full text-sm text-[#6a6a6a] file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:bg-[#1a1a1a] file:text-[#9a9a9a] hover:file:bg-[#2a2a2a] file:cursor-pointer cursor-pointer" />
          </div>

          <div className="flex items-center gap-3 text-[#3a3a3a] text-[11px]">
            <div className="flex-1 h-px bg-[#1a1a1a]"/>
            or paste CSV below
            <div className="flex-1 h-px bg-[#1a1a1a]"/>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] uppercase tracking-wider text-[#5a5a5a]">Paste CSV</label>
              <button onClick={() => setCsvText(SAMPLE_CSV)}
                className="text-[11px] text-[#3b82f6] hover:underline">
                Load sample data
              </button>
            </div>
            <textarea
              className="input text-[12px] font-mono resize-none"
              rows={8}
              placeholder="constituency_name,state,term_year,mla_name,party&#10;Varuna,Karnataka,2023,Siddaramaiah,Indian National Congress"
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
            />
          </div>

          <div className="flex gap-3">
            <button onClick={handleParse} disabled={!csvText.trim()}
              className="btn-ghost text-sm py-2 px-4 flex-1">
              Parse & Preview
            </button>
            <button onClick={handleUpload}
              disabled={!parsed?.length || uploading}
              className="btn-primary text-sm py-2 px-4 flex-1 justify-center">
              {uploading ? 'Uploading…' : `Upload ${parsed?.length ?? 0} rows`}
            </button>
          </div>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg p-4 mb-6">
            <p className="text-[11px] uppercase tracking-wider text-[#ef4444] mb-2">Issues found</p>
            {errors.map((e, i) => (
              <p key={i} className="text-[12px] text-[#ef4444]/80">{e}</p>
            ))}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-lg p-4 mb-6">
            <p className="text-[11px] uppercase tracking-wider text-[#22c55e] mb-1">Upload complete</p>
            <p className="text-sm text-[#22c55e]">
              ✓ {result.inserted} rows inserted, {result.skipped} skipped
            </p>
            {result.notFound?.length > 0 && (
              <div className="mt-2">
                <p className="text-[11px] text-[#f59e0b]">Constituencies not found in DB:</p>
                {result.notFound.map((n, i) => (
                  <p key={i} className="text-[11px] text-[#f59e0b]/70 font-mono">{n}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Preview table */}
        {parsed && parsed.length > 0 && (
          <div>
            <p className="text-[11px] uppercase tracking-wider text-[#4a4a4a] mb-3">
              Preview — {parsed.length} rows
            </p>
            <div className="border border-[#1f1f1f] rounded-lg overflow-hidden overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-[#1f1f1f] bg-[#0f0f0f]">
                    {['Constituency', 'State', 'Type', 'Year', 'MLA/MP', 'Party'].map(h => (
                      <th key={h} className="text-left px-3 py-2 text-[#4a4a4a] font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.slice(0, 50).map((row, i) => (
                    <tr key={i} className="border-b border-[#0f0f0f] hover:bg-[#0f0f0f]">
                      <td className="px-3 py-2 text-[#c0c0c0]">{row.constituency_name}</td>
                      <td className="px-3 py-2 text-[#6a6a6a]">{row.state}</td>
                      <td className="px-3 py-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${row.type === 'LS' ? 'bg-[#3b82f6]/10 text-[#3b82f6]' : 'bg-[#f59e0b]/10 text-[#f59e0b]'}`}>
                          {row.type ?? 'VS'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-[#6a6a6a] font-mono">{row.term_year}</td>
                      <td className="px-3 py-2 text-[#c0c0c0]">{row.name}</td>
                      <td className="px-3 py-2 text-[#6a6a6a]">{row.party ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsed.length > 50 && (
                <p className="text-[11px] text-[#3a3a3a] p-3">…and {parsed.length - 50} more rows</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
