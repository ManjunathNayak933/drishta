'use client';

import { useState, useRef } from 'react';

const STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh',
  'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka',
  'Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
  'Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Puducherry',
];

const OPENAI_PROMPT = `You are analyzing an Indian state government budget document.
Extract and return ONLY a JSON object with exactly this structure, no markdown, no explanation:
{
  "total_outlay": "string like ₹4.09 lakh crore",
  "finance_minister": "name or null",
  "presented_on": "YYYY-MM-DD or null",
  "fiscal_deficit": "string like 2.9% of GSDP or null",
  "revenue_deficit": "string or null",
  "highlights": ["5-8 one-line key highlights"],
  "sector_allocations": [
    { "sector": "sector name", "amount": "₹X crore", "percent_change": "+12% or null", "notes": "brief note" }
  ],
  "key_schemes": [
    { "name": "scheme name", "allocation": "₹X crore", "beneficiaries": "who benefits", "category": "Health/Education/Agriculture/Infrastructure/Welfare/Employment/Other" }
  ],
  "tax_changes": ["list any tax changes announced"],
  "summary": "2-3 sentence plain English summary"
}
Extract every number and scheme you can find. Return only valid JSON.`;

export default function AdminBudgetUpload() {
  const [state, setState] = useState('Karnataka');
  const [year, setYear] = useState(new Date().getFullYear());
  const [pdfFile, setPdfFile] = useState(null);
  const [openaiKey, setOpenaiKey] = useState('');
  const [step, setStep] = useState('upload');
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const fileRef = useRef();

  async function loadPdfJs() {
    if (window.pdfjsLib) return;
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  async function extractText(file) {
    await loadPdfJs();
    const buffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: buffer }).promise;
    let text = '';
    const maxPages = Math.min(pdf.numPages, 60);
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(item => item.str).join(' ') + '\n';
    }
    return text;
  }

  async function handleAnalyze() {
    if (!pdfFile) { setError('Select a PDF file'); return; }
    if (!openaiKey.startsWith('sk-')) { setError('Enter valid OpenAI API key'); return; }

    setError(''); setStep('analyzing');

    try {
      setStatusMsg('Extracting text from PDF…');
      const text = await extractText(pdfFile);
      if (text.trim().length < 200) throw new Error('PDF has no extractable text — it may be a scanned image.');

      setStatusMsg(`Extracted ${Math.round(text.length/1000)}k characters. Sending to GPT-4o…`);
      const truncated = text.slice(0, 100000);

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          max_tokens: 4000,
          temperature: 0.1,
          messages: [
            { role: 'system', content: OPENAI_PROMPT },
            { role: 'user', content: `State: ${state}\nYear: ${year}-${String(year+1).slice(-2)}\n\n${truncated}` },
          ],
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? `OpenAI API error ${res.status}`);
      }

      const data = await res.json();
      const raw = data.choices[0].message.content.trim()
        .replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
      const result = JSON.parse(raw);

      setAnalysis(result);
      setStep('review');
    } catch (e) {
      setError(e.message);
      setStep('upload');
    }
  }

  async function handleSave() {
    setStep('saving');
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'saveBudget',
          state, year: parseInt(year),
          total_outlay:       analysis.total_outlay ?? null,
          presented_by:       analysis.finance_minister ?? null,
          presented_on:       analysis.presented_on ?? null,
          key_highlights:     analysis.highlights ?? [],
          sector_allocations: analysis.sector_allocations ?? [],
          key_schemes:        analysis.key_schemes ?? [],
          tax_changes:        analysis.tax_changes ?? [],
          fiscal_deficit:     analysis.fiscal_deficit ?? null,
          revenue_deficit:    analysis.revenue_deficit ?? null,
          summary:            analysis.summary ?? null,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setStep('done');
    } catch (e) {
      setError(e.message);
      setStep('review');
    }
  }

  if (step === 'done') return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-4xl mb-4">✓</p>
        <p className="font-serif text-xl text-white mb-1">{state} Budget {year} saved</p>
        <p className="text-[#5a5a5a] text-sm mb-6">AI analysis complete.</p>
        <div className="flex gap-3 justify-center">
          <a href={`/state/${encodeURIComponent(state)}`} className="btn-ghost text-sm py-2 px-4">
            View State Page →
          </a>
          <button onClick={() => { setStep('upload'); setAnalysis(null); setPdfFile(null); setError(''); }}
            className="btn-primary text-sm py-2 px-4 justify-center">
            Add Another
          </button>
        </div>
      </div>
    </div>
  );

  if (step === 'analyzing') return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center px-4">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-[#f59e0b] border-t-transparent rounded-full animate-spin mx-auto mb-4"/>
        <p className="text-white font-medium mb-2">Analyzing…</p>
        <p className="text-[#5a5a5a] text-sm max-w-xs">{statusMsg}</p>
      </div>
    </div>
  );

  if (step === 'review' || step === 'saving') return (
    <div className="min-h-screen bg-[#080808]">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <button onClick={() => setStep('upload')} className="text-[12px] text-[#4a4a4a] hover:text-white transition-colors mb-6 block">
          ← Re-upload
        </button>
        <h1 className="font-serif text-2xl font-bold text-white mb-1">
          {state} Budget {year}-{String(year+1).slice(-2)}
        </h1>
        <p className="text-[#5a5a5a] text-sm mb-6">Review the AI analysis before saving.</p>

        {/* Overview */}
        <div className="bg-[#0f0f0f] border border-[#f59e0b]/20 rounded-lg p-5 mb-4">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              {analysis.finance_minister && (
                <p className="text-[12px] text-[#5a5a5a]">Presented by {analysis.finance_minister}</p>
              )}
              <div className="flex gap-4 mt-2 flex-wrap">
                {analysis.fiscal_deficit && (
                  <span className="text-[11px] text-[#9a9a9a]">Fiscal deficit: <strong className="text-white">{analysis.fiscal_deficit}</strong></span>
                )}
                {analysis.revenue_deficit && (
                  <span className="text-[11px] text-[#9a9a9a]">Revenue deficit: <strong className="text-white">{analysis.revenue_deficit}</strong></span>
                )}
              </div>
            </div>
            {analysis.total_outlay && (
              <p className="text-[#f59e0b] font-mono font-bold text-xl whitespace-nowrap">{analysis.total_outlay}</p>
            )}
          </div>
          {analysis.summary && (
            <p className="text-[12px] text-[#7a7a7a] leading-relaxed border-t border-[#1a1a1a] pt-3">{analysis.summary}</p>
          )}
        </div>

        {/* Highlights */}
        {analysis.highlights?.length > 0 && (
          <Box title={`Highlights (${analysis.highlights.length})`}>
            <ul className="space-y-1.5">
              {analysis.highlights.map((h, i) => (
                <li key={i} className="text-[12px] text-[#8a8a8a] flex gap-2">
                  <span className="text-[#f59e0b] flex-shrink-0">•</span>{h}
                </li>
              ))}
            </ul>
          </Box>
        )}

        {/* Sectors */}
        {analysis.sector_allocations?.length > 0 && (
          <Box title={`Sector Allocations (${analysis.sector_allocations.length})`}>
            <div className="space-y-2">
              {analysis.sector_allocations.map((s, i) => (
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
          </Box>
        )}

        {/* Schemes */}
        {analysis.key_schemes?.length > 0 && (
          <Box title={`Key Schemes (${analysis.key_schemes.length})`}>
            <div className="space-y-2">
              {analysis.key_schemes.map((s, i) => (
                <div key={i} className="bg-[#0a0a0a] rounded p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-[#c0c0c0] font-medium">{s.name}</p>
                    <span className="text-[11px] font-mono text-[#f59e0b] flex-shrink-0">{s.allocation}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {s.category && <span className="text-[10px] px-1.5 py-0.5 bg-[#1a1a1a] text-[#5a5a5a] rounded">{s.category}</span>}
                    {s.beneficiaries && <p className="text-[11px] text-[#4a4a4a]">{s.beneficiaries}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Box>
        )}

        {/* Tax changes */}
        {analysis.tax_changes?.length > 0 && (
          <Box title="Tax Changes">
            <ul className="space-y-1">
              {analysis.tax_changes.map((t, i) => (
                <li key={i} className="text-[12px] text-[#8a8a8a] flex gap-2">
                  <span className="text-[#3b82f6] flex-shrink-0">•</span>{t}
                </li>
              ))}
            </ul>
          </Box>
        )}

        {error && (
          <p className="text-[12px] text-[#ef4444] bg-[#ef4444]/10 border border-[#ef4444]/20 rounded px-3 py-2 mb-4">
            {error}
          </p>
        )}

        <button onClick={handleSave} disabled={step === 'saving'}
          className="btn-primary w-full justify-center py-3 text-sm mt-2">
          {step === 'saving' ? 'Saving…' : 'Save to Database →'}
        </button>
      </div>
    </div>
  );

  // Upload form
  return (
    <div className="min-h-screen bg-[#080808]">
      <div className="max-w-xl mx-auto px-4 py-8">
        <a href="/admin" className="text-[12px] text-[#4a4a4a] hover:text-white transition-colors">← Back</a>
        <h1 className="font-serif text-2xl font-bold text-white mt-6 mb-2">Budget Analysis</h1>
        <p className="text-[#5a5a5a] text-sm mb-8">Upload budget PDF → GPT-4o extracts all data → save structured analysis.</p>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-xs">State</label>
              <select className="input py-2 text-sm mt-1" value={state} onChange={e => setState(e.target.value)}>
                {STATES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label-xs">Budget Year</label>
              <input type="number" className="input py-2 text-sm mt-1" value={year}
                onChange={e => setYear(parseInt(e.target.value))} min="2020" max="2030" />
            </div>
          </div>

          <div>
            <label className="label-xs">Budget PDF</label>
            <div onClick={() => fileRef.current?.click()}
              className={`mt-1 border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                pdfFile ? 'border-[#22c55e]/40 bg-[#22c55e]/5' : 'border-[#2a2a2a] hover:border-[#3a3a3a]'
              }`}>
              <input ref={fileRef} type="file" accept=".pdf" className="hidden"
                onChange={e => { setPdfFile(e.target.files?.[0] ?? null); setError(''); }} />
              {pdfFile ? (
                <>
                  <p className="text-[#22c55e] font-medium text-sm">{pdfFile.name}</p>
                  <p className="text-[#4a4a4a] text-[11px] mt-1">{(pdfFile.size/1024/1024).toFixed(1)} MB</p>
                </>
              ) : (
                <>
                  <p className="text-2xl mb-2">📄</p>
                  <p className="text-[#5a5a5a] text-sm">Click to select budget PDF</p>
                  <p className="text-[#3a3a3a] text-[11px] mt-1">Budget speech, highlights, or full budget document</p>
                </>
              )}
            </div>
          </div>

          <div>
            <label className="label-xs">OpenAI API Key</label>
            <input type="password" className="input py-2 text-sm font-mono mt-1"
              placeholder="sk-..." value={openaiKey} onChange={e => setOpenaiKey(e.target.value)} />
            <p className="text-[11px] text-[#3a3a3a] mt-1">Used only in your browser, never stored or sent to our server.</p>
          </div>

          {error && (
            <p className="text-[12px] text-[#ef4444] bg-[#ef4444]/10 border border-[#ef4444]/20 rounded px-3 py-2">
              {error}
            </p>
          )}

          <button onClick={handleAnalyze}
            disabled={!pdfFile || !openaiKey}
            className="btn-primary w-full justify-center py-3 text-sm">
            Analyze with GPT-4o →
          </button>
        </div>
      </div>
    </div>
  );
}

function Box({ title, children }) {
  return (
    <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-lg p-4 mb-4">
      <p className="text-[10px] uppercase tracking-wider text-[#4a4a4a] mb-3">{title}</p>
      {children}
    </div>
  );
}
