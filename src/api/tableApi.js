/**
 * Ordering at a table (public): what a table's QR code opens.
 * Guests need no account; a signed-in customer's token is sent too (client.js),
 * so their order is also saved to their account.
 *
 * @module api/tableApi
 */
import { apiGet, apiJson, buildUrl, ApiError } from './client';

const t = (token) => encodeURIComponent(token);

/** GET /tables/:token — the kitchen, the table, its departments and the whole menu. */
export const fetchTableMenu = (token) => apiGet(`/tables/${t(token)}`);

/** POST /tables/:token/session — opens or recovers this seat's private customer session. */
export const openTableSession = (token, body = {}, sessionKey = '') =>
  apiJson('POST', `/tables/${t(token)}/session`, body, sessionKey ? { 'X-Dining-Session-Key': sessionKey } : {});

/** POST /tables/:token/orders — { items, guest_name, note }; seat QR orders require the session key. */
export const placeTableOrder = (token, body, sessionKey = '') =>
  apiJson('POST', `/tables/${t(token)}/orders`, body, sessionKey ? { 'X-Dining-Session-Key': sessionKey } : {});

/** GET /tables/:token/payment-seats — only the caller's seat and active consents. */
export const fetchTablePaymentSeats = (token, sessionKey = '') =>
  apiGet(`/tables/${t(token)}/payment-seats`, {}, sessionKey ? { 'X-Dining-Session-Key': sessionKey } : {});

/** Payment-consent and Paypack endpoints are scoped to the caller's seat session. */
export const authorizeTablePayment = (token, sessionKey = '') =>
  apiJson('POST', `/tables/${t(token)}/payment-authorizations`, {}, sessionKey ? { 'X-Dining-Session-Key': sessionKey } : {});
export const acceptTablePaymentAuthorization = (token, code, sessionKey = '') =>
  apiJson('POST', `/tables/${t(token)}/payment-authorizations/join`, { code }, sessionKey ? { 'X-Dining-Session-Key': sessionKey } : {});
export const revokeTablePaymentAuthorization = (token, authorizationId, sessionKey = '') =>
  apiJson('DELETE', `/tables/${t(token)}/payment-authorizations/${encodeURIComponent(authorizationId)}`, {}, sessionKey ? { 'X-Dining-Session-Key': sessionKey } : {});
export const startTablePayment = (token, body, sessionKey = '') =>
  apiJson('POST', `/tables/${t(token)}/payments`, body, sessionKey ? { 'X-Dining-Session-Key': sessionKey } : {});
export const checkTablePayment = (token, paymentId, sessionKey = '') =>
  apiJson('POST', `/tables/${t(token)}/payments/${encodeURIComponent(paymentId)}/check`, {}, sessionKey ? { 'X-Dining-Session-Key': sessionKey } : {});

/** GET /tables/:token/orders/:id — progress per department and the bill (guest key in a header). */
export const fetchTableOrder = (token, orderId, guestKey) =>
  apiGet(`/tables/${t(token)}/orders/${encodeURIComponent(orderId)}`, {}, guestKey ? { 'X-Guest-Key': guestKey } : {});

/** POST /tables/:token/requests — "Call the waiter" / "Bring the bill" ({ kind, note }). */
/** A guest answers the kitchen about a dish it can't make: { choice: remove | swap | cancel }. */
export const respondTableIssue = (token, orderId, issueId, guestKey, choice) =>
  apiJson('POST', `/tables/${t(token)}/orders/${encodeURIComponent(orderId)}/issues/${encodeURIComponent(issueId)}/respond`, { choice }, guestKey ? { 'X-Guest-Key': guestKey } : {});
export const sendTableRequest = (token, body) => apiJson('POST', `/tables/${t(token)}/requests`, body);
export const fetchTableRequests = (token) => apiGet(`/tables/${t(token)}/requests`);

/** POST /tables/:token/orders/:id/feedback — { rating 1-5, comment, is_public }; guest key in a header. */
export async function sendTableFeedback(token, orderId, guestKey, body) {
  const response = await fetch(buildUrl(`/tables/${t(token)}/orders/${encodeURIComponent(orderId)}/feedback`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(guestKey ? { 'X-Guest-Key': guestKey } : {}) },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(data?.error?.message || 'Could not send your rating.', { status: response.status, code: data?.error?.code || '' });
  return data;
}
