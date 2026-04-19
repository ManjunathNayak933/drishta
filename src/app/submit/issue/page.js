'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import { getStates, getConstituenciesByState, getPoliticiansByConstituency, submitIssue, uploadFile } from '@/lib/api';

const CATEGORIES = ['Roads','Water Supply','Electricity','Sanitation','Public Safety','Healthcare','Education','Other'];

export default function SubmitIssuePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [states, setStates] = useState([]);
  const [constituencies, setConstituencies] = useState([]);
  const [taggedMLA, setTaggedMLA] = useState(null);
  const [taggedMP, setTaggedMP] = useState(null);
  const [taggedMinisters, setTaggedMinisters] = useState([]); // [{id, name, portfolio, state}]
  const [ministerSearch, setMinisterSearch] = useState('');
  const [ministerResults, setMinisterResults] = useState([]);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);

  const [form, setForm] = useState({
    state: '',
    constituency_id: '',
    constituency_name: '',
    title: '',
    category: '',
    description: '',
    location_text: '',
    ward: '',
    submitter_name: '',
    submitter_email: '',
  });

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  useEffect(() => {
    getStates().then(setStates).catch(console.error);
  }, []);

  useEffect(() => {
    if (!form.state) { setConstituencies([]); return; }
    getConstituenciesByState(form.state).then(setConstituencies).catch(console.error);
  }, [form.state]);

  useEffect(() => {
    if (!form.constituency_id) { setTaggedMLA(null); setTaggedMP(null); return; }
    getPoliticiansByConstituency(form.constituency_id).then((pols) => {
      setTaggedMLA(pols.find((p) => p.level === 'MLA') ?? null);
      setTaggedMP(pols.find((p) => p.level === 'MP') ?? null);
    }).catch(console.error);
  }, [form.constituency_id]);

  // Minister search
  async function searchMinisters(q) {
    setMinisterSearch(q);
    if (q.length < 2) { setMinisterResults([]); return; }
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data } = await supabase
        .from('state_ministers')
        .select('id, name, portfolio, state, is_cm, is_deputy_cm, minister_type')
        .ilike('name', `%${q}%`)
        .limit(8);
      setMinisterResults(data ?? []);
    } catch { setMinisterResults([]); }
  }

  function tagMinister(m) {
    if (!taggedMinisters.find(x => x.id === m.id)) {
      setTaggedMinisters(prev => [...prev, m]);
    }
    setMinisterSearch(''); setMinisterResults([]);
  }

  function untagMinister(id) {
    setTaggedMinisters(prev => prev.filter(m => m.id !== id));
  }
  function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!photoFile) { alert('Photo is required.'); return; }
    setSubmitting(true);
    try {
      const path = `issues/${Date.now()}-${photoFile.name.replace(/[^a-z0-9.]/gi, '-')}`;
      const photoUrl = await uploadFile('uploads', path, photoFile);

      const constituency = constituencies.find((c) => c.id === form.constituency_id);

      const issue = await submitIssue({
        ...form,
        photo_url: photoUrl,
        constituency_name: constituency?.name ?? form.constituency_name,
        mla_id: taggedMLA?.id ?? null,
        mla_name: taggedMLA?.name ?? null,
        mp_id: taggedMP?.id ?? null,
        mp_name: taggedMP?.name ?? null,
        tagged_minister_ids: taggedMinisters.map(m => m.id),
        minister_names: taggedMinisters.map(m => m.name),
      });
      setDone(issue);
    } catch (err) {
      alert('Submission failed: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center text-center px-4">
        <div className="w-full max-w-sm">
          <div className="aspect-video overflow-hidden rounded-xl mb-5 bg-[#141414]">
            {photoPreview && <img src={photoPreview} alt="" className="w-full h-full object-cover" />}
          </div>
          <div className="text-3xl mb-3">✓</div>
          <h2 className="font-serif text-2xl font-bold text-white mb-2">Issue posted live</h2>
          <p className="text-[#6a6a6a] text-sm mb-6">Your issue is now public. Share it to spread awareness.</p>
          <div className="flex flex-col gap-3">
            <a href={`/issue/${done.id}/${done.slug}`} className="btn-primary justify-center">
              View your issue →
            </a>
            <button className="btn-ghost justify-center" onClick={() => router.push('/issues')}>
              Browse all issues
            </button>
          </div>
        </div>
      </div>
    );
  }

  const STEPS = ['Location', 'The Issue', 'Photo Evidence', 'Your Details'];

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <Navbar active="issues" />
      <div className="max-w-narrow mx-auto px-4 py-12">

        {/* Progress */}
        <div className="flex items-center gap-2 mb-10">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-colors ${step > i + 1 ? 'bg-[#22c55e] text-black' : step === i + 1 ? 'bg-white text-black' : 'bg-[#1a1a1a] text-[#4a4a4a]'}`}>
                {step > i + 1 ? '✓' : i + 1}
              </div>
              {i < STEPS.length - 1 && <div className={`h-px w-6 sm:w-10 ${step > i + 1 ? 'bg-[#22c55e]' : 'bg-[#2a2a2a]'}`} />}
            </div>
          ))}
        </div>

        {/* ─── STEP 1: Location ─── */}
        {step === 1 && (
          <div className="animate-fade-up space-y-6">
            <h1 className="font-serif text-2xl font-bold text-white">Where is the issue?</h1>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">State *</label>
              <select className="input select text-sm" value={form.state} onChange={set('state')} required>
                <option value="">Select state…</option>
                {states.map((s) => <option key={s.state} value={s.state}>{s.state}</option>)}
              </select>
            </div>

            {form.state && (
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">Constituency *</label>
                <select
                  className="input select text-sm"
                  value={form.constituency_id}
                  onChange={(e) => {
                    const c = constituencies.find((c) => c.id === e.target.value);
                    setForm((f) => ({
                      ...f,
                      constituency_id: e.target.value,
                      constituency_name: c?.name ?? '',
                    }));
                  }}
                  required
                >
                  <option value="">Select constituency…</option>
                  {constituencies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                  ))}
                </select>
              </div>
            )}

            {/* Tagged politicians preview */}
            {(taggedMLA || taggedMP) && (
              <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4">
                <p className="text-[10px] tracking-wider uppercase text-[#4a4a4a] mb-3">
                  This issue will be tagged to:
                </p>
                <div className="space-y-3">
                  {[taggedMLA, taggedMP].filter(Boolean).map((p) => (
                    <div key={p.id} className="flex items-center gap-3">
                      {p.photo_url ? (
                        <img src={p.photo_url} alt={p.name} className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-[#1a1a1a] flex items-center justify-center text-[#3a3a3a] text-sm font-serif">
                          {p.name[0]}
                        </div>
                      )}
                      <div>
                        <p className="text-[13px] text-white font-medium">{p.name}</p>
                        <p className="text-[11px] text-[#5a5a5a]">{p.level} · {p.party}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Minister tagging — optional */}
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4">
              <p className="text-[10px] tracking-wider uppercase text-[#4a4a4a] mb-2">
                Tag a Minister (optional)
              </p>
              <p className="text-[11px] text-[#3a3a3a] mb-3">
                Is this issue related to a state or central minister's portfolio? Tag them directly.
              </p>

              {/* Tagged minister pills */}
              {taggedMinisters.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {taggedMinisters.map(m => (
                    <span key={m.id} className="inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-full border border-[#22c55e]/30 text-[#22c55e] bg-[#22c55e]/5">
                      {m.name}
                      {m.state && <span className="text-[#3a6a4a]">· {m.state}</span>}
                      <button onClick={() => untagMinister(m.id)} className="text-[#3a6a4a] hover:text-[#ef4444] ml-0.5">×</button>
                    </span>
                  ))}
                </div>
              )}

              <div className="relative">
                <input className="input text-sm py-2 w-full"
                  placeholder="Search minister by name…"
                  value={ministerSearch}
                  onChange={e => searchMinisters(e.target.value)} />
                {ministerResults.length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg max-h-48 overflow-y-auto shadow-xl">
                    {ministerResults.map(m => (
                      <button key={m.id} onClick={() => tagMinister(m)}
                        className="w-full text-left px-3 py-2.5 text-sm hover:bg-[#222] transition-colors border-b border-[#1f1f1f] last:border-0">
                        <p className="text-white font-medium">{m.name}</p>
                        <p className="text-[11px] text-[#4a4a4a]">
                          {m.is_cm ? 'Chief Minister' : m.is_deputy_cm ? 'Deputy CM' : (m.minister_type ?? 'Minister')}
                          {m.portfolio ? ` · ${m.portfolio.split(',')[0]}` : ''}
                          {m.state ? ` · ${m.state}` : ''}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button
              className="btn-primary w-full justify-center"
              disabled={!form.state || !form.constituency_id}
              onClick={() => setStep(2)}
            >
              Continue →
            </button>
          </div>
        )}

        {/* ─── STEP 2: Issue details ─── */}
        {step === 2 && (
          <form className="animate-fade-up space-y-5">
            <h1 className="font-serif text-2xl font-bold text-white">What is the issue?</h1>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">
                Title * <span className="normal-case text-[#3a3a3a]">(one clear line, max 100 chars)</span>
              </label>
              <input
                className="input text-sm"
                placeholder="e.g. Broken road outside St. Mary's School for 8 months"
                value={form.title}
                onChange={set('title')}
                maxLength={100}
                required
              />
              <p className="text-[11px] text-[#4a4a4a] text-right mt-1">{form.title.length}/100</p>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">Category *</label>
              <select className="input select text-sm" value={form.category} onChange={set('category')} required>
                <option value="">Select…</option>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">
                Description * <span className="normal-case text-[#3a3a3a]">(min 50 chars)</span>
              </label>
              <textarea
                className="input resize-none text-sm"
                rows={5}
                placeholder="Describe the issue. When did it start? Who has it affected? What has been done (or not done)?"
                value={form.description}
                onChange={set('description')}
                minLength={50}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">Location detail (optional)</label>
                <input className="input text-sm" placeholder="Near LIC building, Main Road" value={form.location_text} onChange={set('location_text')} />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">Ward (optional)</label>
                <input className="input text-sm" placeholder="Ward 14" value={form.ward} onChange={set('ward')} />
              </div>
            </div>

            <div className="flex gap-3">
              <button type="button" className="btn-ghost" onClick={() => setStep(1)}>← Back</button>
              <button
                type="button"
                className="btn-primary"
                disabled={!form.title || !form.category || form.description.length < 50}
                onClick={() => setStep(3)}
              >
                Continue →
              </button>
            </div>
          </form>
        )}

        {/* ─── STEP 3: Photo ─── */}
        {step === 3 && (
          <div className="animate-fade-up space-y-6">
            <div>
              <h1 className="font-serif text-2xl font-bold text-white mb-1">Photo Evidence</h1>
              <p className="text-[#ef4444] text-sm font-medium">A photo is required. No photo, no post.</p>
              <p className="text-[#5a5a5a] text-[13px] mt-1">Your photo is public evidence. Make it clear.</p>
            </div>

            <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl cursor-pointer transition-colors aspect-video overflow-hidden
              ${photoPreview ? 'border-[#3a3a3a]' : 'border-[#2a2a2a] hover:border-[#3a3a3a]'}`}
            >
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-3 py-12 text-center px-6">
                  <div className="w-14 h-14 rounded-full bg-[#1a1a1a] flex items-center justify-center text-2xl">📷</div>
                  <p className="text-[#6a6a6a] text-sm">Click to upload a photo</p>
                  <p className="text-[11px] text-[#4a4a4a]">JPG, PNG, HEIC · Max 10MB</p>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </label>

            {photoPreview && (
              <button
                className="text-[12px] text-[#5a5a5a] hover:text-[#ef4444] transition-colors"
                onClick={() => { setPhotoPreview(null); setPhotoFile(null); }}
              >
                Remove photo
              </button>
            )}

            <div className="flex gap-3">
              <button type="button" className="btn-ghost" onClick={() => setStep(2)}>← Back</button>
              <button
                type="button"
                className="btn-primary"
                disabled={!photoFile}
                onClick={() => setStep(4)}
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 4: Submitter details ─── */}
        {step === 4 && (
          <form onSubmit={handleSubmit} className="animate-fade-up space-y-5">
            <h1 className="font-serif text-2xl font-bold text-white">Your Details</h1>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">
                Display Name (optional — shown on the issue)
              </label>
              <input className="input text-sm" placeholder="Anonymous" value={form.submitter_name} onChange={set('submitter_name')} />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">
                Email * <span className="normal-case text-[#3a3a3a]">(for updates — not shown publicly)</span>
              </label>
              <input type="email" className="input text-sm" placeholder="you@example.com" value={form.submitter_email} onChange={set('submitter_email')} required />
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" required className="mt-0.5 accent-white" />
              <span className="text-[13px] text-[#7a7a7a]">
                I confirm this issue is real and the photo is genuine.
              </span>
            </label>

            <div className="flex gap-3 pt-2">
              <button type="button" className="btn-ghost" onClick={() => setStep(3)}>← Back</button>
              <button type="submit" className="btn-primary" disabled={submitting || !form.submitter_email}>
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.2"/>
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Posting…
                  </span>
                ) : 'Post Issue Live'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
