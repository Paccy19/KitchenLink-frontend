/**
 * Backend JSON contracts for the Online Food Kitchen "home" API group.
 *
 * Every typedef below describes the RAW payload returned by the backend
 * (snake_case). The `normalize.js` layer converts these into the camelCase
 * view-models consumed by React components.
 *
 * Base URL: VITE_API_BASE_URL (default `/api/v1`)
 *
 * @module api/types
 */

/**
 * GET /home/categories
 * @typedef {Object} RawCategory
 * @property {string|number} id
 * @property {string} name
 * @property {string} [slug]
 * @property {string} [icon_url]  Absolute URL or an emoji/short glyph
 * @property {string} [description]
 * @property {number} [vendor_count]
 */

/**
 * Shared summary shape returned for vendors in feed / nearby / search.
 * @typedef {Object} RawVendorSummary
 * @property {string|number} id
 * @property {string} name
 * @property {string} [vendor_type]
 * @property {number} [rating]
 * @property {number} [reviews_count]
 * @property {number|string} [distance_km]  e.g. 1.2 or "1.2 km"
 * @property {number|string} [estimated_prep_time]  e.g. 25 or "20–30 min"
 * @property {boolean} [delivery_available]
 * @property {boolean} [is_open]
 * @property {string} [banner_image_url]
 * @property {string} [banner_url]
 * @property {string} [avatar_url]
 * @property {string} [neighborhood]
 * @property {string} [description]
 * @property {string[]} [categories]
 * @property {number} [delivery_fee]
 * @property {number} [reviewsCount]
 * @property {string} [cover_image]
 * @property {string} [type]
 * @property {string} [prep_time]
 * @property {number} [prepTimeMinutes]
 */

/**
 * Shared shape for a single dish / menu item.
 * @typedef {Object} RawDish
 * @property {string|number} id
 * @property {string} name
 * @property {string} [description]
 * @property {number|string} [price_rwf]
 * @property {string} [image_url]
 * @property {string} [category]
 * @property {string} [category_name]
 * @property {boolean} [is_available]
 * @property {number|string} [estimated_prep_time]
 * @property {RawDishOption[]} [options]
 * @property {Object|RawVendorSummary|string} [vendor]  Vendor ref (summary, id or name)
 * @property {string|number} [vendor_id]
 * @property {string} [vendor_name]
 * @property {number} [price]
 * @property {string} [image]
 * @property {boolean} [is_preorder]
 * @property {string} [preorder_cutoff]
 * @property {boolean} [popular]
 */

/**
 * @typedef {Object} RawDishOption
 * @property {string} name
 * @property {string[]} choices
 */

/**
 * GET /home/feed?lat={lat}&lng={lng}
 * @typedef {Object} RawHomeFeed
 * @property {{lat:number, lng:number, label?:string}} [location]
 * @property {RawCategory[]} [categories]
 * @property {RawVendorSummary[]} [featured_vendors]
 * @property {RawVendorSummary[]} [nearby_vendors]
 * @property {RawDish[]} [popular_dishes]
 * @property {string} [updated_at]
 */

/**
 * GET /home/vendors/nearby?lat&lng&radius&category_id&sort&page&limit
 * @typedef {Object} RawNearbyVendors
 * @property {RawVendorSummary[]} [vendors]
 * @property {{limit:number, page:number, offset:number, total:number, radius_km:number}} [meta]
 */

/**
 * GET /home/search?q={query}&lat={lat}&lng={lng}
 * @typedef {Object} RawSearchResults
 * @property {string} [query]
 * @property {RawDish[]} [dishes]
 * @property {RawVendorSummary[]} [vendors]
 * @property {{dishes:number, vendors:number}} [counts]
 */

/**
 * GET /vendors/{vendor_id}
 * @typedef {Object} RawVendorDetail
 * @property {string|number} id
 * @property {string} name
 * @property {string} [vendor_type]
 * @property {number} [rating]
 * @property {number} [reviews_count]
 * @property {number|string} [estimated_prep_time]
 * @property {boolean} [delivery_available]
 * @property {string} [banner_image_url]
 * @property {string} [banner_url]
 * @property {string} [avatar_url]
 * @property {string} [neighborhood]
 * @property {string} [description]
 * @property {string} [operating_hours]
 * @property {number} [delivery_fee]
 * @property {number} [minimum_order]
 * @property {{category:string, items:RawDish[]}[]} [menu]
 * @property {string[]} [menu_categories]
 * @property {RawDish[]} [items]
 * @property {{neighborhood?:string,address?:string,latitude?:number,longitude?:number}} [location]
 */

export {};
