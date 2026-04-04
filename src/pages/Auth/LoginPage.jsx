import React, { useState, useEffect } from 'react';
import { ConfigProvider, Button, Card, Typography, Alert, Spin } from 'antd';
import { GoogleOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const { Title, Text } = Typography;

const LoginPage = () => {
  const navigate = useNavigate();
  const { loginWithGoogle, user, loading } = useAuth();
  const [btnLoading, setBtnLoading] = useState(false);
  const [error, setError]           = useState('');

  // ── Auto-redirect if the user is already authenticated ───────────────────
  // This handles the case where:
  //  a) The user navigated to /login while already logged in.
  //  b) The SIGNED_IN event fired and set the user AFTER this page mounted
  //     (e.g. the PKCE exchange completed while we were briefly on /login due
  //     to a race condition in the previous auth flow).
  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  const handleGoogleLogin = async () => {
    try {
      setBtnLoading(true);
      setError('');
      await loginWithGoogle();
      // loginWithGoogle() triggers a full-page redirect to Google.
      // Code after this line only runs if the OAuth popup is used instead.
    } catch (err) {
      setError(err.message || 'Google login failed. Please try again.');
      setBtnLoading(false);
    }
  };

  // While auth is resolving, show a minimal spinner instead of the login form.
  // Prevents the login button flashing before the auto-redirect fires.
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: '#F2F3F4', gap: 20,
      }}>
        <img src="/DRAINZERO-LOGO.png" alt="DrainZero"
          style={{ height: 64, width: 'auto' }}
          onError={e => { e.target.style.display = 'none'; }}
        />
        <Spin size="large" />
        <Text style={{ color: '#6B7280', fontSize: 15 }}>Loading your account...</Text>
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
          width: '100%', maxWidth: 420, background: '#FFFFFF',
          borderRadius: 24, padding: '40px 32px',
          boxShadow: '0 8px 40px rgba(8,69,126,0.12)', boxSizing: 'border-box',
        }}>
          {/* Logo */}
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

          {/* Google Button */}
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
