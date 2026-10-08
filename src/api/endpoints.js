/**
 * Home / discovery API service layer.
 *
 * Each function performs one backend call and resolves with the RAW JSON
 * contract (see `types.js`). Normalisation into view-models happens in the
 * React Query hooks so the service layer stays framework agnostic.
 *
 * @module api/endpoints
 */

import { apiRequest } from './client';
import {
  handleCategories,
  handleFeed,
  handleNearbyVendors,
  handleSearch,
  handleVendorDetail,
} from './mock/mockServer';

/**
 * GET /home/feed?lat={lat}&lng={lng}
 * Combined home screen payload: categories + featured/nearby kitchens +
 * popular dishes for the given coordinates.
 *
 * @param {{lat:number|string, lng:number|string, label?:string}} location
 * @returns {Promise<import('./types').RawHomeFeed>}
 */
export function fetchHomeFeed({ lat, lng, label } = {}) {
  return apiRequest('/home/feed', { lat, lng, label }, handleFeed);
}

/**
 * GET /home/categories
 * @returns {Promise<{categories: import('./types').RawCategory[]}>}
 */
export function fetchCategories() {
  return apiRequest('/home/categories', {}, handleCategories);
}

/**
 * GET /home/vendors/nearby?lat&lng&radius&category_id&sort&page&per_page
 *
 * @param {{
 *   lat:number|string, lng:number|string,
 *   radius?:number, category_id?:string,
 *   sort?:'distance'|'rating'|'prep_time',
 *   page?:number, per_page?:number
 * }} params
 * @returns {Promise<import('./types').RawNearbyVendors>}
 */
export function fetchNearbyVendors(params = {}) {
  return apiRequest('/home/vendors/nearby', params, handleNearbyVendors);
}

/**
 * GET /home/search?q={query}&lat={lat}&lng={lng}
 *
 * @param {{q:string, lat:number|string, lng:number|string}} params
 * @returns {Promise<import('./types').RawSearchResults>}
 */
export function searchHome(params = {}) {
  return apiRequest('/home/search', params, handleSearch);
}

/**
 * GET /vendors/{vendor_id}
 *
 * @param {string} vendorId
 * @returns {Promise<import('./types').RawVendorDetail>}
 */
export function fetchVendorStorefront(vendorId) {
  return apiRequest(
    `/vendors/${encodeURIComponent(vendorId)}`,
    {},
    (params) => handleVendorDetail(params, vendorId),
  );
}
