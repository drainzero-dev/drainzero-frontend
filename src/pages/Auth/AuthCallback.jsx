import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spin, Typography } from 'antd';
import { supabase } from '../../config/supabase';

const { Text } = Typography;

const AuthCallback = () => {
  const navigate    = useNavigate();
  const doneRef     = useRef(false);
  const [status, setStatus] = useState('Setting up your account...');

  useEffect(() => {
    const handleCallback = async () => {
      if (doneRef.current) return;
      doneRef.current = true;

      try {
        setStatus('Completing sign in...');

        // Exchange the code for a session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Session error:', error.message);
          navigate('/login', { replace: true });
          return;
        }

        if (!session || !session.user) {
          // Try to get session from URL hash/code
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(
            window.location.href
          );
          
          if (exchangeError || !data.session) {
            console.error('Exchange error:', exchangeError?.message);
            navigate('/login', { replace: true });
            return;
          }
        }

        setStatus('Checking your profile...');

        // Get fresh session
        const { data: { session: freshSession } } = await supabase.auth.getSession();
        
        if (!freshSession) {
          navigate('/login', { replace: true });
          return;
        }

        const userId = freshSession.user.id;

        // Check onboarding status directly from Supabase
        const { data: profile } = await supabase
          .from('users')
          .select('onboarding_done, onboarding_complete, name')
          .eq('id', userId)
          .maybeSingle();

        const onboardingDone = !!(profile?.onboarding_done || profile?.onboarding_complete);

        setStatus('Redirecting...');

        if (onboardingDone) {
          navigate('/category-selection', { replace: true });
        } else {
          navigate('/onboarding', { replace: true });
        }

      } catch (err) {
        console.error('AuthCallback error:', err.message);
        navigate('/login', { replace: true });
      }
    };

    // Small delay to let Supabase process the OAuth response
    const timer = setTimeout(handleCallback, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#F2F3F4', gap: 16
    }}>
      <Spin size="large" />
      <Text style={{ color: '#6B7280', fontSize: 16 }}>{status}</Text>
    </div>
  );
};

export default AuthCallback;
