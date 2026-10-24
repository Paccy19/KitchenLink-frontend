import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  adminApi,
  clearAdminToken,
  getAdminToken,
  setAdminToken,
} from '../api/adminApi';
import { clearAllSessions } from '../api/session';

const AdminContext = createContext(null);

/**
 * Holds the signed-in admin (email + password session) and exposes the
 * operations the admin panel needs. Kept separate from the customer/vendor/
 * driver contexts so a lingering customer session never affects the panel.
 */
export function AdminProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [limits, setLimits] = useState({ large_money_action_rwf: 50000 });
  const [authToken, setAuthToken] = useState(() => getAdminToken());
  const [loading, setLoading] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [error, setError] = useState('');
  // Minutes without activity before the panel signs itself out (from the server).
  const [idleMinutes, setIdleMinutes] = useState(30);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    const { admin: raw, limits: rawLimits, idle_timeout_minutes: idle } = await adminApi.me();
    if (mounted.current) {
      setAdmin(raw);
      if (rawLimits) setLimits(rawLimits);
      if (Number.isFinite(idle)) setIdleMinutes(idle);
    }
    return raw;
  }, []);

  useEffect(() => {
    if (!authToken) {
      setAdmin(null);
      return;
    }
    setLoading(true);
    setError('');
    refreshProfile()
      .catch((err) => {
        if (mounted.current) setError(err.message || 'Could not load your admin profile.');
      })
      .finally(() => {
        if (mounted.current) setLoading(false);
      });
  }, [authToken, refreshProfile]);

  useEffect(() => {
    const onUnauthorized = (event) => {
      clearAdminToken();
      setAuthToken('');
      setAdmin(null);
      setError(event?.detail || 'Your admin session has expired. Please log in again.');
    };
    const onSessionsCleared = () => {
      clearAdminToken();
      setAuthToken('');
      setAdmin(null);
    };
    window.addEventListener('ofk:admin-unauthorized', onUnauthorized);
    window.addEventListener('ofk:sessions-cleared', onSessionsCleared);
    return () => {
      window.removeEventListener('ofk:admin-unauthorized', onUnauthorized);
      window.removeEventListener('ofk:sessions-cleared', onSessionsCleared);
    };
  }, []);

  // Returns { twoFactorRequired, challengeToken, sentTo, devOtp } when an SMS
  // code is needed; finish with verifyTwoFactor.
  const login = useCallback(async (email, password) => {
    setAuthBusy(true);
    setError('');
    try {
      const result = await adminApi.login(email, password);
      if (result.two_factor_required) {
        return {
          twoFactorRequired: true,
          challengeToken: result.challenge_token,
          sentTo: result.sent_to,
          devOtp: result.dev_otp || '',
        };
      }
      clearAllSessions();
      setAdminToken(result.token);
      setAuthToken(result.token);
      setAdmin(result.admin);
      return result;
    } catch (err) {
      setError(err.message || 'Could not sign in.');
      throw err;
    } finally {
      if (mounted.current) setAuthBusy(false);
    }
  }, []);

  const verifyTwoFactor = useCallback(async (challengeToken, code) => {
    setAuthBusy(true);
    setError('');
    try {
      const result = await adminApi.verifyTwoFactor(challengeToken, code);
      clearAllSessions();
      setAdminToken(result.token);
      setAuthToken(result.token);
      setAdmin(result.admin);
      return result;
    } catch (err) {
      setError(err.message || 'Could not verify the code.');
      throw err;
    } finally {
      if (mounted.current) setAuthBusy(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearAllSessions();
    setAuthToken('');
    setAdmin(null);
    setError('');
  }, []);

  const isAuthenticated = Boolean(authToken && admin);

  // Idle timeout: no mouse, keyboard, touch or scrolling for `idleMinutes`
  // signs the admin out (the token is cancelled on the server) and clears the
  // screen, so a panel left open on a shared computer doesn't stay usable.
  // The server enforces the same limit for closed tabs and copied tokens.
  useEffect(() => {
    if (!isAuthenticated || !idleMinutes) return undefined;
    let lastActivity = Date.now();
    const touch = () => {
      lastActivity = Date.now();
    };
    const events = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll'];
    events.forEach((name) => window.addEventListener(name, touch, { passive: true }));
    const timer = setInterval(() => {
      if (Date.now() - lastActivity > idleMinutes * 60 * 1000) {
        logout();
        setError(`You were signed out after ${idleMinutes} minutes without activity. Please log in again.`);
      }
    }, 30 * 1000);
    return () => {
      events.forEach((name) => window.removeEventListener(name, touch));
      clearInterval(timer);
    };
  }, [isAuthenticated, idleMinutes, logout]);
  // What the signed-in admin may do (decided by their role on the server).
  const can = useCallback(
    (permission) => admin?.role === 'super_admin' || (admin?.permissions || []).includes(permission),
    [admin],
  );
  const hasToken = Boolean(authToken);

  const value = useMemo(
    () => ({
      admin,
      isAuthenticated,
      hasToken,
      loading,
      authBusy,
      error,
      role: admin?.role || null,
      permissions: admin?.permissions || [],
      login,
      verifyTwoFactor,
      logout,
      refreshProfile,
      isOwner: admin?.role === 'super_admin',
      can,
      limits,
    }),
    [admin, isAuthenticated, hasToken, loading, authBusy, error, login, verifyTwoFactor, logout, refreshProfile, can, limits],
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) throw new Error('useAdmin must be used within <AdminProvider>');
  return context;
}
