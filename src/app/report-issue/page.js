'use client';

import { useState } from 'react';
import { submitDataReport } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';

const ISSUE_TYPES = [
  { id: 'mp_not_connected',  icon: '🔗', label: 'MP not showing',            desc: 'MLA visible but no MP linked to this constituency' },
  { id: 'missing_mla',       icon: '👤', label: 'Missing MLA',               desc: 'No MLA found for a Vidhan Sabha constituency' },
  { id: 'missing_both',      icon: '👥', label: 'Missing both MLA and MP',   desc: 'Neither MLA nor MP found for a constituency' },
  { id: 'missing_vs',        icon: '🏛️', label: 'Missing VS constituency',   desc: 'Vidhan Sabha constituency absent from database' },
  { id: 'missing_ls',        icon: '🏢', label: 'Missing LS constituency',   desc: 'Lok Sabha constituency absent from database' },
  { id: 'wrong_member',      icon: '⚠️', label: 'Wrong politician shown',    desc: 'The MLA or MP shown is incorrect for this area' },
];

export default function ReportIssuePage() {
  const [issueType, setIssueType] = useState('');
  const [state, setState] = useState('');
  const [constituency, setConstituency] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!issueType) return;
    setSubmitting(true);
    try {
      await submitDataReport({
        type: issueType,
        state: state || null,
        constituencyName: constituency || null,
        description,
        reportedBy: email || null,
        suggestedFix: { action: 'manual', hint: `${issueType} in ${constituency}, ${state}` },
      });
      setDone(true);
    } catch (err) {
      alert('Failed: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <Navbar />
      <div className="max-w-narrow mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold text-white mb-2">Report a Data Issue</h1>
          <p className="text-[#5a5a5a] text-sm">Found missing or incorrect data? Let us know and we'll fix it.</p>
        </div>

        {done ? (
          <div className="text-center py-16 border border-[#1f1f1f] rounded-xl">
            <div className="text-4xl mb-4">✓</div>
            <p className="font-serif text-xl text-white mb-2">Report submitted</p>
            <p className="text-[#5a5a5a] text-sm">The admin will review and fix this issue.</p>
            <button onClick={() => { setDone(false); setIssueType(''); setState(''); setConstituency(''); setDescription(''); }}
              className="btn-ghost mt-6 text-sm py-2">Submit another</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-3">What's the issue? *</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ISSUE_TYPES.map(t => (
                  <button type="button" key={t.id}
                    onClick={() => setIssueType(t.id)}
                    className={`text-left p-4 rounded-lg border transition-colors flex items-start gap-3 ${
                      issueType === t.id
                        ? 'border-[#f59e0b] bg-[#f59e0b]/5'
                        : 'border-[#2a2a2a] hover:border-[#3a3a3a] bg-[#111]'
                    }`}>
                    <span className="text-xl flex-shrink-0">{t.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-white">{t.label}</p>
                      <p className="text-[12px] text-[#5a5a5a] mt-0.5">{t.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">State</label>
                <input className="input text-sm" placeholder="e.g. Karnataka"
                  value={state} onChange={e => setState(e.target.value)} />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">Constituency</label>
                <input className="input text-sm" placeholder="e.g. Karkala"
                  value={constituency} onChange={e => setConstituency(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">Details <span className="normal-case text-[#3a3a3a]">(optional)</span></label>
              <textarea className="input text-sm resize-none" rows={3}
                placeholder="What exactly is wrong or missing? Any extra context helps."
                value={description} onChange={e => setDescription(e.target.value)} />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">Your email <span className="normal-case text-[#3a3a3a]">(optional)</span></label>
              <input type="email" className="input text-sm" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)} />
            </div>

            <button type="submit" disabled={!issueType || submitting}
              className="btn-primary w-full justify-center py-3 disabled:opacity-40">
              {submitting ? 'Submitting…' : 'Submit Report'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
