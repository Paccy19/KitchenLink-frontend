/**
 * Cross-role session bookkeeping.
 *
 * Only one role may be signed in at a time. Every role's sign-in wipes any
 * other lingering session, and every sign-out wipes all of them so the
 * marketplace always returns to a clean guest state.
 *
 * @module api/session
 */

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

/**
 * Wipes all role sessions and notifies every context to reset its state.
 * Contexts listen for `ofk:sessions-cleared` and must not re-dispatch it.
 */
export const clearAllSessions = () => {
  clearStoredSession();
  window.dispatchEvent(new Event('ofk:sessions-cleared'));
};
