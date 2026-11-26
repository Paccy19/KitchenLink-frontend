/**
 * Ordering at a table (public): what a table's QR code opens.
 * Guests need no account; a signed-in customer's token is sent too (client.js),
 * so their order is also saved to their account.
 *
 * @module api/tableApi
 */
import { apiGet, apiJson } from './client';

const t = (token) => encodeURIComponent(token);

/** GET /tables/:token — the kitchen, the table, its departments and the whole menu. */
export const fetchTableMenu = (token) => apiGet(`/tables/${t(token)}`);

/** POST /tables/:token/session — opens or recovers this seat's private customer session. */
export const openTableSession = (token, body = {}, sessionKey = '') =>
  apiJson('POST', `/tables/${t(token)}/session`, body, sessionKey ? { 'X-Dining-Session-Key': sessionKey } : {});

/** POST /tables/:token/orders — { items, guest_name, note }; seat QR orders require the session key. */
export const placeTableOrder = (token, body, sessionKey = '') =>
  apiJson('POST', `/tables/${t(token)}/orders`, body, sessionKey ? { 'X-Dining-Session-Key': sessionKey } : {});

/** GET /tables/:token/orders/:id — progress per department and the bill (guest key in a header). */
export const fetchTableOrder = (token, orderId, guestKey) =>
  apiGet(`/tables/${t(token)}/orders/${encodeURIComponent(orderId)}`, {}, guestKey ? { 'X-Guest-Key': guestKey } : {});
