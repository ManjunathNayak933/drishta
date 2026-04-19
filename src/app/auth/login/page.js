'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

function friendlyError(msg) {
  if (!msg) return 'Something went wrong. Please try again.';
  const m = msg.toLowerCase();
  if (m.includes('invalid') && m.includes('email')) {
    return 'Supabase is rejecting this email. Go to Supabase → Authentication → Providers → Email → Enable.';
  }
  if (m.includes('email not confirmed')) {
    return 'Go to Supabase → Authentication → Settings → disable "Enable email confirmations".';
  }
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'Too many requests. Wait a few minutes and try again. Supabase rate limits reset hourly.';
  }
  if (m.includes('signup') && m.includes('disabled')) {
    return 'Go to Supabase → Authentication → Settings → enable "Allow new users to sign up".';
  }
  return msg;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  // Check if already logged in — if so, go straight to dashboard
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/channel/dashboard');
      } else {
        setLoading(false);
      }
    });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          shouldCreateUser: true,
        },
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      setError(friendlyError(err.message));
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-[#3a3a3a] text-sm">Checking session…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="font-serif font-bold text-white text-2xl mb-8 block">
          Drishta
        </Link>

        {sent ? (
          <div className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl p-8 text-center">
            <div className="text-3xl mb-4">✉️</div>
            <h2 className="font-serif text-xl font-bold text-white mb-2">Check your email</h2>
            <p className="text-[#6a6a6a] text-sm leading-relaxed">
              We sent a login link to <strong className="text-[#9a9a9a]">{email}</strong>.
              Click it to sign in.
            </p>
            <p className="text-[#4a4a4a] text-[12px] mt-3">
              The link expires in 1 hour. Once signed in, you stay logged in for 7 days.
            </p>
            <p className="text-[#3a3a3a] text-[12px] mt-4">
              Didn't get it?{' '}
              <button onClick={() => setSent(false)} className="text-[#3b82f6] hover:underline">
                Try again
              </button>
            </p>
          </div>
        ) : (
          <div className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl p-8">
            <h1 className="font-serif text-xl font-bold text-white mb-1">Sign in</h1>
            <p className="text-[#5a5a5a] text-sm mb-6">
              For channel owners. Magic link sent to your email — no password needed. You stay signed in for 7 days.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  className="input text-sm"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              {error && (
                <div className="bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg p-3">
                  <p className="text-[#ef4444] text-[13px] leading-relaxed">{error}</p>
                  {error.includes('Supabase') && (
                    <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer"
                      className="text-[#3b82f6] text-[12px] hover:underline mt-2 block">
                      Open Supabase dashboard →
                    </a>
                  )}
                </div>
              )}

              <button type="submit" className="btn-primary w-full justify-center py-2.5"
                disabled={sending || !email}>
                {sending ? 'Sending…' : 'Send login link →'}
              </button>
            </form>

            <p className="text-[#3a3a3a] text-[12px] mt-5 text-center">
              Want to publish on Drishta?{' '}
              <Link href="/channel/apply" className="text-[#5a5a5a] hover:text-white transition-colors">
                Apply for a channel →
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function friendlyError(msg) {
  if (!msg) return 'Something went wrong. Please try again.';
  const m = msg.toLowerCase();
  if (m.includes('invalid') && m.includes('email')) {
    return 'Supabase is rejecting this email address. Make sure Email Auth is enabled in your Supabase project: Authentication → Providers → Email → Enable.';
  }
  if (m.includes('email not confirmed')) {
    return 'Email confirmations are on. Go to Supabase → Authentication → Settings and disable "Enable email confirmations".';
  }
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'Too many requests. Wait a minute and try again.';
  }
  if (m.includes('signup') && m.includes('disabled')) {
    return 'Sign-ups are disabled in your Supabase project. Go to Authentication → Settings and enable "Allow new users to sign up".';
  }
  return msg;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          shouldCreateUser: true,
        },
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      setError(friendlyError(err.message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="font-serif font-bold text-white text-2xl mb-8 block">
          Drishta
        </Link>

        {sent ? (
          <div className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl p-8 text-center">
            <div className="text-3xl mb-4">✉️</div>
            <h2 className="font-serif text-xl font-bold text-white mb-2">Check your email</h2>
            <p className="text-[#6a6a6a] text-sm leading-relaxed">
              We sent a login link to <strong className="text-[#9a9a9a]">{email}</strong>.
              Click it to sign in — no password needed.
            </p>
            <p className="text-[#4a4a4a] text-[12px] mt-4">
              Didn't get it? Check your spam folder or{' '}
              <button onClick={() => setSent(false)} className="text-[#3b82f6] hover:underline">
                try again
              </button>.
            </p>
          </div>
        ) : (
          <div className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl p-8">
            <h1 className="font-serif text-xl font-bold text-white mb-1">Sign in</h1>
            <p className="text-[#5a5a5a] text-sm mb-6">
              For channel owners. We'll email you a magic link.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  className="input text-sm"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              {error && (
                <div className="bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg p-3">
                  <p className="text-[#ef4444] text-[13px] leading-relaxed">{error}</p>
                  {error.includes('Supabase') && (
                    <a
                      href="https://supabase.com/dashboard"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#3b82f6] text-[12px] hover:underline mt-2 block"
                    >
                      Open Supabase dashboard →
                    </a>
                  )}
                </div>
              )}

              <button
                type="submit"
                className="btn-primary w-full justify-center py-2.5"
                disabled={loading || !email}
              >
                {loading ? 'Sending…' : 'Send login link →'}
              </button>
            </form>

            <p className="text-[#3a3a3a] text-[12px] mt-5 text-center">
              Want to publish on Drishta?{' '}
              <Link href="/channel/apply" className="text-[#5a5a5a] hover:text-white transition-colors">
                Apply for a channel →
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
