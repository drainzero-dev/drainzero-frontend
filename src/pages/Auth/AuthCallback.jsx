import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spin, Typography } from 'antd';
import { supabase } from '../../config/supabase';

const { Text } = Typography;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────────────────────
//  AuthCallback
//
//  This page is the OAuth redirect target: /auth/callback
//
//  With flowType:'pkce' + detectSessionInUrl:true the Supabase client
//  automatically exchanges the ?code= param on startup. We simply poll
//  getSession() until the exchange finishes, then navigate.
//
//  AuthContext's onAuthStateChange(SIGNED_IN) runs concurrently and
//  calls checkOnboarding(). We read onboarding status directly from the
//  DB here as well so both agree on where to send the user.
// ─────────────────────────────────────────────────────────────────────────────

const AuthCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Completing sign in...');

  useEffect(() => {
    let mounted = true;

    // ── Helpers ───────────────────────────────────────────────────────────────

    const getParams = () => ({
      query: new URLSearchParams(window.location.search),
      hash : new URLSearchParams(window.location.hash.slice(1)),
    });

    // Guarantees a public.users row exists for this auth user.
    // The DB trigger only fires on first INSERT into auth.users, so returning
    // Google users who had their public row deleted end up with no profile.
    const ensurePublicUser = async (session) => {
      if (!session?.user?.id) return null;
      const u = session.user;
      const fullName =
        u.user_metadata?.full_name || u.user_metadata?.name ||
        u.email?.split('@')[0]     || 'User';

      const { data: row } = await supabase
        .from('users')
        .upsert(
          { id: u.id, email: u.email, name: fullName, full_name: fullName },
          { onConflict: 'id', ignoreDuplicates: true },
        )
        .select('id, onboarding_done, onboarding_complete')
        .maybeSingle();

      if (row) return row;

      // ignoreDuplicates → no data returned if row existed; read it back
      const { data: existing } = await supabase
        .from('users')
        .select('id, onboarding_done, onboarding_complete')
        .eq('id', u.id)
        .maybeSingle();
      if (existing) return existing;

      // Still nothing — brand new user, create the row
      const { data: inserted } = await supabase
        .from('users')
        .insert({
          id: u.id, email: u.email, name: fullName, full_name: fullName,
          onboarding_done: false, onboarding_complete: false,
          updated_at: new Date().toISOString(),
        })
        .select('id, onboarding_done, onboarding_complete')
        .maybeSingle();

      return inserted;
    };

    // Poll until the PKCE auto-exchange completes (up to 10 s)
    const waitForSession = async () => {
      for (let i = 0; i < 25; i++) {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (data?.session?.user) return data.session;
        await sleep(400);
      }
      return null;
    };

    // ── Main flow ─────────────────────────────────────────────────────────────
    const handle = async () => {
      try {
        const { query, hash } = getParams();

        // ── 1. Detect OAuth-level errors in the redirect URL ─────────────────
        // Supabase appends ?error=... when the sign-in fails on its side
        // (e.g. user denied consent, account suspended, etc.).
        // Without this check the code polls for a session that never arrives
        // then shows a cryptic "Session not found" error after 10 s.
        const oauthError =
          query.get('error') || hash.get('error') ||
          query.get('error_description') || hash.get('error_description');
        if (oauthError) {
          throw new Error(oauthError.replace(/_/g, ' '));
        }

        setStatus('Finalizing Google sign in...');

        // ── 2. Wait for PKCE auto-exchange ───────────────────────────────────
        // detectSessionInUrl:true triggers the exchange automatically.
        // We just poll until getSession() returns the resulting session.
        let session = await waitForSession();

        // ── 3. Manual exchange fallback (safety net) ─────────────────────────
        // detectSessionInUrl handles this on page load, but if the client
        // was somehow already initialised before the callback URL was set,
        // we try manually.
        if (!session) {
          const code = query.get('code');
          if (code) {
            setStatus('Verifying secure login...');
            try {
              await Promise.race([
                supabase.auth.exchangeCodeForSession(code),
                new Promise((_, reject) =>
                  setTimeout(() => reject(new Error('Code exchange timeout')), 8000),
                ),
              ]);
            } catch (ex) {
              console.warn('Manual code exchange failed:', ex?.message);
            }
            session = await waitForSession();
          }
        }

        if (!session?.user) {
          throw new Error(
            'Could not establish a session. The login link may have expired — please try again.',
          );
        }

        setStatus('Preparing your account...');

        // ── 4. Guarantee public.users row exists ─────────────────────────────
        const profile        = await ensurePublicUser(session);
        const onboardingDone = !!(
          profile?.onboarding_done || profile?.onboarding_complete
        );

        // Give AuthContext's SIGNED_IN handler a tick to complete so
        // ProtectedRoute sees the correct onboardingDone value.
        await sleep(300);

        // Clean URL so a hard refresh doesn't re-run the exchange
        window.history.replaceState({}, document.title, '/auth/callback');

        if (!mounted) return;

        navigate(onboardingDone ? '/dashboard' : '/onboarding', { replace: true });

      } catch (err) {
        console.error('AuthCallback error:', err.message);
        if (!mounted) return;
        setStatus('Sign in failed. Redirecting...');
        setTimeout(() => { window.location.replace('/login'); }, 2000);
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
      gap           : 20,
    }}>
      <img
        src="/DRAINZERO-LOGO.png"
        alt="DrainZero"
        style={{ height: 72, width: 'auto' }}
        onError={e => { e.target.style.display = 'none'; }}
      />
      <Spin size="large" />
      <Text style={{ color: '#6B7280', fontSize: 16 }}>{status}</Text>
    </div>
  );
};

export default AuthCallback;
