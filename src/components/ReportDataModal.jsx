'use client';

import { useState } from 'react';
import { submitDataReport } from '@/lib/api';

const ISSUE_TYPES = [
  { id: 'mp_not_connected', label: 'MP not showing',           desc: 'MLA visible but no MP linked to this constituency', icon: '🔗' },
  { id: 'missing_mla',      label: 'Missing MLA',              desc: 'No MLA found for this Vidhan Sabha constituency',   icon: '👤' },
  { id: 'missing_both',     label: 'Missing both MLA and MP',  desc: 'Neither MLA nor MP found for this constituency',    icon: '👥' },
  { id: 'missing_vs',       label: 'Missing VS constituency',  desc: 'Vidhan Sabha constituency absent from database',    icon: '🏛️' },
  { id: 'missing_ls',       label: 'Missing LS constituency',  desc: 'Lok Sabha constituency absent from database',       icon: '🏢' },
  { id: 'wrong_member',     label: 'Wrong politician shown',   desc: 'The MLA or MP shown is incorrect for this area',    icon: '⚠️' },
];

export default function ReportDataModal({ constituency, mla, mp, onClose }) {
  const [step, setStep] = useState(1);
  const [issueType, setIssueType] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      // Auto-generate suggested fix based on issue type
      let suggestedFix = null;
      if (issueType === 'mp_not_connected' && constituency) {
        suggestedFix = {
          action: 'fixMpConnection',
          vsId: constituency.id,
          vsName: constituency.name,
          state: constituency.state,
          hint: 'Find the LS constituency that contains this VS constituency and link them in vs_ls_map',
        };
      } else if (issueType === 'missing_vs' && constituency) {
        suggestedFix = {
          action: 'fixMissingVS',
          vsName: constituency.name,
          state: constituency.state,
          hint: 'Create this VS constituency record and link to its LS constituency',
        };
      } else if (issueType === 'missing_ls' && constituency) {
        suggestedFix = {
          action: 'fixMissingLS',
          state: constituency.state,
          hint: 'Create the LS constituency record for this state',
        };
      } else if (issueType === 'wrong_member') {
        suggestedFix = {
          action: 'manual',
          hint: 'Check vs_ls_map entry and politicians table for this constituency',
          vsId: constituency?.id,
          mlaPoliticianId: mla?.id,
          mpPoliticianId: mp?.id,
        };
      }

      await submitDataReport({
        type: issueType,
        state: constituency?.state,
        constituencyName: constituency?.name,
        constituencyId: constituency?.id,
        politicianName: mla?.name ?? mp?.name,
        politicianId: mla?.id ?? mp?.id,
        description,
        suggestedFix,
        reportedBy: email || null,
      });
      setDone(true);
    } catch (e) {
      alert('Failed to submit: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>

      <div className="w-full sm:max-w-md bg-[#0f0f0f] border border-[#2a2a2a] rounded-t-2xl sm:rounded-xl"
        style={{ maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-[#3a3a3a] rounded-full"/>
        </div>

        <div className="px-5 py-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-serif text-lg font-bold text-white">Report Data Issue</h2>
              {constituency && (
                <p className="text-[12px] text-[#5a5a5a] mt-0.5">{constituency.name}, {constituency.state}</p>
              )}
            </div>
            <button onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-[#5a5a5a] hover:text-white rounded-full hover:bg-[#1a1a1a] transition-colors text-lg">
              ×
            </button>
          </div>

          {done ? (
            <div className="text-center py-8">
              <div className="text-3xl mb-3">✓</div>
              <p className="font-serif text-lg text-white mb-1">Report submitted</p>
              <p className="text-[#5a5a5a] text-sm">The admin will review and fix this issue.</p>
              <button onClick={onClose} className="btn-ghost mt-5 text-sm py-2">Close</button>
            </div>
          ) : step === 1 ? (
            /* Step 1: Choose issue type */
            <div>
              <p className="text-[12px] text-[#5a5a5a] mb-4 uppercase tracking-wider">What's the issue?</p>
              <div className="space-y-2">
                {ISSUE_TYPES.map(t => (
                  <button key={t.id}
                    onClick={() => { setIssueType(t.id); setStep(2); }}
                    className={`w-full text-left p-4 rounded-lg border transition-colors flex items-start gap-3 ${
                      issueType === t.id
                        ? 'border-[#f59e0b] bg-[#f59e0b]/5'
                        : 'border-[#2a2a2a] hover:border-[#3a3a3a] bg-[#111]'
                    }`}>
                    <span className="text-xl flex-shrink-0">{t.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-white">{t.label}</p>
                      <p className="text-[12px] text-[#5a5a5a] mt-0.5 leading-relaxed">{t.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Step 2: Details */
            <div className="space-y-4">
              <button onClick={() => setStep(1)}
                className="text-[12px] text-[#5a5a5a] hover:text-white flex items-center gap-1 transition-colors">
                ← Back
              </button>

              <div className="bg-[#1a1a1a] rounded-lg p-3">
                <p className="text-[11px] uppercase tracking-wider text-[#4a4a4a] mb-1">Selected issue</p>
                <p className="text-sm text-[#c0c0c0]">{ISSUE_TYPES.find(t => t.id === issueType)?.label}</p>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">
                  What exactly is wrong? <span className="text-[#3a3a3a] normal-case">(optional but helpful)</span>
                </label>
                <textarea
                  className="input text-sm resize-none"
                  rows={3}
                  placeholder="e.g. Karkala VS constituency is under Udupi Chikmagalur LS but MP not showing"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">
                  Your email <span className="text-[#3a3a3a] normal-case">(optional, for follow-up)</span>
                </label>
                <input type="email" className="input text-sm"
                  placeholder="you@example.com"
                  value={email} onChange={e => setEmail(e.target.value)} />
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-primary w-full justify-center py-3 text-sm">
                {submitting ? 'Submitting…' : 'Submit Report'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
