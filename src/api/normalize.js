/**
 * Normalisation layer: raw backend payloads (snake_case, tolerant to minor
 * contract drift) → camelCase view-models used by the UI.
 *
 * @module api/normalize
 */

/** @param {any} value */
export const toNumber = (value, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const match = value.replace(',', '.').match(/-?\d+(\.\d+)?/);
    if (match) return Number(match[0]);
  }
  return fallback;
};

const toBool = (value, fallback = true) =>
  typeof value === 'boolean' ? value : fallback;

const toText = (...values) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return '';
};

/** Format a price the way the spec requires: `RWF 2,500`. */
export const formatRwf = (amount) =>
  `RWF ${toNumber(amount, 0).toLocaleString('en-US')}`;

/** "20–30 min" → 30 (upper bound), 25 → 25. Used for prep-time sorting. */
export const prepTimeMinutes = (value) => {
  if (typeof value === 'number') return value;
  const text = String(value ?? '');
  if (!text) return 0;
  const matches = [...text.matchAll(/\d+/g)].map((m) => Number(m[0]));
  if (!matches.length) return 0;
  return matches[matches.length - 1];
};

const formatPrepTime = (value) => {
  if (typeof value === 'number') return `${value} min`;
  const text = toText(value);
  if (!text) return '—';
  return /\d/.test(text) && !/min|hour|h\b/i.test(text) ? `${text} min` : text;
};

/**
 * @param {import('./types').RawCategory} raw
 * @returns {{id:string, name:string, slug:string, iconUrl:string, description:string, vendorCount:number}}
 */
export function normalizeCategory(raw = {}) {
  const name = toText(raw.name, raw.title, raw.label, 'Category');
  return {
    id: toText(raw.id, raw.slug, name.toLowerCase()),
    name,
    slug: toText(raw.slug, raw.id, name.toLowerCase()),
    iconUrl: toText(raw.icon_url, raw.icon, raw.image_url, raw.emoji),
    description: toText(raw.description),
    vendorCount: toNumber(raw.vendor_count ?? raw.count, 0),
  };
}

/**
 * @param {import('./types').RawVendorSummary} raw
 * @returns {Object} Vendor view-model
 */
export function normalizeVendor(raw = {}) {
  const name = toText(raw.name, raw.vendor_name, raw.title, 'Kitchen');
  const prepRaw = raw.estimated_prep_time ?? raw.prep_time ?? raw.preparation_time ?? raw.prepTime;
  return {
    id: toText(raw.id, raw.vendor_id, raw.slug),
    name,
    type: toText(raw.vendor_type, raw.type, raw.kitchen_type, 'Food Vendor'),
    rating: Number(toNumber(raw.rating ?? raw.average_rating, 0).toFixed(2)),
    reviewsCount: toNumber(raw.reviews_count ?? raw.reviewsCount ?? raw.rating_count, 0),
    distanceKm: Number(toNumber(raw.distance_km ?? raw.distance, 0).toFixed(1)),
    prepTime: formatPrepTime(prepRaw),
    prepTimeMinutes: prepTimeMinutes(prepRaw),
    deliveryAvailable: toBool(raw.delivery_available ?? raw.delivery, true),
    isOpen: toBool(raw.is_open ?? raw.open ?? raw.is_open_now, true),
    bannerUrl: toText(
      raw.banner_image_url, raw.banner_url, raw.cover_image, raw.coverImage, raw.image_url, raw.banner,
    ),
    avatarUrl: toText(raw.avatar_url, raw.logo_url, raw.avatarImage, raw.avatar),
    neighborhood: toText(
      raw.neighborhood,
      raw.location?.neighborhood,
      typeof raw.location === 'string' ? raw.location : '',
      raw.area,
      raw.address,
      'Kigali',
    ),
    description: toText(raw.description, raw.tagline, raw.summary),
    deliveryFee: toNumber(raw.delivery_fee ?? raw.deliveryFee, 0),
    minimumOrder: toNumber(raw.minimum_order ?? raw.minOrder, 0),
    operatingHours: toText(raw.operating_hours, raw.operatingHours, ''),
    tags: Array.isArray(raw.categories)
      ? raw.categories.map((c) => (typeof c === 'string' ? c : c?.name)).filter(Boolean)
      : Array.isArray(raw.tags) ? raw.tags : [],
    coordinates: raw.coordinates
      ? { lat: toNumber(raw.coordinates.lat), lng: toNumber(raw.coordinates.lng) }
      : raw.location && (raw.location.latitude != null || raw.location.longitude != null)
        ? { lat: toNumber(raw.location.latitude), lng: toNumber(raw.location.longitude) }
      : null,
  };
}

/**
 * @param {import('./types').RawDish} raw
 * @param {Object} [vendorRef] Optional fallback vendor reference
 * @returns {Object} Dish view-model
 */
export function normalizeDish(raw = {}, vendorRef = null) {
  const rawVendor = raw.vendor ?? vendorRef;
  const vendor =
    rawVendor && typeof rawVendor === 'object'
      ? {
          id: toText(rawVendor.id, rawVendor.vendor_id),
          name: toText(rawVendor.name, rawVendor.vendor_name),
          type: toText(rawVendor.vendor_type, rawVendor.type, 'Food Vendor'),
        }
      : {
          id: toText(
            typeof rawVendor === 'string' ? rawVendor : vendorRef?.id,
            raw.vendor_id,
          ),
          name: toText(typeof rawVendor === 'string' ? '' : vendorRef?.name, raw.vendor_name),
          type: toText(vendorRef?.type, raw.vendor_type, 'Food Vendor'),
        };

  return {
    id: toText(raw.id, raw.dish_id, raw.item_id),
    name: toText(raw.name, raw.title, 'Dish'),
    description: toText(raw.description, raw.summary),
    price: toNumber(raw.price_rwf ?? raw.price ?? raw.amount, 0),
    image: toText(raw.image_url, raw.image, raw.photo_url, raw.photo),
    category: toText(raw.category, raw.category_name, raw.menu_category, raw.section, 'Menu'),
    isAvailable: toBool(raw.is_available ?? raw.available, true),
    prepTime: formatPrepTime(raw.estimated_prep_time ?? raw.prep_time ?? raw.prepTime),
    isPreorder: toBool(raw.is_preorder ?? raw.isPreorder, false),
    preorderCutoff: toText(raw.preorder_cutoff ?? raw.preorderCutoff),
    popular: toBool(raw.popular ?? raw.is_popular, false),
    options: Array.isArray(raw.options)
      ? raw.options.map((option) => ({
          name: toText(option?.name, option?.label, 'Option'),
          choices: Array.isArray(option?.choices)
            ? option.choices
            : Array.isArray(option?.items) ? option.items : [],
        }))
      : [],
    vendor,
    rating: Number(toNumber(raw.rating, 0).toFixed(2)),
    matchedFields: Array.isArray(raw.matched_fields) ? raw.matched_fields : [],
  };
}

/**
 * @param {import('./types').RawVendorDetail} raw
 * @returns {Object} Vendor detail view-model (with menu)
 */
export function normalizeVendorDetail(raw = {}) {
  const vendor = normalizeVendor(raw);
  const menuGroups = Array.isArray(raw.menu) ? raw.menu : [];
  const rawMenu = menuGroups.flatMap((group) =>
    Array.isArray(group?.items)
      ? group.items.map((item) => ({ ...item, category: item.category ?? group.category }))
      : [group],
  );
  const menu = (rawMenu.length ? rawMenu : (raw.items ?? [])).map((dish) =>
    normalizeDish(dish, vendor),
  );

  const categories = Array.isArray(raw.menu_categories) && raw.menu_categories.length
    ? raw.menu_categories
    : [...new Set(menu.map((dish) => dish.category))];

  return {
    ...vendor,
    menu,
    menuCategories: categories,
    tags: vendor.tags.length ? vendor.tags : categories,
  };
}

/** Convert an order returned by the customer API into the order-page shape. */
export function normalizeOrder(raw = {}) {
  const vendor = raw.vendor ?? {};
  const payment = raw.payment ?? {};
  const deliveryLocation = raw.delivery_location ?? {};
  const paymentMethod = raw.payment_method_label ?? payment.method_label ?? raw.payment_method ?? '';

  return {
    id: toText(raw.id, raw.order_id),
    orderNumber: toText(raw.order_number),
    createdAt: toText(raw.created_at, raw.placed_at),
    vendorId: toText(vendor.id),
    vendorName: toText(vendor.name, 'Kitchen'),
    vendorType: toText(vendor.vendor_type, 'Food Vendor'),
    vendorLocation: toText(deliveryLocation.neighborhood, vendor.neighborhood),
    status: toText(raw.status, 'placed'),
    items: (Array.isArray(raw.items) ? raw.items : []).map((item) => ({
      id: toText(item.menu_item_id, item.id),
      dishId: toText(item.menu_item_id, item.id),
      name: toText(item.name, 'Dish'),
      price: toNumber(item.price_rwf ?? item.price),
      quantity: toNumber(item.quantity, 1),
      image: toText(item.image_url, item.image),
      selectedOptions: {},
    })),
    pricing: {
      subtotal: toNumber(raw.subtotal_rwf),
      deliveryFee: toNumber(raw.delivery_fee_rwf),
      total: toNumber(raw.total_rwf),
    },
    payment: {
      method: toText(payment.method_label, paymentMethod, 'Payment'),
      methodCode: toText(payment.method, raw.payment_method),
      status: toText(raw.payment_status, payment.status, 'pending'),
      reference: toText(payment.reference),
    },
    deliveryAddress: {
      title: 'Delivery location',
      street: toText(deliveryLocation.address),
      district: toText(deliveryLocation.neighborhood),
      instructions: toText(deliveryLocation.note),
    },
    driver: raw.rider?.name ? { name: raw.rider.name, phone: raw.rider.phone } : null,
    estimatedDeliveryTime: raw.estimated_delivery_at
      ? new Date(raw.estimated_delivery_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : raw.eta_minutes != null ? `${raw.eta_minutes} minutes` : 'Pending',
    rated: false,
    cancelReason: toText(raw.cancel_reason),
  };
}

/** Pull the vendor array out of loosely-shaped list payloads. */
export function pickList(payload, ...keys) {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
}
