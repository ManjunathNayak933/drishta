'use client';

import { useState } from 'react';
import { reportPromise, reportIssue } from '@/lib/api';

export default function ReportModal({ type, id, onClose }) {
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !reason) { setError('Email and reason are required.'); return; }
    setLoading(true);
    setError('');
    try {
      if (type === 'promise') {
        await reportPromise({ promiseId: id, reporterEmail: email, reason, proofUrl });
      } else {
        await reportIssue({ issueId: id, reporterEmail: email, reason, proofUrl });
      }
      setDone(true);
    } catch (err) {
      if (err.code === '23505') {
        setError('You have already reported this item.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-[#111] border border-[#2a2a2a] rounded-xl p-6 animate-fade-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#5a5a5a] hover:text-white transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>

        {done ? (
          <div className="text-center py-4">
            <div className="text-3xl mb-3">✓</div>
            <h3 className="font-serif text-lg font-semibold text-white mb-2">Report received</h3>
            <p className="text-sm text-[#6a6a6a]">
              If this {type} receives 5 reports it will be hidden pending admin review.
            </p>
            <button className="btn-ghost mt-6" onClick={onClose}>Close</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h3 className="font-serif text-lg font-semibold text-white mb-1">
              Report as inaccurate
            </h3>
            <p className="text-sm text-[#5a5a5a] mb-5">
              If 5 people report this {type}, it will be hidden for admin review.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">
                  Your Email *
                </label>
                <input
                  type="email"
                  className="input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">
                  Reason *
                </label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  placeholder="What is inaccurate about this?"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">
                  Proof URL (optional)
                </label>
                <input
                  type="url"
                  className="input"
                  placeholder="https://..."
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <p className="mt-3 text-sm text-[#ef4444]">{error}</p>
            )}

            <div className="flex gap-3 mt-6">
              <button type="button" className="btn-ghost flex-1" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary flex-1 justify-center"
                disabled={loading}
              >
                {loading ? 'Submitting…' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
