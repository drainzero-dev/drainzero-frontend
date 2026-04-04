import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('[DrainZero] Missing Supabase env vars!');
}

// ─── CRITICAL FIX ────────────────────────────────────────────────────────────
// Previous config had flowType:'implicit' + storageKey:'drainzero-session'.
//
// Two problems:
// 1. Supabase now uses PKCE flow. With implicit, the ?code= callback param is
//    ignored → getSession() returns null forever → "Sign in failed".
// 2. The custom storageKey 'drainzero-session' caused PKCE code_verifiers to
//    be stored under non-standard keys, so the exchange couldn't find them.
//
// Fix: flowType:'pkce' + no custom storageKey (use Supabase default).
// The default key is: sb-{hostname}-auth-token  (auto-generated, safe).
// ─────────────────────────────────────────────────────────────────────────────
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    flowType          : 'pkce',
    autoRefreshToken  : true,
    persistSession    : true,
    detectSessionInUrl: true,
  },
});

export default supabase;
