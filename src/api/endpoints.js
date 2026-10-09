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
export function fetchHomeFeed({ lat, lng, label } = {}) {
  return apiRequest('/home/feed', { lat, lng, label });
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
export const cancelRemoteOrder = (orderId, reason = '') =>
  apiJson('POST', `/orders/${encodeURIComponent(orderId)}/cancel`, { reason });
export const payRemoteOrder = (orderId, payload = {}) =>
  apiJson('POST', `/orders/${encodeURIComponent(orderId)}/pay`, payload);
export const fetchPaymentMethods = () => apiJson('GET', '/orders/payment-methods');
