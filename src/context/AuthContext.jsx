import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../config/supabase';

const AuthContext = createContext(null);

const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const LAST_ACTIVE_KEY    = 'drainzero-last-active';

// ── Safely read any cached Supabase session from localStorage ──
const getCachedSession = () => {
  try {
    const lastActive = localStorage.getItem(LAST_ACTIVE_KEY);
    if (lastActive && Date.now() - parseInt(lastActive) > SESSION_TIMEOUT_MS) {
      localStorage.removeItem(LAST_ACTIVE_KEY);
      return null;
    }
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('supabase') || key.includes('drainzero'))) {
        try {
          const val = JSON.parse(localStorage.getItem(key));
          if (val?.access_token && val?.user) return val;
          if (val?.currentSession?.access_token) return val.currentSession;
        } catch {}
      }
    }
    return null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const cachedSession   = getCachedSession();
  const [user,           setUser]           = useState(cachedSession?.user ?? null);

  // FIX (Bug B): Always start loading=true.
  // A cached session tells us WHO the user is, but NOT their onboarding status.
  // ProtectedRoute must wait for checkOnboarding() to confirm DB state before
  // rendering any protected page — otherwise it sees onboardingDone=false and
  // immediately redirects to /onboarding before the DB check even runs.
  const [loading,        setLoading]        = useState(true);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [userProfile,    setUserProfile]    = useState(null);
  const [hasIncomeData,  setHasIncomeData]  = useState(false);

  const initRef    = useRef(false);
  const timeoutRef = useRef(null);

  // ── Wipe all app state and localStorage keys ──
  const clearAllState = useCallback(() => {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.includes('supabase') || k.includes('drainzero'))) keys.push(k);
    }
    keys.forEach(k => localStorage.removeItem(k));
    try {
      const sKeys = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && (k.includes('supabase') || k.includes('drainzero'))) sKeys.push(k);
      }
      sKeys.forEach(k => sessionStorage.removeItem(k));
    } catch {}
    setUser(null);
    setOnboardingDone(false);
    setUserProfile(null);
    setHasIncomeData(false);
  }, []);

  const handleAutoLogout = useCallback(async () => {
    try { await supabase.auth.signOut({ scope: 'local' }); } catch {}
    clearAllState();
  }, [clearAllState]);

  const updateActivity = useCallback(() => {
    localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(handleAutoLogout, SESSION_TIMEOUT_MS);
  }, [handleAutoLogout]);

  // ── Attach activity listeners when user is logged in ──
  useEffect(() => {
    if (!user) return;
    updateActivity();
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(e => window.addEventListener(e, updateActivity, { passive: true }));
    return () => {
      events.forEach(e => window.removeEventListener(e, updateActivity));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [user, updateActivity]);

  // ── Check DB for onboarding status + income data ──
  const checkOnboarding = useCallback(async (uid) => {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('id, name, full_name, email, age, gender, marital_status, employment_type, sector, profession, state, city, is_metro, onboarding_done, onboarding_complete')
        .eq('id', uid)
        .maybeSingle();

      if (!userData) {
        setOnboardingDone(false);
        setUserProfile(null);
        setHasIncomeData(false);
        return false;
      }

      const done = !!(userData.onboarding_done || userData.onboarding_complete);
      setOnboardingDone(done);
      setUserProfile(userData);

      const { data: incomeRow } = await supabase
        .from('income_profile')
        .select('user_id, gross_salary')
        .eq('user_id', uid)
        .maybeSingle();

      setHasIncomeData(!!(incomeRow && Number(incomeRow.gross_salary) > 0));
      return done;
    } catch (err) {
      console.error('checkOnboarding error:', err.message);
      // On network error, allow user through rather than locking them out
      setOnboardingDone(true);
      return true;
    }
  }, []);

  // ── Initialise once ──
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const init = async () => {
      // FIX (Bug C): For returning Google OAuth users their auth.users row already
      // exists so the DB trigger won't fire. We must ensure a public.users row
      // exists here, BEFORE checkOnboarding reads it, so they don't get stuck.
      const { data: { session } } = await supabase.auth.getSession();
      const u = session?.user ?? null;
      setUser(u);

      if (u) {
        // Ensure public.users row exists for this user (handles returning OAuth users
        // whose DB row was deleted while their auth.users record still exists)
        const { data: existingRow } = await supabase
          .from('users')
          .select('id, onboarding_done, onboarding_complete')
          .eq('id', u.id)
          .maybeSingle();

        if (!existingRow) {
          // Row missing — create it so checkOnboarding can proceed
          const fullName =
            u.user_metadata?.full_name ||
            u.user_metadata?.name ||
            u.email?.split('@')[0] ||
            'User';
          await supabase.from('users').upsert(
            {
              id: u.id,
              email: u.email,
              name: fullName,
              full_name: fullName,
              onboarding_done: false,
              onboarding_complete: false,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          );
        }

        await checkOnboarding(u.id);
      } else if (!u && cachedSession?.user) {
        clearAllState();
      }

      setLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') return;
      const u = session?.user ?? null;
      setUser(u);
      if (event === 'SIGNED_IN' && u) {
        localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
        await checkOnboarding(u.id);
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        clearAllState();
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo : `${window.location.origin}/auth/callback`,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) throw error;
  };

  const logout = async () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    try { await supabase.auth.signOut({ scope: 'local' }); } catch {}
    clearAllState();
  };

  const refreshProfile = async () => {
    if (!user) return false;
    return await checkOnboarding(user.id);
  };

  // FIX (Bug A): Expose setOnboardingDone so OnboardingPage can update it
  // synchronously BEFORE navigating — eliminates the ProtectedRoute race condition.
  const markOnboardingDone = useCallback(() => {
    setOnboardingDone(true);
  }, []);

  const markIncomeDataSaved = useCallback(() => setHasIncomeData(true), []);

  return (
    <AuthContext.Provider value={{
      user, loading, onboardingDone, userProfile,
      hasIncomeData, markIncomeDataSaved, markOnboardingDone,
      loginWithGoogle, logout, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};

export default AuthContext;
