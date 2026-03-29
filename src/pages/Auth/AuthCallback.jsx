import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spin, Typography } from 'antd';
import { supabase } from '../../config/supabase';

const { Text } = Typography;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const AuthCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Completing sign in...');

  useEffect(() => {
    let mounted = true;

    const ensurePublicUser = async (session) => {
      if (!session?.user?.id) return null;

      const authUser = session.user;
      const fullName =
        authUser.user_metadata?.full_name ||
        authUser.user_metadata?.name ||
        authUser.email?.split('@')[0] ||
        'User';

      const { data: existing } = await supabase
        .from('users')
        .select('id, onboarding_done, onboarding_complete')
        .eq('id', authUser.id)
        .maybeSingle();

      if (existing) return existing;

      const payload = {
        id: authUser.id,
        email: authUser.email,
        name: fullName,
        full_name: fullName,
        onboarding_done: false,
        onboarding_complete: false,
        updated_at: new Date().toISOString(),
      };

      const { data: inserted, error } = await supabase
        .from('users')
        .upsert(payload, { onConflict: 'id' })
        .select('id, onboarding_done, onboarding_complete')
        .maybeSingle();

      if (error) {
        console.error('Failed to create public user row:', error);
        return existing || null;
      }

      return inserted || null;
    };

    const waitForSession = async () => {
      for (let i = 0; i < 12; i += 1) {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (data?.session?.user) return data.session;
        await sleep(400);
      }
      return null;
    };

    const handle = async () => {
      try {
        setStatus('Finalizing Google sign in...');

        // For implicit browser flow, detectSessionInUrl handles the redirect URL.
        // We just wait briefly for the session to become available.
        let session = await waitForSession();

        // Safety fallback if a code is present for any reason.
        if (!session) {
          const url = new URL(window.location.href);
          const code = url.searchParams.get('code');

          if (code) {
            setStatus('Verifying secure login...');
            try {
              const result = await Promise.race([
                supabase.auth.exchangeCodeForSession(code),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Code exchange timeout')), 5000))
              ]);
              if (result?.error) throw result.error;
            } catch (error) {
              console.warn('Code exchange fallback failed:', error?.message || error);
            }

            session = await waitForSession();
          }
        }

        if (!session?.user) {
          throw new Error('Session not found after callback');
        }

        setStatus('Preparing your account...');
        const profile = await ensurePublicUser(session);
        const done = !!(profile?.onboarding_done || profile?.onboarding_complete);

        // Clean callback URL/hash to avoid loops on refresh
        window.history.replaceState({}, document.title, '/auth/callback');

        if (!mounted) return;
        navigate(done ? '/category-selection' : '/onboarding', { replace: true });
      } catch (err) {
        console.error('AuthCallback error:', err);
        if (!mounted) return;
        setStatus('Sign in failed. Redirecting...');
        setTimeout(() => {
          window.location.replace('/login');
        }, 900);
      }
    };

    handle();

    return () => { mounted = false; };
  }, [navigate]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#F2F3F4',
      gap: 16
    }}>
      <Spin size="large" />
      <Text style={{ color: '#6B7280', fontSize: 16 }}>{status}</Text>
    </div>
  );
};

export default AuthCallback;
