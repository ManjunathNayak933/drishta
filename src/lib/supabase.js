/**
 * Supabase client factory.
 * Never import this directly in components — use src/lib/api.js instead.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Browser/public client — persists session in localStorage for 7 days
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'drishta-auth',
    autoRefreshToken: true,
  },
});

// Server-only admin client — bypasses RLS
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey ?? supabaseAnonKey, {
  auth: { persistSession: false },
});
