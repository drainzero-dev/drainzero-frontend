import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';
import { Spin } from 'antd';

const ProtectedRoute = ({ children, requireOnboarding = true }) => {
  const { user, loading, onboardingDone } = useAuth();
  const location = useLocation();
  const [directCheck, setDirectCheck] = useState({ done: false, hasSession: false, isOnboarded: false });

  useEffect(() => {
    // Only run once on mount — direct Supabase check as backup
    const check = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setDirectCheck({ done: true, hasSession: false, isOnboarded: false });
          return;
        }
        const { data: profile } = await supabase
          .from('users')
          .select('onboarding_done, onboarding_complete')
          .eq('id', session.user.id)
          .maybeSingle();
        const onboarded = !!(profile?.onboarding_done || profile?.onboarding_complete);
        setDirectCheck({ done: true, hasSession: true, isOnboarded: onboarded });
      } catch {
        // On any error assume logged in — better than false logout
        setDirectCheck({ done: true, hasSession: !!user, isOnboarded: true });
      }
    };
    check();
  }, []); // only on mount

  // Show spinner while loading
  if (loading || !directCheck.done) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F2F3F4' }}>
        <Spin size="large" />
      </div>
    );
  }

  // Check login — use context OR direct check
  const isLoggedIn = !!(user || directCheck.hasSession);
  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check onboarding — use context OR direct check
  const isOnboarded = onboardingDone || directCheck.isOnboarded;
  if (requireOnboarding && !isOnboarded) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
};

export default ProtectedRoute;
