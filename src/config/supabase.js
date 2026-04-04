import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase env vars. Check your .env file.');
}

// ─────────────────────────────────────────────────────────────────────────────
//  ROOT CAUSE FIX — flowType: 'implicit' → 'pkce'
//
//  The OLD implicit flow delivers tokens in the URL hash: #access_token=...
//  Supabase has migrated ALL projects to PKCE flow (the modern standard).
//  With PKCE, Google OAuth redirects back with a short-lived ?code= query
//  param instead. An implicit-flow client ignores this code completely, so
//  getSession() always returns null → waitForSession() times out after 6 s
//  → "Sign in failed. Redirecting..."
//
//  Setting flowType:'pkce' + detectSessionInUrl:true tells the Supabase client
//  to automatically exchange the ?code= for a real session on startup,
//  which is exactly what AuthCallback.waitForSession() then picks up.
// ─────────────────────────────────────────────────────────────────────────────
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    flowType          : 'pkce',           // ← FIXED (was 'implicit')
    autoRefreshToken  : true,
    persistSession    : true,
    detectSessionInUrl: true,
    // Explicit localStorage adapter — works on Brave, Chrome, Firefox mobile
    storage: {
      getItem   : (key) => { try { return localStorage.getItem(key); }    catch { return null; } },
      setItem   : (key, val) => { try { localStorage.setItem(key, val); } catch {} },
      removeItem: (key) => { try { localStorage.removeItem(key); }        catch {} },
    },
    storageKey: 'drainzero-session',
  },
});

export default supabase;
