import React, {
  createContext, useContext, useEffect, useState, useRef, useCallback,
} from 'react';
import { supabase } from '../config/supabase';

const AuthContext = createContext(null);

const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const LAST_ACTIVE_KEY    = 'drainzero-last-active';

// ─── Read cached Supabase session from localStorage ───────────────────────────
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

// ─── Create a public.users row for OAuth users that don't have one ────────────
// The DB trigger only fires on the FIRST auth.users INSERT — not on re-login.
// If the public.users row was deleted (e.g. wiped from the dashboard), returning
// users authenticate fine but have no profile row → checkOnboarding loops.
const ensurePublicUserRow = async (authUser) => {
  if (!authUser?.id) return null;
  const fullName =
    authUser.user_metadata?.full_name ||
    authUser.user_metadata?.name       ||
    authUser.email?.split('@')[0]      ||
    'User';

  // ignoreDuplicates: safe no-op when the row already exists
  const { data: row } = await supabase
    .from('users')
    .upsert(
      { id: authUser.id, email: authUser.email, name: fullName, full_name: fullName },
      { onConflict: 'id', ignoreDuplicates: true },
    )
    .select('id, onboarding_done, onboarding_complete')
    .maybeSingle();

  if (row) return row;

  // ignoreDuplicates=true means no data returned when row existed → read it back
  const { data: existing } = await supabase
    .from('users')
    .select('id, onboarding_done, onboarding_complete')
    .eq('id', authUser.id)
    .maybeSingle();

  if (existing) return existing;

  // Genuinely new row needed (trigger missed it)
  const { data: inserted } = await supabase
    .from('users')
    .insert({
      id                  : authUser.id,
      email               : authUser.email,
      name                : fullName,
      full_name           : fullName,
      onboarding_done     : false,
      onboarding_complete : false,
      updated_at          : new Date().toISOString(),
    })
    .select('id, onboarding_done, onboarding_complete')
    .maybeSingle();

  return inserted;
};

export const AuthProvider = ({ children }) => {
  const cachedSession = getCachedSession();

  // Initialise user from localStorage so ProtectedRoute doesn't flash the
  // spinner on every page navigation for already-logged-in users.
  const [user,           setUser]           = useState(cachedSession?.user ?? null);
  const [loading,        setLoading]        = useState(true);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [userProfile,    setUserProfile]    = useState(null);
  const [hasIncomeData,  setHasIncomeData]  = useState(false);

  const initRef    = useRef(false);
  const timeoutRef = useRef(null);

  // ── Wipe all app state ──────────────────────────────────────────────────────
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

  // ── Check DB for onboarding status + income data ────────────────────────────
  const checkOnboarding = useCallback(async (uid) => {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select(
          'id, name, full_name, email, age, gender, marital_status, employment_type, ' +
          'sector, profession, state, city, is_metro, onboarding_done, onboarding_complete',
        )
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
      setOnboardingDone(true);
      return true;
    }
  }, []);

  // ── Main auth init ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    // ── SAFETY NET: never leave the app in a loading=true state forever ──
    // If neither SIGNED_IN nor INITIAL_SESSION resolve within 12 s, release.
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 12000);

    // ── STEP 1: Listen to auth state changes ────────────────────────────────
    //
    //  Key design decisions:
    //
    //  A) We DO handle INITIAL_SESSION — Supabase fires it once on startup.
    //     For returning users with a stored session it carries the session.
    //     For brand-new PKCE callbacks it fires with null BEFORE the code
    //     exchange completes.
    //
    //  B) We DO handle SIGNED_IN — Supabase fires this after:
    //     - A fresh Google OAuth login (PKCE code exchange complete)
    //     - Token auto-refresh
    //
    //  C) We MUST NOT call setLoading(false) in init() when session is null
    //     and we are on the /auth/callback page — the PKCE exchange is still
    //     running. Setting loading=false here is the race condition that makes
    //     ProtectedRoute redirect to /login while the session is mid-flight.

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const u = session?.user ?? null;

        if (event === 'INITIAL_SESSION') {
          // Case A — returning user: session already in localStorage
          if (u) {
            setUser(u);
            await ensurePublicUserRow(u);
            await checkOnboarding(u.id);
            clearTimeout(safetyTimer);
            setLoading(false);
          }
          // Case B — new login / callback page: session is null, SIGNED_IN
          // will fire once the PKCE exchange completes. Stay loading=true.
          // The safety timer above prevents an infinite spinner.
          return;
        }

        if (event === 'SIGNED_IN') {
          // Fires after PKCE code exchange OR after a manual email/password login.
          // This is the event that resolves the callback-page race condition.
          setUser(u);
          if (u) {
            localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
            // Ensure the public.users row exists BEFORE checking onboarding.
            // If the row was deleted from Supabase dashboard, checkOnboarding
            // would find nothing and mark onboardingDone=false in a loop.
            await ensurePublicUserRow(u);
            await checkOnboarding(u.id);
          }
          clearTimeout(safetyTimer);
          setLoading(false);
          return;
        }

        if (event === 'TOKEN_REFRESHED') {
          setUser(u);
          return;
        }

        if (event === 'SIGNED_OUT') {
          clearTimeout(safetyTimer);
          clearAllState();
          setLoading(false);
          return;
        }
      },
    );

    // ── STEP 2: Fast-path for returning users ────────────────────────────────
    //
    //  getSession() reads synchronously from localStorage (the Supabase
    //  client caches it). If a session is already there, we can set the user
    //  immediately so ProtectedRoute doesn't flash a spinner on normal nav.
    //  We do NOT call setLoading(false) here — that's the subscription's job.
    const fastPath = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Session already available — update state immediately.
          // The INITIAL_SESSION event will run checkOnboarding shortly after.
          setUser(session.user);
        } else if (!session && !window.location.pathname.includes('/auth/callback')) {
          // No session and not on the callback page → definitely not logged in.
          // INITIAL_SESSION will fire with null too; pre-emptively release loading.
          clearTimeout(safetyTimer);
          setLoading(false);
        }
        // If no session AND on callback page → stay loading=true, wait for SIGNED_IN.
      } catch (err) {
        console.error('AuthContext fastPath error:', err.message);
        clearTimeout(safetyTimer);
        setLoading(false);
      }
    };

    fastPath();

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Public API ──────────────────────────────────────────────────────────────
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

  // Lets OnboardingPage sync state before navigate() — prevents ProtectedRoute
  // from seeing onboardingDone=false on the very first render after submit.
  const markOnboardingDone  = useCallback(() => setOnboardingDone(true), []);
  const markIncomeDataSaved = useCallback(() => setHasIncomeData(true),  []);

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
