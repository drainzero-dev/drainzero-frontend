import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spin, Typography } from 'antd';
import { supabase } from '../../config/supabase';

const { Text } = Typography;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ─────────────────────────────────────────────────────────────────────────────
//  AuthCallback — lands here after Google OAuth redirect
//
//  Key fixes applied here:
//  1. Detect ?error= / #error= URL params FIRST — Supabase includes these when
//     sign-in fails server-side (rate-limit, cancelled consent, etc). Without
//     this the code polls for a session that will never arrive.
//  2. flowType is now 'pkce' (supabase.js). With PKCE + detectSessionInUrl the
//     client auto-exchanges the ?code= param on startup. waitForSession() just
//     polls until that async exchange completes.
//  3. ensurePublicUser() guarantees a public.users row exists for returning
//     Google OAuth users whose row was deleted (the DB trigger only fires on
//     the very first auth.users INSERT, not on every subsequent login).
// ─────────────────────────────────────────────────────────────────────────────

const AuthCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Completing sign in...');

  useEffect(() => {
    let mounted = true;

    const getUrlParams = () => {
      const query = new URLSearchParams(window.location.search);
      const hash  = new URLSearchParams(window.location.hash.slice(1));
      return { query, hash };
    };

    const ensurePublicUser = async (session) => {
      if (!session?.user?.id) return null;
      const authUser = session.user;
      const fullName =
        authUser.user_metadata?.full_name ||
        authUser.user_metadata?.name       ||
        authUser.email?.split('@')[0]      ||
        'User';

      const { data: row, error } = await supabase
        .from('users')
        .upsert(
          { id: authUser.id, email: authUser.email, name: fullName, full_name: fullName },
          { onConflict: 'id', ignoreDuplicates: true }
        )
        .select('id, onboarding_done, onboarding_complete')
        .maybeSingle();

      if (!row) {
        const { data: existing } = await supabase
          .from('users')
          .select('id, onboarding_done, onboarding_complete')
          .eq('id', authUser.id)
          .maybeSingle();

        if (existing) return existing;

        const { data: inserted, error: insertErr } = await supabase
          .from('users')
          .insert({
            id                  : authUser.id,
            email               : authUser.email,
            name                : fullName,
            full_name           : fullName,
            onboarding_done     : false,
            onboarding_complete : false,
            updated_at          : new Date().toISOString(),
          })
          .select('id, onboarding_done, onboarding_complete')
          .maybeSingle();

        if (insertErr) {
          console.error('ensurePublicUser insert error:', insertErr.message);
          const { data: fallback } = await supabase
            .from('users')
            .select('id, onboarding_done, onboarding_complete')
            .eq('id', authUser.id)
            .maybeSingle();
          return fallback;
        }
        return inserted;
      }

      if (error && error.code !== '23505') {
        console.error('ensurePublicUser upsert error:', error.message);
      }
      return row;
    };

    // Poll until the PKCE auto-exchange finishes (up to 8 s)
    const waitForSession = async () => {
      for (let i = 0; i < 20; i++) {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (data?.session?.user) return data.session;
        await sleep(400);
      }
      return null;
    };

    const handle = async () => {
      try {
        const { query, hash } = getUrlParams();

        // ── STEP 1: Detect OAuth errors in the redirect URL ─────────────────
        // Supabase appends ?error=... when the server-side sign-in fails.
        // Without this check the code silently polls for a session that
        // will never exist, then shows a generic "Sign in failed" message.
        const oauthError = query.get('error') || hash.get('error');
        if (oauthError) {
          const desc =
            query.get('error_description') ||
            hash.get('error_description')  ||
            oauthError;
          console.error('OAuth redirect error:', desc);
          throw new Error(desc);
        }

        setStatus('Finalizing Google sign in...');

        // ── STEP 2: Wait for PKCE auto-exchange ─────────────────────────────
        let session = await waitForSession();

        // ── STEP 3: Manual exchange fallback ────────────────────────────────
        if (!session) {
          const code = query.get('code');
          if (code) {
            setStatus('Verifying secure login...');
            try {
              await Promise.race([
                supabase.auth.exchangeCodeForSession(code),
                new Promise((_, reject) =>
                  setTimeout(() => reject(new Error('Code exchange timeout')), 8000)
                ),
              ]);
            } catch (err) {
              console.warn('Manual code exchange failed:', err?.message);
            }
            session = await waitForSession();
          }
        }

        if (!session?.user) throw new Error('Session not found after callback');

        setStatus('Preparing your account...');

        // ── STEP 4: Guarantee public.users row exists ────────────────────────
        const profile        = await ensurePublicUser(session);
        const onboardingDone = !!(
          profile?.onboarding_done || profile?.onboarding_complete
        );

        await sleep(200);
        window.history.replaceState({}, document.title, '/auth/callback');

        if (!mounted) return;
        navigate(onboardingDone ? '/dashboard' : '/onboarding', { replace: true });
      } catch (err) {
        console.error('AuthCallback error:', err.message);
        if (!mounted) return;
        setStatus('Sign in failed. Redirecting...');
        setTimeout(() => { window.location.replace('/login'); }, 1500);
      }
    };

    handle();
    return () => { mounted = false; };
  }, [navigate]);

  return (
    <div style={{
      minHeight     : '100vh',
      display       : 'flex',
      flexDirection : 'column',
      alignItems    : 'center',
      justifyContent: 'center',
      background    : '#F2F3F4',
      gap           : 16,
    }}>
      <img
        src="/DRAINZERO-LOGO.png"
        alt="DrainZero"
        style={{ height: 64, width: 'auto' }}
        onError={e => { e.target.style.display = 'none'; }}
      />
      <Spin size="large" />
      <Text style={{ color: '#6B7280', fontSize: 16 }}>{status}</Text>
    </div>
  );
};

export default AuthCallback;
