'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import { searchPoliticians, getStates, getConstituenciesByState, submitPromise, uploadFile } from '@/lib/api';

const CATEGORIES = ['Infrastructure','Water','Employment','Health','Education','Electricity','Women Safety','Agriculture','Other'];
const SOURCES    = ['Speech','Manifesto','Press Release','Social Media','Interview','Other'];
const LEVELS     = ['Ward','Taluk','District','MLA','MP'];

export default function SubmitPromisePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [polSearch, setPolSearch] = useState('');
  const [polResults, setPolResults] = useState([]);
  const [selectedPolitician, setSelectedPolitician] = useState(null);
  const [manualEntry, setManualEntry] = useState(false);
  const [proofFile, setProofFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // For manual entry dropdowns
  const [states, setStates] = useState([]);
  const [constituencies, setConstituencies] = useState([]);

  const [form, setForm] = useState({
    politician_name: '', politician_level: 'MLA',
    state: '', constituency_name: '', party: '',
    promise_text: '', promise_category: '',
    date_made: '', source: 'Speech',
    source_url: '', source_description: '', added_by_email: '',
  });

  useEffect(() => { getStates().then(setStates).catch(console.error); }, []);

  useEffect(() => {
    if (!form.state) { setConstituencies([]); return; }
    getConstituenciesByState(form.state).then(setConstituencies).catch(console.error);
  }, [form.state]);

  function set(field) {
    return (e) => setForm(f => ({ ...f, [field]: e.target.value }));
  }

  async function searchPol(q) {
    setPolSearch(q);
    if (q.length < 2) { setPolResults([]); return; }
    const r = await searchPoliticians(q).catch(() => []);
    setPolResults(r);
  }

  function selectPolitician(p) {
    setSelectedPolitician(p);
    setPolSearch(p.name);
    setPolResults([]);
    setForm(f => ({
      ...f,
      politician_name: p.name, politician_level: p.level,
      state: p.state, constituency_name: p.constituency_name ?? '',
      party: p.party ?? '',
    }));
    setStep(2);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      let proofUrl = null;
      if (proofFile) {
        proofUrl = await uploadFile('uploads', `proof/${Date.now()}-${proofFile.name}`, proofFile);
      }
      await submitPromise({ ...form, proof_url: proofUrl });
      setDone(true);
    } catch (err) {
      alert('Submission failed: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center text-center px-4">
        <div className="text-4xl mb-4">✓</div>
        <h2 className="font-serif text-2xl font-bold text-white mb-2">Promise submitted</h2>
        <p className="text-[#6a6a6a] text-sm max-w-sm mb-6">Your submission is under review and will go live once verified.</p>
        <div className="flex gap-3">
          <button className="btn-ghost" onClick={() => router.push('/promises')}>Browse Promises</button>
          <button className="btn-primary" onClick={() => { setDone(false); setStep(1); setSelectedPolitician(null); setPolSearch(''); }}>Submit another</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <Navbar active="promises"/>
      <div className="max-w-narrow mx-auto px-4 py-12">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-10">
          {[1,2,3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-colors ${step >= s ? 'bg-white text-black' : 'bg-[#1a1a1a] text-[#4a4a4a]'}`}>{s}</div>
              {s < 3 && <div className={`h-px flex-1 w-12 ${step > s ? 'bg-white' : 'bg-[#2a2a2a]'}`}/>}
            </div>
          ))}
          <span className="text-[11px] text-[#5a5a5a] ml-2 uppercase tracking-wider">
            {step === 1 ? 'Politician' : step === 2 ? 'Promise Details' : 'Your Info'}
          </span>
        </div>

        {/* STEP 1: Politician search */}
        {step === 1 && (
          <div className="animate-fade-up">
            <h1 className="font-serif text-2xl font-bold text-white mb-2">Who made this promise?</h1>
            <p className="text-[#5a5a5a] text-sm mb-8">Search by name, or enter manually if not found.</p>

            <div className="relative mb-4">
              <input className="input text-sm" placeholder="Type politician name…"
                value={polSearch} onChange={e => searchPol(e.target.value)} autoFocus/>
              {polResults.length > 0 && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg overflow-hidden shadow-xl">
                  {polResults.map(p => (
                    <button key={p.id} className="w-full text-left px-4 py-3 text-sm hover:bg-[#222] transition-colors flex items-center gap-3"
                      onClick={() => selectPolitician(p)}>
                      {p.photo_url && <img src={p.photo_url} alt={p.name} className="w-8 h-8 rounded-full object-cover"/>}
                      <div>
                        <p className="text-white font-medium">{p.name}</p>
                        <p className="text-[11px] text-[#5a5a5a]">{p.level} · {p.party} · {p.constituency_name}, {p.state}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button className="text-[12px] text-[#5a5a5a] hover:text-white transition-colors"
              onClick={() => { setManualEntry(true); setStep(2); }}>
              Not found? Enter manually →
            </button>
          </div>
        )}

        {/* STEP 2: Promise details */}
        {step === 2 && (
          <form className="animate-fade-up space-y-5">
            <div>
              <h1 className="font-serif text-2xl font-bold text-white mb-1">The Promise</h1>
              {selectedPolitician && (
                <p className="text-[#5a5a5a] text-sm">
                  Adding for <strong className="text-[#9a9a9a]">{selectedPolitician.name}</strong>
                </p>
              )}
            </div>

            {/* Manual entry fields */}
            {manualEntry && (
              <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-4 space-y-4">
                <p className="text-[11px] uppercase tracking-wider text-[#4a4a4a]">Politician Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">Full Name *</label>
                    <input className="input text-sm" value={form.politician_name} onChange={set('politician_name')} required/>
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">Level *</label>
                    <select className="input select text-sm" value={form.politician_level} onChange={set('politician_level')}>
                      {LEVELS.map(l => <option key={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">State *</label>
                    <select className="input select text-sm" value={form.state} onChange={set('state')} required>
                      <option value="">Select state…</option>
                      {states.map(s => <option key={s.state} value={s.state}>{s.state}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">Constituency</label>
                    {constituencies.length > 0 ? (
                      <select className="input select text-sm" value={form.constituency_name}
                        onChange={e => setForm(f => ({ ...f, constituency_name: e.target.value }))}>
                        <option value="">Select constituency…</option>
                        {constituencies.map(c => (
                          <option key={c.id} value={c.name}>{c.name} ({c.type === 'LS' ? 'Lok Sabha' : 'Vidhan Sabha'})</option>
                        ))}
                      </select>
                    ) : (
                      <input className="input text-sm" placeholder="Enter constituency name"
                        value={form.constituency_name} onChange={set('constituency_name')}/>
                    )}
                  </div>
                  <div className="col-span-full">
                    <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">Party</label>
                    <input className="input text-sm" value={form.party} onChange={set('party')}/>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">
                Promise Text * <span className="normal-case text-[#3a3a3a] text-[10px]">(min 20 chars)</span>
              </label>
              <textarea className="input resize-none text-sm" rows={4}
                placeholder="What exactly was promised?"
                value={form.promise_text} onChange={set('promise_text')} minLength={20} required/>
              <p className="text-[11px] text-[#4a4a4a] mt-1 text-right">{form.promise_text.length} chars</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">Category *</label>
                <select className="input select text-sm" value={form.promise_category} onChange={set('promise_category')} required>
                  <option value="">Select…</option>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">Date Made</label>
                <input type="date" className="input text-sm" value={form.date_made} onChange={set('date_made')}/>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">Source Type *</label>
                <select className="input select text-sm" value={form.source} onChange={set('source')} required>
                  {SOURCES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">Source URL</label>
                <input type="url" className="input text-sm" placeholder="https://…" value={form.source_url} onChange={set('source_url')}/>
              </div>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">Source Description</label>
              <input className="input text-sm" placeholder="e.g. Election rally speech, 12 Nov 2023"
                value={form.source_description} onChange={set('source_description')}/>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">Proof (image or PDF, optional)</label>
              <input type="file" accept="image/*,.pdf"
                className="text-sm text-[#6a6a6a] file:mr-3 file:py-1.5 file:px-3 file:border file:border-[#2a2a2a] file:bg-[#1a1a1a] file:text-[#9a9a9a] file:text-xs file:rounded cursor-pointer"
                onChange={e => setProofFile(e.target.files?.[0] ?? null)}/>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" className="btn-ghost" onClick={() => setStep(1)}>← Back</button>
              <button type="button" className="btn-primary"
                disabled={!form.promise_text || form.promise_text.length < 20 || !form.promise_category}
                onClick={() => setStep(3)}>
                Continue →
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Contact info */}
        {step === 3 && (
          <form onSubmit={handleSubmit} className="animate-fade-up space-y-5">
            <div>
              <h1 className="font-serif text-2xl font-bold text-white mb-1">Your details</h1>
              <p className="text-[#5a5a5a] text-sm">Your email is for verification only and never shown publicly.</p>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">Email Address *</label>
              <input type="email" className="input text-sm" placeholder="you@example.com"
                value={form.added_by_email} onChange={set('added_by_email')} required/>
            </div>

            {/* Summary */}
            <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-5 text-sm space-y-2">
              <p className="text-[10px] tracking-wider uppercase text-[#4a4a4a] mb-3">Summary</p>
              <p className="text-[#9a9a9a]"><span className="text-[#5a5a5a]">Politician:</span> {form.politician_name} ({form.politician_level})</p>
              {form.constituency_name && <p className="text-[#9a9a9a]"><span className="text-[#5a5a5a]">Constituency:</span> {form.constituency_name}, {form.state}</p>}
              <p className="text-[#9a9a9a]"><span className="text-[#5a5a5a]">Category:</span> {form.promise_category}</p>
              <p className="text-[#9a9a9a]"><span className="text-[#5a5a5a]">Promise:</span> "{form.promise_text.slice(0, 80)}{form.promise_text.length > 80 ? '…' : ''}"</p>
              <p className="text-[#4a4a4a] text-[12px] mt-3 pt-3 border-t border-[#1a1a1a]">
                Submissions are reviewed before going live.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" className="btn-ghost" onClick={() => setStep(2)}>← Back</button>
              <button type="submit" className="btn-primary" disabled={submitting || !form.added_by_email}>
                {submitting ? 'Submitting…' : 'Submit Promise'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
