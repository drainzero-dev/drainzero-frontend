import React, {
  createContext, useContext, useEffect, useState, useRef, useCallback,
} from 'react';
import { supabase } from '../config/supabase';

const AuthContext = createContext(null);

// ─── helpers ─────────────────────────────────────────────────────────────────
const isCallbackPage = () =>
  window.location.pathname.toLowerCase().includes('/auth/callback');

// Ensure public.users row exists for this auth user.
// The DB trigger only fires on the very first INSERT into auth.users.
// Returning users whose public row was deleted (e.g. dashboard wipe) have no
// row here, so checkOnboarding returns null and the app loops.
export const ensurePublicUserRow = async (authUser) => {
  if (!authUser?.id) return null;

  const fullName =
    authUser.user_metadata?.full_name ||
    authUser.user_metadata?.name       ||
    authUser.email?.split('@')[0]      ||
    'User';

  // Try to read first — cheapest path for existing users
  const { data: existing } = await supabase
    .from('users')
    .select('id, onboarding_done, onboarding_complete')
    .eq('id', authUser.id)
    .maybeSingle();

  if (existing) return existing;

  // Row missing — create it
  const { data: inserted, error } = await supabase
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

  if (error && error.code !== '23505') {
    // 23505 = unique violation (another request beat us to it) — safe to ignore
    console.error('[Auth] ensurePublicUserRow:', error.message);
  }

  if (inserted) return inserted;

  // If insert failed with a unique conflict, just read the row
  const { data: retry } = await supabase
    .from('users')
    .select('id, onboarding_done, onboarding_complete')
    .eq('id', authUser.id)
    .maybeSingle();

  return retry;
};

// ─── provider ────────────────────────────────────────────────────────────────
export const AuthProvider = ({ children }) => {
  const [user,           setUser]           = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [userProfile,    setUserProfile]    = useState(null);
  const [hasIncomeData,  setHasIncomeData]  = useState(false);

  const initDone   = useRef(false);
  const safetyRef  = useRef(null);

  // ── clear all session state ───────────────────────────────────────────────
  const clearAllState = useCallback(() => {
    setUser(null);
    setOnboardingDone(false);
    setUserProfile(null);
    setHasIncomeData(false);
  }, []);

  // ── fetch onboarding + income status from DB ──────────────────────────────
  const checkOnboarding = useCallback(async (uid) => {
    if (!uid) return false;
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select(
          'id, name, full_name, email, age, gender, marital_status, ' +
          'employment_type, sector, profession, state, city, is_metro, ' +
          'onboarding_done, onboarding_complete'
        )
        .eq('id', uid)
        .maybeSingle();

      if (error) throw error;
      if (!userData) {
        setOnboardingDone(false);
        setUserProfile(null);
        setHasIncomeData(false);
        return false;
      }

      const done = !!(userData.onboarding_done || userData.onboarding_complete);
      setOnboardingDone(done);
      setUserProfile(userData);

      const { data: income } = await supabase
        .from('income_profile')
        .select('user_id, gross_salary')
        .eq('user_id', uid)
        .maybeSingle();

      setHasIncomeData(!!(income && Number(income.gross_salary) > 0));
      return done;
    } catch (err) {
      console.error('[Auth] checkOnboarding:', err.message);
      // On network error, don't lock user out — let them through
      setOnboardingDone(true);
      return true;
    }
  }, []);

  // ── handle an authenticated user (create row if needed, check onboarding) ─
  const processUser = useCallback(async (authUser) => {
    if (!authUser) return;
    await ensurePublicUserRow(authUser);
    await checkOnboarding(authUser.id);
  }, [checkOnboarding]);

  // ── main auth init — runs once ────────────────────────────────────────────
  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    // Safety valve: never leave the app spinner-locked forever
    safetyRef.current = setTimeout(() => {
      console.warn('[Auth] safety timer fired — forcing loading=false');
      setLoading(false);
    }, 12000);

    const done = () => {
      clearTimeout(safetyRef.current);
      setLoading(false);
    };

    // ── Subscribe to Supabase auth events ─────────────────────────────────
    //
    // Event sequence for a FRESH login via Google OAuth (PKCE):
    //   1. INITIAL_SESSION  → session = null (no stored session yet)
    //   2. SIGNED_IN        → session = { user, ... } (after code exchange)
    //
    // Event sequence for a RETURNING user (stored session in localStorage):
    //   1. INITIAL_SESSION  → session = { user, ... }  ← we act here
    //   (no SIGNED_IN unless the token was refreshed)
    //
    // Event sequence for a LOGGED OUT user:
    //   1. INITIAL_SESSION  → session = null
    //   (no SIGNED_IN)
    //
    // We MUST NOT call done() on INITIAL_SESSION with null when we're on the
    // callback page — SIGNED_IN hasn't fired yet (exchange in progress).

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth]', event, session?.user?.email ?? 'no user');

        if (event === 'TOKEN_REFRESHED') {
          // Silently update user reference, no loading change needed
          setUser(session?.user ?? null);
          return;
        }

        if (event === 'SIGNED_OUT') {
          clearAllState();
          done();
          return;
        }

        if (event === 'INITIAL_SESSION') {
          if (session?.user) {
            // Returning user — process immediately
            setUser(session.user);
            await processUser(session.user);
            done();
          } else {
            // No session yet.
            // If we're on the callback page, SIGNED_IN will fire after exchange.
            // Anywhere else, the user is simply logged out.
            if (!isCallbackPage()) {
              done();
            }
            // else: stay loading=true, wait for SIGNED_IN
          }
          return;
        }

        if (event === 'SIGNED_IN') {
          const u = session?.user ?? null;
          setUser(u);
          if (u) {
            await processUser(u);
          }
          done();
          return;
        }
      }
    );

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── public API ────────────────────────────────────────────────────────────
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
    try { await supabase.auth.signOut({ scope: 'local' }); } catch {}
    clearAllState();
  };

  const refreshProfile = async () => {
    if (!user) return false;
    return await checkOnboarding(user.id);
  };

  const markOnboardingDone  = useCallback(() => setOnboardingDone(true),  []);
  const markIncomeDataSaved = useCallback(() => setHasIncomeData(true),   []);

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
