import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spin, Typography } from 'antd';
import { supabase } from '../../config/supabase';

const { Text } = Typography;

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
        authUser.identities?.[0]?.identity_data?.full_name ||
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

    const handle = async () => {
      try {
        setStatus('Completing sign in...');

        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');

        if (code) {
          setStatus('Exchanging secure login code...');
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        setStatus('Loading your session...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (!session?.user) {
          setStatus('Session not found, redirecting...');
          navigate('/login', { replace: true });
          return;
        }

        setStatus('Preparing your account...');
        const profile = await ensurePublicUser(session);
        const done = !!(profile?.onboarding_done || profile?.onboarding_complete);

        // Clean up auth code from URL
        window.history.replaceState({}, document.title, '/auth/callback');

        if (!mounted) return;
        navigate(done ? '/category-selection' : '/onboarding', { replace: true });
      } catch (err) {
        console.error('AuthCallback error:', err);
        if (!mounted) return;
        setStatus('Sign in failed. Redirecting...');
        setTimeout(() => navigate('/login', { replace: true }), 800);
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
