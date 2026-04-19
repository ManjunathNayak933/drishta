'use client';

import { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import { applyForChannel } from '@/lib/api';

export default function ChannelApplyPage() {
  const [form, setForm] = useState({
    name: '',
    tagline: '',
    motivation: '',
    sample_url: '',
    applicant_email: '',
    accent_color: '#b8860b',
  });
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await applyForChannel(form);
      setDone(true);
    } catch (err) {
      alert('Submission failed: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-center px-4">
        <div>
          <div className="text-4xl mb-4">✓</div>
          <h2 className="font-serif text-2xl font-bold text-white mb-2">Application received</h2>
          <p className="text-[#5a5a5a] text-sm max-w-sm">
            We review applications within 5 business days. You'll hear back at {form.applicant_email}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar active="news" />
      <div className="max-w-narrow mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold text-white mb-2">Apply for a Channel</h1>
          <p className="text-[#5a5a5a] text-sm max-w-sm">
            Channels are for independent journalists and civic organisations who want to publish on Drishta.
            All content is tagged to politicians and issues — it's not a blog, it's accountability journalism.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">
              Channel Name *
            </label>
            <input className="input text-sm" placeholder="e.g. Karnataka Watch" value={form.name} onChange={set('name')} required />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">Tagline</label>
            <input className="input text-sm" placeholder="One sentence about your channel" value={form.tagline} onChange={set('tagline')} />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">
              Why do you want to publish on Drishta? *
            </label>
            <textarea
              className="input resize-none text-sm"
              rows={4}
              placeholder="What will you cover? Why civic accountability journalism?"
              value={form.motivation}
              onChange={set('motivation')}
              required
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">
              Sample work URL
            </label>
            <input type="url" className="input text-sm" placeholder="https://…" value={form.sample_url} onChange={set('sample_url')} />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">
              Accent Colour
            </label>
            <div className="flex items-center gap-3">
              <input type="color" value={form.accent_color} onChange={set('accent_color')}
                className="w-10 h-10 rounded cursor-pointer bg-transparent border-0" />
              <span className="font-mono text-sm text-[#6a6a6a]">{form.accent_color}</span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">
              Your Email * <span className="normal-case text-[#3a3a3a]">(becomes the channel owner)</span>
            </label>
            <input type="email" className="input text-sm" placeholder="you@example.com" value={form.applicant_email} onChange={set('applicant_email')} required />
          </div>

          <div className="pt-2">
            <button type="submit" className="btn-primary w-full justify-center" disabled={submitting || !form.name || !form.motivation || !form.applicant_email}>
              {submitting ? 'Submitting…' : 'Submit Application →'}
            </button>
          </div>
        </form>

        <div className="mt-10 pt-8 border-t border-[#1a1a1a]">
          <p className="text-[11px] text-[#3a3a3a] leading-relaxed">
            All published content must follow our{' '}
            <a href="/editorial-policy" className="text-[#5a5a5a] hover:text-white transition-colors underline">
              editorial policy
            </a>.
            Channels that publish misinformation will be suspended.
            Content is subject to the same 5-report community moderation system.
          </p>
        </div>
      </div>
    </div>
  );
}
