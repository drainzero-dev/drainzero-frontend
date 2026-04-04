import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spin, Typography } from 'antd';
import { supabase } from '../../config/supabase';
import { ensurePublicUserRow } from '../../context/AuthContext';

const { Text } = Typography;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────────────────────
//  AuthCallback — the page Google redirects back to: /auth/callback
//
//  Handles ALL possible Supabase OAuth response types:
//    • PKCE  → arrives as ?code=xxx  (modern Supabase, flowType:'pkce')
//    • Implicit → arrives as #access_token=xxx (legacy Supabase)
//    • Error  → arrives as ?error=xxx or #error=xxx
//
//  After establishing the session it ensures the public.users row exists
//  (critical for users who had their row deleted while auth.users is intact),
//  reads onboarding status, and navigates to /dashboard or /onboarding.
// ─────────────────────────────────────────────────────────────────────────────

const AuthCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Completing sign in...');

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        const queryParams = new URLSearchParams(window.location.search);
        const hashParams  = new URLSearchParams(window.location.hash.replace(/^#/, ''));

        // ── 1. Detect and throw OAuth-level errors ───────────────────────
        const oauthErr =
          queryParams.get('error_description') ||
          hashParams.get('error_description')  ||
          queryParams.get('error')             ||
          hashParams.get('error');

        if (oauthErr) throw new Error(decodeURIComponent(oauthErr.replace(/\+/g, ' ')));

        setStatus('Finalizing Google sign in...');

        // ── 2. Handle IMPLICIT flow (legacy) ─────────────────────────────
        // If Supabase returns tokens in the URL hash, use setSession directly.
        const implicitToken   = hashParams.get('access_token');
        const implicitRefresh = hashParams.get('refresh_token') || '';

        if (implicitToken) {
          console.log('[AuthCallback] implicit flow detected');
          const { error: setErr } = await supabase.auth.setSession({
            access_token : implicitToken,
            refresh_token: implicitRefresh,
          });
          if (setErr) throw setErr;
        }

        // ── 3. Handle PKCE flow ──────────────────────────────────────────
        // With detectSessionInUrl:true the client auto-exchanges ?code= on
        // init. We may need to do it manually if the client initialised
        // before the URL was set (edge case with some bundlers).
        if (!implicitToken) {
          const code = queryParams.get('code');
          if (code) {
            console.log('[AuthCallback] PKCE flow, trying exchange');
            // Try manual exchange first — detectSessionInUrl might not have
            // run yet if the client was created before navigation completed.
            try {
              const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
              if (exErr && !exErr.message?.includes('already')) throw exErr;
            } catch (exErr) {
              // "already used" / "invalid grant" means detectSessionInUrl
              // already exchanged it — safe to ignore, poll below.
              if (!exErr.message?.includes('already') && !exErr.message?.includes('invalid')) {
                throw exErr;
              }
            }
          }
        }

        // ── 4. Poll for session (handles async detection / exchange) ─────
        let session = null;
        for (let i = 0; i < 25; i++) {          // max 10 s
          const { data, error } = await supabase.auth.getSession();
          if (error) throw error;
          if (data?.session?.user) { session = data.session; break; }
          await sleep(400);
        }

        if (!session?.user) {
          throw new Error(
            'Could not establish a session. The sign-in link may have expired — please try again.'
          );
        }

        setStatus('Preparing your account...');

        // ── 5. Guarantee public.users row exists ─────────────────────────
        const profile        = await ensurePublicUserRow(session.user);
        const onboardingDone = !!(
          profile?.onboarding_done || profile?.onboarding_complete
        );

        // Give AuthContext's SIGNED_IN handler a moment to settle so
        // ProtectedRoute sees the correct state the instant we navigate.
        await sleep(300);

        // Clean the URL — prevents the code being re-used on hard refresh
        window.history.replaceState({}, document.title, '/auth/callback');

        if (!mounted) return;

        navigate(onboardingDone ? '/dashboard' : '/onboarding', { replace: true });

      } catch (err) {
        console.error('[AuthCallback] error:', err.message);
        if (!mounted) return;
        setStatus('Sign in failed. Redirecting...');
        setTimeout(() => { window.location.replace('/login'); }, 2000);
      }
    };

    run();
    return () => { mounted = false; };
  }, [navigate]);

  return (
    <div style={{
      minHeight      : '100vh',
      display        : 'flex',
      flexDirection  : 'column',
      alignItems     : 'center',
      justifyContent : 'center',
      background     : '#F2F3F4',
      gap            : 20,
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
