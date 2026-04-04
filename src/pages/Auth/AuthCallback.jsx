import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spin, Typography, Button } from 'antd';
import { useAuth } from '../../context/AuthContext';

const { Text } = Typography;

// ─────────────────────────────────────────────────────────────────────────────
//  AuthCallback — Google OAuth lands here: /auth/callback
//
//  HOW IT WORKS:
//  ┌─ Supabase client (supabase.js) has detectSessionInUrl: true
//  │   → It sees ?code= in the URL on init and auto-exchanges it (PKCE)
//  │   → On success it fires onAuthStateChange('SIGNED_IN', session)
//  │
//  ├─ AuthContext hears SIGNED_IN → calls processUser → sets loading=false
//  │
//  └─ This component watches useAuth() and navigates when auth resolves.
//
//  We do NOT manually call exchangeCodeForSession here — doing so after
//  detectSessionInUrl has already consumed the code would clear the
//  code_verifier from storage, causing "pkce code verifier not found"
//  errors that are silently swallowed as "Sign in failed".
// ─────────────────────────────────────────────────────────────────────────────

const MSGS = [
  [0,    'Signing in with Google…'],
  [2000, 'Verifying your account…'],
  [5000, 'Setting up your profile…'],
  [9000, 'Almost there…'],
];

const AuthCallback = () => {
  const navigate = useNavigate();
  const { user, loading, onboardingDone } = useAuth();

  const [oauthError,  setOauthError]  = useState('');
  const [statusMsg,   setStatusMsg]   = useState(MSGS[0][1]);

  // ── Step 1: check for URL-level OAuth errors (before anything else) ──────
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const h = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const err =
      q.get('error_description') || h.get('error_description') ||
      q.get('error')             || h.get('error');

    if (err) setOauthError(decodeURIComponent(err.replace(/\+/g, ' ')));

    // Progressive status messages so user knows it's working
    const timers = MSGS.slice(1).map(([ms, msg]) =>
      setTimeout(() => setStatusMsg(msg), ms)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  // ── Step 2: react to auth state — navigate once it resolves ─────────────
  useEffect(() => {
    if (oauthError) return; // OAuth failed — show error UI instead
    if (loading)    return; // Still processing — AuthContext will call done()

    // Clean the URL so a hard refresh doesn't replay the code
    window.history.replaceState({}, document.title, '/auth/callback');

    if (user) {
      // Auth succeeded — AuthContext already ran ensurePublicUserRow + checkOnboarding
      navigate(onboardingDone ? '/dashboard' : '/onboarding', { replace: true });
    } else {
      // AuthContext's 12s safety timer fired with no session = auth failed
      window.location.replace('/login');
    }
  }, [user, loading, onboardingDone, oauthError, navigate]);

  // ── Error UI ─────────────────────────────────────────────────────────────
  if (oauthError) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: '#F2F3F4', gap: 20, padding: 24,
      }}>
        <img src="/DRAINZERO-LOGO.png" alt="DrainZero"
          style={{ height: 72, width: 'auto' }}
          onError={e => { e.target.style.display = 'none'; }}
        />
        <Text style={{ color: '#EF4444', fontSize: 16, textAlign: 'center', maxWidth: 360 }}>
          Google sign-in was declined or failed.<br />
          <span style={{ fontSize: 13, color: '#9CA3AF' }}>{oauthError}</span>
        </Text>
        <Button type="primary" onClick={() => window.location.replace('/login')}
          style={{ height: 48, borderRadius: 12, paddingInline: 32, fontWeight: 700 }}>
          Try Again
        </Button>
      </div>
    );
  }

  // ── Loading UI ───────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#F2F3F4', gap: 20,
    }}>
      <img src="/DRAINZERO-LOGO.png" alt="DrainZero"
        style={{ height: 72, width: 'auto' }}
        onError={e => { e.target.style.display = 'none'; }}
      />
      <Spin size="large" />
      <Text style={{ color: '#6B7280', fontSize: 16 }}>{statusMsg}</Text>
    </div>
  );
};

export default AuthCallback;
