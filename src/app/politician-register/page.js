'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';

const STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh',
  'Goa','Gujarat','Haryana','Himachal Pradesh','Jammu and Kashmir','Jharkhand','Karnataka','Ladakh',
  'Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
  'Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Puducherry',
];

function normalizeName(str) {
  if (!str) return '';
  return str
    .replace(/^\s*(Shri|Smt|Dr|Prof|Adv|Kumari|Sh|Mr|Mrs|Ms)\s+/gi, '')
    .replace(/([A-Za-z])\.([A-Za-z])/g, '$1 $2')
    .replace(/\s+/g, ' ').trim()
    .split(' ').filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export default function PoliticianRegisterPage() {
  const [form, setForm] = useState({
    full_name: '', phone: '', email: '',
    level: 'MLA', state: '', constituency: '',
  });
  const [idFile, setIdFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }));
  }

  function handleNameBlur() {
    setForm(f => ({ ...f, full_name: normalizeName(f.full_name) }));
  }

  async function handleSubmit() {
    if (!form.full_name || !form.phone || !form.email || !form.state || !form.constituency) {
      setError('Please fill in all required fields'); return;
    }
    setSubmitting(true); setError('');
    try {
      const body = new FormData();
      Object.entries(form).forEach(([k, v]) => body.append(k, v));
      if (idFile) body.append('id_proof', idFile);

      const res = await fetch('/api/politician-register', { method: 'POST', body });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDone(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) return (
    <div className="min-h-screen bg-[#080808]">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <p className="text-4xl mb-4">✓</p>
        <h1 className="font-serif text-2xl font-bold text-white mb-3">Request submitted</h1>
        <p className="text-[#5a5a5a] text-sm mb-8 leading-relaxed">
          Our team will verify your identity and approve your profile within 2–3 working days.
          You'll receive an email at <strong className="text-white">{form.email}</strong> with login details once approved.
        </p>
        <Link href="/" className="btn-ghost text-sm py-2 px-4">Back to home</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#080808]">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 py-12">
        <h1 className="font-serif text-3xl font-black text-white mb-2">Register your profile</h1>
        <p className="text-[#5a5a5a] text-sm mb-8 leading-relaxed">
          Are you an elected MLA or MP? Create your official profile on Drishta to engage with
          your constituents, respond to issues, and publish your record.
        </p>

        <div className="space-y-4">
          {/* Level */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">I am a</label>
            <div className="flex gap-3">
              {['MLA', 'MP'].map(l => (
                <button key={l} onClick={() => setForm(f => ({ ...f, level: l }))}
                  className={`flex-1 py-2.5 rounded text-sm font-medium transition-colors border ${
                    form.level === l
                      ? l === 'MP' ? 'bg-[#3b82f6]/20 border-[#3b82f6]/50 text-[#3b82f6]'
                                   : 'bg-[#f59e0b]/20 border-[#f59e0b]/50 text-[#f59e0b]'
                      : 'bg-transparent border-[#2a2a2a] text-[#5a5a5a] hover:border-[#3a3a3a]'
                  }`}>
                  {l === 'MLA' ? 'MLA (State Assembly)' : 'MP (Parliament)'}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">Full name *</label>
            <input className="input py-2.5 text-sm" placeholder="As on official records"
              value={form.full_name}
              onChange={set('full_name')}
              onBlur={handleNameBlur} />
            <p className="text-[11px] text-[#3a3a3a] mt-1">Titles (Shri, Dr etc.) will be removed automatically</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">State *</label>
              <select className="input py-2.5 text-sm" value={form.state} onChange={set('state')}>
                <option value="">Select state</option>
                {STATES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">Constituency *</label>
              <input className="input py-2.5 text-sm" placeholder="e.g. Varuna"
                value={form.constituency} onChange={set('constituency')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">Phone *</label>
              <input className="input py-2.5 text-sm" placeholder="+91 XXXXX XXXXX"
                value={form.phone} onChange={set('phone')} />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">Email *</label>
              <input type="email" className="input py-2.5 text-sm" placeholder="Official email"
                value={form.email} onChange={set('email')} />
            </div>
          </div>

          {/* ID proof */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">
              Identity proof (optional but recommended)
            </label>
            <div onClick={() => document.getElementById('id-upload').click()}
              className={`border border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                idFile ? 'border-[#22c55e]/40 bg-[#22c55e]/5' : 'border-[#2a2a2a] hover:border-[#3a3a3a]'
              }`}>
              <input id="id-upload" type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                onChange={e => setIdFile(e.target.files?.[0] ?? null)} />
              {idFile
                ? <p className="text-[#22c55e] text-sm">{idFile.name}</p>
                : <p className="text-[#4a4a4a] text-sm">Upload Aadhaar, Voter ID, or official letter</p>
              }
            </div>
          </div>

          {error && (
            <p className="text-[12px] text-[#ef4444] bg-[#ef4444]/10 border border-[#ef4444]/20 rounded px-3 py-2">
              {error}
            </p>
          )}

          <button onClick={handleSubmit} disabled={submitting}
            className="btn-primary w-full justify-center py-3 text-sm">
            {submitting ? 'Submitting…' : 'Submit for verification'}
          </button>

          <p className="text-[11px] text-[#3a3a3a] text-center">
            Already approved?{' '}
            <Link href="/auth/login" className="text-[#3b82f6] hover:underline">Sign in here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
