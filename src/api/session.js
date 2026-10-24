/**
 * Cross-role session bookkeeping.
 *
 * Only one role may be signed in at a time. Every role's sign-in wipes any
 * other lingering session, and every sign-out wipes all of them so the
 * marketplace always returns to a clean guest state.
 *
 * @module api/session
 */

import { buildUrl } from './client';

export const SESSION_KEYS = [
  'ofk_access_token',
  'ofk_user',
  'ofk_vendor_token',
  'ofk_vendor_registered',
  'ofk_vendor_profile_v2',
  'ofk_driver_token',
  'ofk_admin_token',
];

/** Removes every stored credential/user snapshot without touching React state. */
export const clearStoredSession = () => {
  SESSION_KEYS.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* storage may be unavailable (private mode) */
    }
  });
};

// Where each stored token is signed out on the server.
const LOGOUT_PATHS = {
  ofk_access_token: '/auth/logout',
  ofk_vendor_token: '/vendor/auth/logout',
  ofk_driver_token: '/driver/auth/logout',
  ofk_admin_token: '/admin/auth/logout',
};

/**
 * Tells the server to sign out every stored token, so a copy of it stops
 * working too. Fire-and-forget (keepalive survives a page change); a token
 * that already expired just gets a harmless 401.
 */
const revokeStoredTokens = () => {
  Object.entries(LOGOUT_PATHS).forEach(([key, path]) => {
    let token = '';
    try {
      token = localStorage.getItem(key) || '';
    } catch {
      /* storage may be unavailable (private mode) */
    }
    if (!token) return;
    fetch(buildUrl(path), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      keepalive: true,
    }).catch(() => {
      /* offline: the token still expires on its own */
    });
  });
};

/**
 * Wipes all role sessions and notifies every context to reset its state.
 * Contexts listen for `ofk:sessions-cleared` and must not re-dispatch it.
 * Every sign-in calls this before saving its new token, so only old
 * sessions are signed out on the server.
 */
export const clearAllSessions = () => {
  revokeStoredTokens();
  clearStoredSession();
  window.dispatchEvent(new Event('ofk:sessions-cleared'));
};
