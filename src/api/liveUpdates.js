/**
 * App-wide "something changed" signal that keeps every screen fresh.
 *
 * Every successful action (any non-GET request: accepting an order,
 * confirming a delivery, a withdrawal…) calls `notifyDataChanged`, and every
 * open dashboard reloads its data. Changes made by other people (a customer
 * ordering, a delivery worker confirming) are picked up by the periodic
 * refresh in `useAutoRefresh`.
 *
 * @module api/liveUpdates
 */

const EVENT = 'ofk:data-changed';

// Background housekeeping that should not make every screen reload.
const QUIET_PATHS = [/\/driver\/location$/, /\/vendor\/availability$/, /\/read(-all)?$/, /\/auth\//];

export function notifyDataChanged(method = 'GET', path = '') {
  if (String(method).toUpperCase() === 'GET') return;
  if (QUIET_PATHS.some((pattern) => pattern.test(path))) return;
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { method, path } }));
}

/** Subscribe to data changes; returns an unsubscribe function. */
export function onDataChanged(callback) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(EVENT, callback);
  return () => window.removeEventListener(EVENT, callback);
}
