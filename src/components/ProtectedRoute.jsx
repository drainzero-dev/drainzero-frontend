import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spin, Typography } from 'antd';

const { Text } = Typography;

// ─────────────────────────────────────────────────────────────────────────────
//  ProtectedRoute
//
//  loading=true  → spinner (auth context still resolving — DO NOT redirect)
//  !user         → send to /login
//  !onboarding   → send to /onboarding  (when requireOnboarding=true, default)
//  otherwise     → render children
// ─────────────────────────────────────────────────────────────────────────────
const ProtectedRoute = ({ children, requireOnboarding = true }) => {
  const { user, loading, onboardingDone } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        height: '100vh', background: '#F2F3F4', gap: 20,
      }}>
        <img
          src="/DRAINZERO-LOGO.png"
          alt="DrainZero"
          style={{ height: 64, width: 'auto' }}
          onError={e => { e.target.style.display = 'none'; }}
        />
        <Spin size="large" />
        <Text style={{ color: '#6B7280', fontSize: 15 }}>Loading…</Text>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireOnboarding && !onboardingDone) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
};

export default ProtectedRoute;
