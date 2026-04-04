import React, { useState, useEffect } from 'react';
import { ConfigProvider, Button, Typography, Alert, Spin } from 'antd';
import { GoogleOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const { Title, Text } = Typography;

const LoginPage = () => {
  const navigate = useNavigate();
  const { loginWithGoogle, user, loading, onboardingDone } = useAuth();
  const [btnLoading, setBtnLoading] = useState(false);
  const [error, setError]           = useState('');

  // If already authenticated, skip straight to the right page.
  // This also handles the edge case where the SIGNED_IN event fires
  // while the user is briefly on /login (race with AuthCallback redirect).
  useEffect(() => {
    if (loading) return;
    if (user) {
      navigate(onboardingDone ? '/dashboard' : '/onboarding', { replace: true });
    }
  }, [user, loading, onboardingDone, navigate]);

  const handleGoogleLogin = async () => {
    try {
      setBtnLoading(true);
      setError('');
      await loginWithGoogle(); // triggers full-page redirect to Google
    } catch (err) {
      setError(err.message || 'Google login failed. Please try again.');
      setBtnLoading(false);
    }
  };

  // Show spinner while auth resolves — prevents the login card flashing for
  // users who are already authenticated (e.g. after a page refresh on /login).
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: '#F2F3F4', gap: 20,
      }}>
        <img src="/DRAINZERO-LOGO.png" alt="DrainZero"
          style={{ height: 64, width: 'auto' }}
          onError={e => { e.target.style.display = 'none'; }}
        />
        <Spin size="large" />
        <Text style={{ color: '#6B7280', fontSize: 15 }}>Loading…</Text>
      </div>
    );
  }

  return (
    <ConfigProvider theme={{
      token: { colorPrimary: '#5B92E5', borderRadius: 12, fontFamily: "'Outfit', sans-serif" },
    }}>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #DCE6F5 0%, #EEF3FA 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px', boxSizing: 'border-box',
      }}>
        <div style={{
          width: '100%', maxWidth: 420,
          background: '#FFFFFF', borderRadius: 24, padding: '40px 32px',
          boxShadow: '0 8px 40px rgba(8,69,126,0.12)', boxSizing: 'border-box',
        }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <img src="/DRAINZERO-LOGO.png" alt="DrainZero"
                style={{ height: 40, width: 'auto' }}
                onError={e => { e.target.style.display = 'none'; }}
              />
              <span style={{ fontSize: 26, fontWeight: 800, color: '#08457E' }}>
                Drain<span style={{ color: '#5B92E5' }}>Zero</span>
              </span>
            </div>
            <Title level={3} style={{ margin: '0 0 8px', fontWeight: 700, color: '#084C8D', fontSize: 22 }}>
              Welcome Back
            </Title>
            <Text style={{ fontSize: 14, color: '#6B7280', display: 'block', lineHeight: 1.5 }}>
              Sign in to your tax optimization dashboard
            </Text>
          </div>

          {error && (
            <Alert message={error} type="error" showIcon
              style={{ marginBottom: 20, borderRadius: 10 }} />
          )}

          <Button
            block size="large"
            icon={<GoogleOutlined style={{ fontSize: 18 }} />}
            loading={btnLoading}
            onClick={handleGoogleLogin}
            style={{
              height: 52, borderRadius: 12, fontWeight: 600, fontSize: 15,
              borderColor: '#D1D5DB', color: '#1F2937', background: '#FFFFFF',
              width: '100%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 8,
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            }}
          >
            Continue with Google
          </Button>

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <Text style={{ color: '#6B7280', fontSize: 13 }}>
              Don't have an account?{' '}
              <Link to="/signup" style={{ color: '#5B92E5', fontWeight: 600 }}>
                Sign up free
              </Link>
            </Text>
          </div>

          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <Button type="text" size="small"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/')}
              style={{ color: '#9CA3AF', fontSize: 13 }}>
              Back to Home
            </Button>
          </div>

          <div style={{
            marginTop: 24, padding: '12px 16px',
            background: '#F9FAFB', borderRadius: 10, textAlign: 'center',
          }}>
            <Text style={{ color: '#9CA3AF', fontSize: 12 }}>
              🔒 Secure login via Google · We never see your password
            </Text>
          </div>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default LoginPage;
