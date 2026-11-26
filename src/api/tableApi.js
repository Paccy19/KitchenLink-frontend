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

/** POST /tables/:token/orders — { items: [{ menu_item_id, quantity, option_ids, note }], guest_name, note }. */
export const placeTableOrder = (token, body) => apiJson('POST', `/tables/${t(token)}/orders`, body);

/** GET /tables/:token/orders/:id — progress per department and the bill (guest key in a header). */
export const fetchTableOrder = (token, orderId, guestKey) =>
  apiGet(`/tables/${t(token)}/orders/${encodeURIComponent(orderId)}`, {}, guestKey ? { 'X-Guest-Key': guestKey } : {});
