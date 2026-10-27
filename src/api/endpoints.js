/**
 * Home / discovery API service layer.
 *
 * Each function performs one backend call and resolves with the RAW JSON
 * contract (see `types.js`). Normalisation into view-models happens in the
 * React Query hooks so the service layer stays framework agnostic.
 *
 * @module api/endpoints
 */

import { apiJson, apiRequest } from './client';

/**
 * GET /home/feed?lat={lat}&lng={lng}
 * Combined home screen payload: categories + featured/nearby kitchens +
 * popular dishes for the given coordinates.
 *
 * @param {{lat:number|string, lng:number|string, label?:string}} location
 * @returns {Promise<import('./types').RawHomeFeed>}
 */
export function fetchHomeFeed({ lat, lng, label, vendor_type } = {}) {
  return apiRequest('/home/feed', { lat, lng, label, vendor_type });
}

/** GET /geo/route — the road route, distance, time and steps between two points ({lat, lng}). */
export function fetchRoute({ from, to }) {
  return apiRequest('/geo/route', { from_lat: from.lat, from_lng: from.lng, to_lat: to.lat, to_lng: to.lng });
}

/** GET /banks — banks for withdrawals, each with its account-number length (min/max digits). */
export function fetchBanks() {
  return apiRequest('/banks');
}

/** GET /vendors/types — every kitchen type with its label and description. */
export function fetchVendorTypes() {
  return apiRequest('/vendors/types');
}

/**
 * GET /home/categories
 * @returns {Promise<{categories: import('./types').RawCategory[]}>}
 */
export function fetchCategories() {
  return apiRequest('/home/categories');
}

/**
 * GET /home/vendors/nearby?lat&lng&radius&category_id&sort&page&limit
 *
 * @param {{
 *   lat:number|string, lng:number|string,
 *   radius?:number, category_id?:string,
 *   sort?:'distance'|'rating',
 *   page?:number, limit?:number
 * }} params
 * @returns {Promise<import('./types').RawNearbyVendors>}
 */
export function fetchNearbyVendors(params = {}) {
  return apiRequest('/home/vendors/nearby', params);
}

/**
 * GET /home/vendors/map?lat&lng&category_id — every kitchen whose store is
 * open, at any distance, for exploring on the map. With lat/lng each has
 * `distance_km` and they come nearest first.
 */
export function fetchMapVendors(params = {}) {
  return apiRequest('/home/vendors/map', params);
}

/** GET /vendors/offers?lat&lng — upcoming "Offer Days" from every kitchen, soonest first. */
export function fetchVendorOffers(params = {}) {
  return apiRequest('/vendors/offers', params);
}

/**
 * GET /home/vendors?lat&lng&category_id&sort&page&limit — every kitchen in
 * the system, near or far; with lat/lng the nearby ones (`is_nearby`) come first.
 */
export function fetchAllVendors(params = {}) {
  return apiRequest('/home/vendors', params);
}

/**
 * GET /home/search?q={query}&lat={lat}&lng={lng}
 *
 * @param {{q:string, lat:number|string, lng:number|string}} params
 * @returns {Promise<import('./types').RawSearchResults>}
 */
export function searchHome(params = {}) {
  return apiRequest('/home/search', params);
}

/**
 * GET /vendors/{vendor_id}
 *
 * @param {string} vendorId
 * @returns {Promise<import('./types').RawVendorDetail>}
 */
export function fetchVendorStorefront(vendorId) {
  return apiRequest(`/vendors/${encodeURIComponent(vendorId)}`);
}

/**
 * GET /vendors/specials?lat&lng
 * Active "Tomorrow's Special" announcements across nearby kitchens.
 *
 * @param {{lat:number|string, lng:number|string}} params
 * @returns {Promise<{specials: import('./types').RawVendorSpecialCard[]}>}
 */
export function fetchVendorSpecials(params = {}) {
  return apiRequest('/vendors/specials', params);
}

/**
 * GET /vendors/{vendor_id}/delivery-quote?lat&lng
 * Delivery fee priced by road distance from the kitchen to the drop-off.
 *
 * @param {string} vendorId
 * @param {{lat:number, lng:number}} coords
 * @returns {Promise<{delivery_fee_rwf:number, distance_km:number, duration_minutes:number|null, distance_source:'google'|'estimate'}>}
 */
export function fetchDeliveryQuote(vendorId, { lat, lng }) {
  return apiRequest(`/vendors/${encodeURIComponent(vendorId)}/delivery-quote`, { lat, lng });
}

export const sendOtp = (phoneNumber, name) =>
  apiJson('POST', '/auth/send-otp', {
    phone_number: phoneNumber,
    ...(name ? { name } : {}),
  });

export const verifyOtp = (phoneNumber, code, name) =>
  apiJson('POST', '/auth/verify-otp', {
    phone_number: phoneNumber,
    code,
    ...(name ? { name } : {}),
  });

export const fetchCurrentCustomer = () => apiJson('GET', '/auth/me');

export const updateCurrentCustomerProfile = (payload) =>
  apiJson('PATCH', '/auth/me/profile', payload);

/** Records the signed-in customer's current GPS position on the server. */
export const reportCustomerLocation = ({ lat, lng, accuracyM }) =>
  apiJson('PUT', '/auth/me/location', {
    latitude: lat,
    longitude: lng,
    ...(accuracyM != null ? { accuracy_m: accuracyM } : {}),
  });

export const fetchCart = () => apiJson('GET', '/cart');
export const addCartItem = (menuItemId, quantity = 1) =>
  apiJson('POST', '/cart', { menu_item_id: menuItemId, quantity });
export const updateCartItem = (menuItemId, quantity) =>
  apiJson('PATCH', `/cart/${encodeURIComponent(menuItemId)}`, { quantity });
export const removeCartItem = (menuItemId) =>
  apiJson('DELETE', `/cart/${encodeURIComponent(menuItemId)}`);
export const clearRemoteCart = () => apiJson('DELETE', '/cart');
export const replaceRemoteCart = (items) => apiJson('PUT', '/cart', { items });

export const fetchWishlist = () => apiJson('GET', '/wishlist');
export const addWishlistItem = (menuItemId) =>
  apiJson('POST', '/wishlist', { menu_item_id: menuItemId });
export const removeWishlistItem = (menuItemId) =>
  apiJson('DELETE', `/wishlist/${encodeURIComponent(menuItemId)}`);
export const moveWishlistItemToCart = (menuItemId, quantity = 1) =>
  apiJson('POST', `/wishlist/${encodeURIComponent(menuItemId)}/move-to-cart`, { quantity });

export const fetchOrders = (params = {}) =>
  apiRequest('/orders', params);
export const fetchOrder = (orderId) =>
  apiJson('GET', `/orders/${encodeURIComponent(orderId)}`);
export const fetchOrderTracking = (orderId) =>
  apiJson('GET', `/orders/${encodeURIComponent(orderId)}/track`);
export const createOrder = (payload) => apiJson('POST', '/orders/checkout', payload);
// Big events: a kitchen's offer and price (guests, delivery or pick-up, venue), then the order.
export const fetchEventQuote = (payload) => apiJson('POST', '/orders/event-quote', payload);
export const createEventOrder = (payload) => apiJson('POST', '/orders/event-checkout', payload);
export const cancelRemoteOrder = (orderId, reason = '') =>
  apiJson('POST', `/orders/${encodeURIComponent(orderId)}/cancel`, { reason });
export const payRemoteOrder = (orderId, payload = {}) =>
  apiJson('POST', `/orders/${encodeURIComponent(orderId)}/pay`, payload);
export const fetchPaymentMethods = () => apiJson('GET', '/orders/payment-methods');
// A pickup order the customer now wants delivered: price it, then pay the fee and switch.
export const quoteSwitchToDelivery = (orderId, deliveryLocation) =>
  apiJson('POST', `/orders/${encodeURIComponent(orderId)}/switch-to-delivery/quote`, { delivery_location: deliveryLocation });
export const switchOrderToDelivery = (orderId, payload) =>
  apiJson('POST', `/orders/${encodeURIComponent(orderId)}/switch-to-delivery`, payload);
export const fetchRefunds = () => apiJson('GET', '/orders/refunds');
export const changeRefundDestination = (orderId, phone) =>
  apiJson('PUT', `/orders/${encodeURIComponent(orderId)}/refund-destination`, { phone });

// Support conversations with the admin support team.
export const supportApi = {
  list: () => apiJson('GET', '/support'),
  unreadCount: () => apiJson('GET', '/support/unread-count'),
  create: (payload) => apiJson('POST', '/support', payload),
  get: (ticketId) => apiJson('GET', `/support/${encodeURIComponent(ticketId)}`),
  reply: (ticketId, message) =>
    apiJson('POST', `/support/${encodeURIComponent(ticketId)}/messages`, { message }),
};

// Customer–kitchen chat (one conversation per kitchen).
export const chatApi = {
  list: () => apiJson('GET', '/chats'),
  unreadCount: () => apiJson('GET', '/chats/unread-count'),
  openWithVendor: (vendorId) => apiJson('POST', `/chats/with/${encodeURIComponent(vendorId)}`),
  get: (id, params = {}) => apiRequest(`/chats/${encodeURIComponent(id)}`, params),
  send: (id, body) => apiJson('POST', `/chats/${encodeURIComponent(id)}/messages`, { body }),
  markRead: (id) => apiJson('POST', `/chats/${encodeURIComponent(id)}/read`),
};

export const fetchNotifications = (params = {}) =>
  apiRequest('/notifications', params);
export const markNotificationRead = (notificationId) =>
  apiJson('POST', `/notifications/${encodeURIComponent(notificationId)}/read`);
export const markAllNotificationsRead = () =>
  apiJson('POST', '/notifications/read-all');

/**
 * GET /geo/places/autocomplete?q&lat&lng — place suggestions (areas, streets,
 * landmarks) while a vendor types their kitchen's location.
 * @returns {Promise<{suggestions: Array<{id:string, name:string, secondary:string, kind:'area'|'street'|'place', lat?:number, lng?:number, bounds?:number[]|null}>}>}
 */
export function fetchPlaceSuggestions({ q, lat, lng } = {}) {
  return apiRequest('/geo/places/autocomplete', { q, lat, lng });
}

/**
 * GET /geo/places/details?id — a picked place: position, the box to frame
 * ([west, south, east, north]) and, for areas, the zone outline (GeoJSON).
 */
export function fetchPlaceDetails(id) {
  return apiRequest('/geo/places/details', { id });
}

/** GET /geo/places/reverse?lat&lng — the area and street at a point ({ area, street }). */
export function fetchPlaceAt({ lat, lng }) {
  return apiRequest('/geo/places/reverse', { lat, lng });
}

/**
 * GET /orders/{order_id}/live — the delivery worker's live position, the road
 * route to where they are heading (kitchen, then you) and the ETA.
 */
export function fetchOrderLive(orderId) {
  return apiRequest(`/orders/${encodeURIComponent(orderId)}/live`);
}
