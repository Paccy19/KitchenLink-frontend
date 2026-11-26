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

/** POST /tables/:token/orders — { items: [{ menu_item_id, quantity, option_ids, note }], guest_name, note }. */
export const placeTableOrder = (token, body) => apiJson('POST', `/tables/${t(token)}/orders`, body);

/** GET /tables/:token/orders/:id — progress per department and the bill (guest key in a header). */
export const fetchTableOrder = (token, orderId, guestKey) =>
  apiGet(`/tables/${t(token)}/orders/${encodeURIComponent(orderId)}`, {}, guestKey ? { 'X-Guest-Key': guestKey } : {});

/** POST /tables/:token/requests — "Call the waiter" / "Bring the bill" ({ kind, note }). */
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
