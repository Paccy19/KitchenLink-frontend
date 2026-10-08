/**
 * In-browser mock server for the Online Food Kitchen home API.
 *
 * Every handler returns the RAW contract shape documented in `api/types.js`
 * so the normalisation layer is exercised exactly like it would be against
 * the real backend. Data is derived from `data/mockData.js` plus realistic
 * Kigali coordinates so distance / radius / sorting behave properly.
 *
 * @module api/mock/mockServer
 */

import { VENDORS, CATEGORIES } from '../../data/mockData';

/** Kigali city centre — fallback location when GPS is denied. */
export const KIGALI_CENTER = { lat: -1.9441, lng: 30.0619 };

/** Approximate coordinates of each mock vendor's neighbourhood. */
const VENDOR_COORDS = {
  'vendor-1': { lat: -1.9597, lng: 30.0587 }, // Kimironko
  'vendor-2': { lat: -1.9477, lng: 30.061 }, // Kiyovu
  'vendor-3': { lat: -1.9547, lng: 30.0667 }, // Remera
  'vendor-4': { lat: -1.9553, lng: 30.0547 }, // Nyarutarama
  'vendor-5': { lat: -1.9517, lng: 30.0627 }, // Downtown
  'vendor-6': { lat: -1.9307, lng: 30.0657 }, // Gisozi
  'vendor-7': { lat: -1.9437, lng: 30.0747 }, // Kacyiru
  'vendor-8': { lat: -1.9687, lng: 30.0717 }, // Gikondo
};

/** The 10 categories required by the product spec. */
export const HOME_CATEGORIES = [
  { id: 'local', name: 'Local Food', icon_url: 'soup', description: 'Isombe, Ugali, Akabenz & other Rwandan classics' },
  { id: 'fast-food', name: 'Fast Food', icon_url: 'sandwich', description: 'Burgers, fries, wraps & quick bites' },
  { id: 'african', name: 'African Food', icon_url: 'flame', description: 'Pan-African stews, grills & spiced dishes' },
  { id: 'healthy', name: 'Healthy Food', icon_url: 'salad', description: 'Balanced bowls, meal-prep & light bites' },
  { id: 'bakery', name: 'Bakery', icon_url: 'croissant', description: 'Bread, pastries, cakes & snacks' },
  { id: 'breakfast', name: 'Breakfast', icon_url: 'coffee', description: 'Eggs, pancakes, tea & coffee' },
  { id: 'lunch', name: 'Lunch', icon_url: 'clock', description: 'Hearty midday meals & lunch combos' },
  { id: 'dinner', name: 'Dinner', icon_url: 'beef', description: 'Grills, family platters & evening meals' },
  { id: 'drinks', name: 'Drinks', icon_url: 'cup-soda', description: 'Fresh juices, smoothies & beverages' },
  { id: 'desserts', name: 'Desserts', icon_url: 'cake', description: 'Cakes, sweets & after-meal treats' },
];

export const SEARCH_SUGGESTIONS = ['Isombe', 'Pizza', 'Burger', 'Chicken', 'Brochettes', 'Juice'];

const R = 6371; // Earth radius (km)
const toRad = (deg) => (deg * Math.PI) / 180;

export function haversineKm(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const categoryIdsFor = (vendor) => {
  const tags = vendor.tags.map((tag) => tag.toLowerCase());
  return HOME_CATEGORIES.filter((category) =>
    tags.some((tag) => tag === category.name.toLowerCase()),
  ).map((category) => category.id);
};

const toVendorSummary = (vendor, lat, lng) => {
  const coords = VENDOR_COORDS[vendor.id] ?? KIGALI_CENTER;
  const distanceKm = Number(haversineKm(lat, lng, coords.lat, coords.lng).toFixed(1));

  return {
    id: vendor.id,
    name: vendor.name,
    vendor_type: vendor.type,
    rating: vendor.rating,
    reviews_count: vendor.reviewsCount,
    distance_km: distanceKm,
    estimated_prep_time: vendor.prepTime,
    delivery_available: vendor.isOpen,
    is_open: vendor.isOpen,
    banner_url: vendor.coverImage,
    avatar_url: vendor.avatarImage,
    neighborhood: vendor.location,
    description: vendor.tagline,
    delivery_fee: vendor.deliveryFee,
    minimum_order: vendor.minOrder,
    operating_hours: vendor.operatingHours,
    categories: vendor.tags,
    category_ids: categoryIdsFor(vendor),
    coordinates: coords,
  };
};

const toDish = (dish, vendor) => ({
  id: dish.id,
  name: dish.name,
  description: dish.description,
  price_rwf: dish.price,
  image_url: dish.image,
  category: dish.category,
  is_available: dish.isPreorder ? true : dish.name !== 'Sold Out',
  estimated_prep_time: dish.prepTime,
  options: dish.options ?? [],
  is_preorder: Boolean(dish.isPreorder),
  preorder_cutoff: dish.preorderCutoff ?? null,
  popular: Boolean(dish.popular),
  vendor: { id: vendor.id, name: vendor.name, vendor_type: vendor.type },
  rating: vendor.rating,
});

const readCoords = (params) => ({
  lat: Number.isFinite(Number(params.lat)) && params.lat !== '' ? Number(params.lat) : KIGALI_CENTER.lat,
  lng: Number.isFinite(Number(params.lng)) && params.lng !== '' ? Number(params.lng) : KIGALI_CENTER.lng,
});

/* ------------------------------------------------------------------ */
/* Handlers                                                            */
/* ------------------------------------------------------------------ */

export function handleCategories() {
  return {
    categories: HOME_CATEGORIES.map((category, index) => ({
      ...category,
      slug: category.id,
      vendor_count: VENDORS.filter((v) => categoryIdsFor(v).includes(category.id)).length,
      sort_order: index,
    })),
  };
}

export function handleFeed(params = {}) {
  const { lat, lng } = readCoords(params);

  const vendors = VENDORS.map((vendor) => toVendorSummary(vendor, lat, lng))
    .sort((a, b) => a.distance_km - b.distance_km);

  const popularDishes = VENDORS.flatMap((vendor) =>
    vendor.menu.filter((dish) => dish.popular).map((dish) => toDish(dish, vendor)),
  ).slice(0, 10);

  return {
    location: {
      lat,
      lng,
      label: params.label || 'Kigali, Rwanda',
    },
    categories: handleCategories().categories,
    featured_vendors: [...vendors].sort((a, b) => b.rating - a.rating).slice(0, 6),
    nearby_vendors: vendors,
    popular_dishes: popularDishes,
    updated_at: new Date().toISOString(),
  };
}

export function handleNearbyVendors(params = {}) {
  const { lat, lng } = readCoords(params);
  const radius = Number(params.radius) > 0 ? Number(params.radius) : 7;
  const categoryId = params.category_id ? String(params.category_id) : '';
  const sort = ['distance', 'rating', 'prep_time'].includes(params.sort)
    ? params.sort
    : 'distance';
  const page = Math.max(1, Number(params.page) || 1);
  const perPage = Math.max(1, Number(params.per_page) || 6);

  let vendors = VENDORS.map((vendor) => toVendorSummary(vendor, lat, lng));

  if (categoryId) {
    vendors = vendors.filter((vendor) => vendor.category_ids.includes(categoryId));
  }

  vendors = vendors.filter((vendor) => vendor.distance_km <= radius);

  if (sort === 'rating') {
    vendors.sort((a, b) => b.rating - a.rating || a.distance_km - b.distance_km);
  } else if (sort === 'prep_time') {
    const minutes = (value) => {
      const matches = String(value).match(/\d+/g);
      return matches ? Number(matches[matches.length - 1]) : 0;
    };
    vendors.sort((a, b) => minutes(a.estimated_prep_time) - minutes(b.estimated_prep_time));
  } else {
    vendors.sort((a, b) => a.distance_km - b.distance_km);
  }

  const total = vendors.length;
  const start = (page - 1) * perPage;
  const paged = vendors.slice(start, start + perPage);

  return {
    vendors: paged,
    meta: {
      page,
      per_page: perPage,
      total,
      has_more: start + paged.length < total,
      radius_km: radius,
      sort,
      category_id: categoryId || null,
    },
  };
}

export function handleSearch(params = {}) {
  const { lat, lng } = readCoords(params);
  const query = String(params.q ?? '').trim().toLowerCase();

  if (!query) return { query: '', dishes: [], vendors: [], counts: { dishes: 0, vendors: 0 } };

  const tokens = query.split(/\s+/).filter(Boolean);
  const matches = (text = '') => {
    const haystack = String(text).toLowerCase();
    return tokens.every((token) => haystack.includes(token));
  };

  const dishes = VENDORS.flatMap((vendor) =>
    vendor.menu
      .filter((dish) => matches(`${dish.name} ${dish.description} ${dish.category}`))
      .map((dish) => ({
        ...toDish(dish, vendor),
        matched_fields: [
          matches(dish.name) ? 'name' : null,
          matches(dish.description) ? 'description' : null,
          matches(dish.category) ? 'category' : null,
        ].filter(Boolean),
      })),
  ).slice(0, 20);

  const vendors = VENDORS.map((vendor) => toVendorSummary(vendor, lat, lng)).filter(
    (vendor) =>
      matches(`${vendor.name} ${vendor.vendor_type} ${vendor.neighborhood} ${vendor.description}`) ||
      VENDORS.find((v) => v.id === vendor.id)?.menu.some((dish) => matches(dish.name)),
  );

  return {
    query: params.q,
    dishes,
    vendors,
    counts: { dishes: dishes.length, vendors: vendors.length },
  };
}

export function handleVendorDetail(params = {}, vendorId) {
  const vendor = VENDORS.find((v) => v.id === vendorId);

  if (!vendor) {
    const error = new Error('Kitchen not found');
    error.status = 404;
    throw error;
  }

  return {
    ...toVendorSummary(vendor, KIGALI_CENTER.lat, KIGALI_CENTER.lng),
    description: vendor.description,
    owner_name: vendor.owner,
    address: vendor.address,
    accepts_preorder: vendor.acceptsPreorder,
    preorder_notice: vendor.specialPreorderNotice,
    menu_categories: [...new Set(vendor.menu.map((dish) => dish.category))],
    menu: vendor.menu.map((dish) => toDish(dish, vendor)),
  };
}

/** Exported for tests / debugging in the console. */
export const __mock = { VENDORS, CATEGORIES };
