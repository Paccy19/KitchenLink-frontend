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
  const [authToken, setAuthToken] = useState(() => getAdminToken());
  const [loading, setLoading] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    const { admin: raw } = await adminApi.me();
    if (mounted.current) setAdmin(raw);
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
    const onUnauthorized = () => {
      clearAdminToken();
      setAuthToken('');
      setAdmin(null);
      setError('Your admin session has expired. Please log in again.');
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

  const login = useCallback(async (email, password) => {
    setAuthBusy(true);
    setError('');
    try {
      const result = await adminApi.login(email, password);
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

  const logout = useCallback(() => {
    clearAllSessions();
    setAuthToken('');
    setAdmin(null);
    setError('');
  }, []);

  const isAuthenticated = Boolean(authToken && admin);
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
      logout,
      refreshProfile,
    }),
    [admin, isAuthenticated, hasToken, loading, authBusy, error, login, logout, refreshProfile],
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) throw new Error('useAdmin must be used within <AdminProvider>');
  return context;
}
