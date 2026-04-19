'use client';

export const dynamic = 'force-dynamic';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '').split(',').map((e) => e.trim());
        if (adminEmails.includes(session.user.email)) {
          router.replace('/admin');
        } else {
          router.replace('/channel/dashboard');
        }
      }
    });
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-center">
        <div className="font-serif text-white text-xl mb-2">Signing in…</div>
        <div className="text-[#4a4a4a] text-sm">Please wait.</div>
      </div>
    </div>
  );
}
