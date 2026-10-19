/**
 * Vendor Dashboard API service.
 *
 * Talks to the backend `/vendor/*` endpoints with a separate vendor token
 * (`ofk_vendor_token`) so the customer session is never overwritten.
 * Normalisers convert the backend snake_case contract into the camelCase
 * view-models the dashboard components already consume.
 *
 * @module api/vendorApi
 */

import { ApiError, buildUrl } from './client';
import { notifyDataChanged } from './liveUpdates';

export const VENDOR_TOKEN_KEY = 'ofk_vendor_token';
export const VENDOR_PROFILE_KEY = 'ofk_vendor_profile_v2';

export const getVendorToken = () => localStorage.getItem(VENDOR_TOKEN_KEY) || '';
export const setVendorToken = (token) => {
  if (token) localStorage.setItem(VENDOR_TOKEN_KEY, token);
};
export const clearVendorToken = () => localStorage.removeItem(VENDOR_TOKEN_KEY);

async function vendorRequest(path, { method = 'GET', body, form } = {}) {
  const url = buildUrl(path);
  const headers = { Accept: 'application/json' };
  const token = getVendorToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (form) {
    payload = form;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(url, { method, headers, body: payload });
  } catch (error) {
    throw new ApiError('Cannot reach the Online Food Kitchen API.', {
      path,
      cause: error,
    });
  }

  if (response.status === 401) {
    clearVendorToken();
    window.dispatchEvent(new Event('ofk:vendor-unauthorized'));
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      data?.error?.message || data?.message || `Request failed (${response.status}).`,
      { status: response.status, path },
    );
  }
  notifyDataChanged(method, path);
  return data;
}

/* ------------------------------ normalisers ------------------------------ */

const titleCase = (value) => {
  const text = String(value ?? '').trim();
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const statusToTitle = {
  new: 'New',
  accepted: 'Accepted',
  preparing: 'Preparing',
  ready: 'Ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const titleToStatus = {
  New: 'new',
  Accepted: 'accepted',
  Preparing: 'preparing',
  Ready: 'ready',
  Completed: 'completed',
  Cancelled: 'cancelled',
};

const PAYMENT_METHOD_LABELS = {
  mobile_money: 'Mobile Money',
  momo: 'Mobile Money',
  card: 'Cards',
  ekash: 'eKash',
  wallet: 'Wallet',
};

const paymentStatusLabel = (value) => {
  const code = String(value ?? '').toLowerCase();
  if (code === 'paid' || code === 'successful') return 'Paid';
  if (code === 'refunded') return 'Refunded';
  if (code === 'failed') return 'Failed';
  return 'Pending';
};

const formatPrepTime = (minutes) => {
  const value = Number(minutes);
  return Number.isFinite(value) && value > 0 ? `${value} min` : '';
};

const prepTimeToMinutes = (value) => {
  const matches = String(value ?? '').match(/\d+/g);
  if (!matches) return 0;
  return Number(matches[matches.length - 1]);
};

export function mapVendorAccount(raw = {}) {
  return {
    id: raw.id,
    name: raw.name || 'Your Kitchen',
    type: raw.vendor_type || 'Food Vendor',
    ownerName: raw.owner_name || '',
    phone: raw.phone || '',
    email: raw.email || '',
    location: raw.location?.neighborhood || raw.location?.address || 'Kigali',
    address: raw.location?.address || '',
    description: raw.description || '',
    avatar: raw.profile_image_url || raw.banner_image_url || '',
    cover: raw.banner_image_url || '',
    rating: Number(raw.rating ?? 0),
    reviewsCount: 0,
    isOpen: raw.is_open !== false,
    // Open AND location shared recently: what customers actually see.
    isLive: raw.is_live ?? raw.is_open !== false,
    liveLocation: {
      lat: raw.location?.latitude ?? null,
      lng: raw.location?.longitude ?? null,
      updatedAt: raw.location?.updated_at ?? null,
      accuracyM: raw.location?.accuracy_m ?? null,
    },
    operatingHours: (raw.operating_hours || [])
      .filter((entry) => !entry.is_closed)
      .map((entry) => `${titleCase(entry.day)} ${entry.open_time}-${entry.close_time}`)
      .join(', '),
    operatingHoursRaw: raw.operating_hours || [],
    deliveryFee: 0,
    minimumOrder: 0,
    foodCategories: raw.food_categories || [],
    foodCategoryIds: raw.food_category_ids || [],
    verificationStatus: titleCase(raw.verification_status || 'pending'),
    paymentInformation: raw.payment_information || {},
    commissionRate: Number(raw.commission_percent ?? 0) / 100,
    joinedAt: raw.created_at || null,
    availableBalance: Number(raw.available_balance_rwf ?? 0),
    totalSales: Number(raw.total_sales_rwf ?? 0),
  };
}

export function mapMenuItem(raw = {}) {
  const optionsByGroup = new Map();
  for (const option of raw.options || []) {
    const group = option.group_name || 'Options';
    if (!optionsByGroup.has(group)) optionsByGroup.set(group, []);
    const extra = Number(option.additional_price_rwf ?? 0);
    optionsByGroup
      .get(group)
      .push(extra > 0 ? `${option.name} +${extra.toLocaleString()} RWF` : option.name);
  }

  return {
    id: raw.id,
    name: raw.name,
    category: raw.category?.name || 'Menu',
    categoryId: raw.category?.id || null,
    price: Number(raw.price_rwf ?? 0),
    prepTime: formatPrepTime(raw.preparation_time_minutes),
    description: raw.description || '',
    image: raw.image_url || '',
    isAvailable: raw.is_available !== false,
    isPreorder: Boolean(raw.is_preorder),
    preorderCutoff: raw.preorder_cutoff || '',
    popular: Boolean(raw.is_popular),
    options: [...optionsByGroup.entries()].map(([name, choices]) => ({ name, choices })),
  };
}

export function mapOrder(raw = {}) {
  const status = statusToTitle[raw.status] || titleCase(raw.status);
  const delivery = raw.delivery_location || {};
  return {
    id: raw.order_number || raw.id,
    backendId: raw.id,
    orderNumber: raw.order_number || '',
    status,
    createdAt: raw.created_at,
    customer: {
      name: raw.customer?.name || 'Customer',
      phone: raw.customer?.phone_number || '',
      address: delivery.address || delivery.neighborhood || '',
      note: delivery.note || '',
    },
    items: (raw.items || []).map((item) => ({
      name: item.name,
      price: Number(item.price_rwf ?? 0),
      quantity: Number(item.quantity ?? 1),
      options: (item.options || []).map((option) => option.name).join(', '),
    })),
    subtotal: Number(raw.subtotal_rwf ?? 0),
    deliveryFee: Number(raw.delivery_fee_rwf ?? 0),
    total: Number(raw.total_amount_rwf ?? raw.total_rwf ?? 0),
    commissionPercent: Number(raw.commission_percent ?? 0),
    commission: Number(raw.commission_rwf ?? 0),
    payout: Number(raw.vendor_payout_rwf ?? 0),
    riderPayout: Number(raw.rider_payout_rwf ?? 0),
    settlementStatus: raw.settlement_status || 'unpaid',
    orderType: raw.order_type_label || titleCase(raw.order_type) || 'Immediate',
    orderTypeCode: raw.order_type || 'immediate',
    scheduledFor: raw.scheduled_for || null,
    specialText: raw.special_text || '',
    paymentStatus: paymentStatusLabel(raw.payment_status),
    paymentMethod:
      PAYMENT_METHOD_LABELS[raw.payment_method] || raw.payment_method || 'Payment',
    notes: raw.cancel_reason || delivery.note || '',
    eta: raw.eta_minutes ? `${raw.eta_minutes} min` : '—',
    allowedNextStatuses: (raw.allowed_next_statuses || []).map(
      (value) => statusToTitle[value] || value,
    ),
  };
}

export function mapSpecial(raw = {}) {
  if (!raw || (!raw.text && !raw.delivery_at)) return null;
  return {
    text: raw.text || '',
    cutoffAt: raw.cutoff_at || '',
    deliveryAt: raw.delivery_at || '',
    isActive: Boolean(raw.is_active),
    isOrderable: Boolean(raw.is_orderable),
  };
}

export function mapStats(raw = {}) {
  const commissionRate = Number(raw.commission_percent ?? 0) / 100;
  return {
    todayOrdersCount: Number(raw.today_orders ?? 0),
    pendingOrders: Number(raw.new_orders ?? raw.pending_orders ?? 0),
    preparingOrders: Number(raw.preparing_orders ?? 0),
    readyOrders: Number(raw.ready_orders ?? 0),
    completedOrders: Number(raw.completed_orders_total ?? raw.completed_orders ?? 0),
    cancelledOrders: Number(raw.cancelled_orders ?? 0),
    todaySales: Number(raw.today_sales_rwf ?? 0),
    totalSales: Number(raw.total_sales_rwf ?? 0),
    commission: Math.round(Number(raw.total_sales_rwf ?? 0) * commissionRate),
    netEarned: Number(raw.net_earned_rwf ?? 0),
    availableBalance: Number(raw.available_balance_rwf ?? 0),
    pendingBalance: Number(raw.pending_balance_rwf ?? 0),
    withdrawn: Number(raw.withdrawn_rwf ?? 0),
    commissionRate,
  };
}

export function mapWallet(raw = {}) {
  return {
    withdrawn: Number(raw.withdrawn_rwf ?? 0),
    baseSales: Math.max(0, Number(raw.total_sales_rwf ?? 0) - Number(raw.withdrawn_rwf ?? 0)),
    withdrawalHistory: (raw.withdrawals || []).map((entry) => ({
      id: entry.id,
      reference: entry.reference || entry.id,
      amount: Number(entry.amount_rwf ?? 0),
      method: entry.method_label || entry.method,
      date: entry.created_at,
      status: titleCase(entry.status),
    })),
  };
}

/* -------------------------------- endpoints ------------------------------- */

export const vendorApi = {
  sendLoginOtp: (phone) =>
    vendorRequest('/vendor/auth/send-otp', { method: 'POST', body: { phone } }),
  verifyLoginOtp: (phone, code) =>
    vendorRequest('/vendor/auth/verify-otp', {
      method: 'POST',
      body: { phone, code },
    }),
  register: (formData) =>
    vendorRequest('/vendor/auth/register', { method: 'POST', form: formData }),
  me: () => vendorRequest('/vendor/auth/me'),

  dashboard: () => vendorRequest('/vendor/dashboard'),
  notifications: ({ limit = 50, unread = false } = {}) =>
    vendorRequest(`/vendor/notifications?limit=${limit}${unread ? '&unread=true' : ''}`),
  markNotificationRead: (id) =>
    vendorRequest(`/vendor/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' }),
  markAllNotificationsRead: () => vendorRequest('/vendor/notifications/read-all', { method: 'POST' }),
  support: {
    list: () => vendorRequest('/vendor/support'),
    unreadCount: () => vendorRequest('/vendor/support/unread-count'),
    create: (payload) => vendorRequest('/vendor/support', { method: 'POST', body: payload }),
    get: (id) => vendorRequest(`/vendor/support/${encodeURIComponent(id)}`),
    reply: (id, message) =>
      vendorRequest(`/vendor/support/${encodeURIComponent(id)}/messages`, { method: 'POST', body: { message } }),
  },
  updateProfile: (payload) =>
    vendorRequest('/vendor/profile', { method: 'PATCH', body: payload }),
  // Open (with live GPS position) / close the store, or refresh the position.
  setAvailability: (payload) =>
    vendorRequest('/vendor/availability', { method: 'PATCH', body: payload }),

  special: async () => mapSpecial((await vendorRequest('/vendor/special'))?.special),
  saveSpecial: async (payload) =>
    mapSpecial((await vendorRequest('/vendor/special', { method: 'PUT', body: payload }))?.special),
  clearSpecial: async () =>
    mapSpecial((await vendorRequest('/vendor/special', { method: 'DELETE' }))?.special),

  // Public discovery categories (no auth) so it works during registration too.
  menuCategories: () => vendorRequest('/home/categories'),
  listMenu: (params = {}) =>
    vendorRequest(`/vendor/menu?limit=${params.limit ?? 100}`),
  createMenuItem: (payload) =>
    vendorRequest('/vendor/menu', { method: 'POST', form: toMenuItemForm(payload) }),
  updateMenuItem: (id, payload) =>
    vendorRequest(`/vendor/menu/${encodeURIComponent(id)}`, {
      method: 'PUT',
      form: toMenuItemForm(payload),
    }),
  deleteMenuItem: (id, hard = true) =>
    vendorRequest(`/vendor/menu/${encodeURIComponent(id)}?hard=${hard}`, {
      method: 'DELETE',
    }),
  setMenuAvailability: (id, isAvailable) =>
    vendorRequest(`/vendor/menu/${encodeURIComponent(id)}/availability`, {
      method: 'PATCH',
      body: { is_available: isAvailable },
    }),

  listOrders: (params = {}) =>
    vendorRequest(`/vendor/orders?limit=${params.limit ?? 50}`),
  updateOrderStatus: (orderId, status) =>
    vendorRequest(`/vendor/orders/${encodeURIComponent(orderId)}/status`, {
      method: 'PATCH',
      body: { status },
    }),

  wallet: () => vendorRequest('/vendor/wallet'),
  requestWithdrawal: (payload) =>
    vendorRequest('/vendor/wallet/withdrawals', { method: 'POST', body: payload }),
};

/* --------------------------- menu payload helpers ------------------------- */

/** Convert a `data:image/...;base64,...` string into a File for multipart upload. */
function dataUriToBlob(dataUri) {
  const [header, base64] = dataUri.split(',');
  const mime = header.match(/data:(.*?);/)?.[1] || 'application/octet-stream';
  const extension = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  }[mime] || 'png';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], `dish-image.${extension}`, { type: mime });
}

/**
 * Send menu create/update as multipart/form-data so the image travels as a
 * real file part (Multer, 5 MB limit) instead of base64 inside a JSON body
 * (which is capped at 1 MB and broke any image larger than ~750 KB).
 */
export function toMenuItemForm(payload = {}) {
  const form = new FormData();
  const {
    image_base64: imageBase64,
    image_url: imageUrl,
    image_clear: imageClear,
    options,
    category_id: categoryId,
    ...fields
  } = payload;

  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue;
    form.append(key, String(value));
  }

  if (categoryId !== undefined && categoryId !== null) {
    form.append('category_id', String(categoryId));
  }
  form.append('options', JSON.stringify(options || []));

  if (imageBase64) {
    form.append('image', dataUriToBlob(imageBase64));
  } else if (imageUrl) {
    form.append('image_url', imageUrl);
  }
  if (imageClear) form.append('image_clear', 'true');

  return form;
}

/** Convert the dashboard form model into the backend menu payload. */
export function buildMenuItemPayload(data = {}, categoriesByName = {}) {
  const payload = {
    name: data.name,
    price_rwf: Number(data.price),
    preparation_time_minutes: prepTimeToMinutes(data.prepTime),
    description: data.description || '',
    is_available: data.isAvailable !== false,
    is_preorder: Boolean(data.isPreorder),
    preorder_cutoff: data.isPreorder ? data.preorderCutoff || '' : '',
    is_popular: Boolean(data.popular),
  };

  const categoryId = data.categoryId || categoriesByName[data.category];
  payload.category_id = categoryId || null;

  if (typeof data.image === 'string' && data.image.startsWith('data:')) {
    payload.image_base64 = data.image;
  } else if (data.image) {
    payload.image_url = data.image;
  } else if (data.clearImage) {
    // Editing an item that had an image and the vendor removed it.
    payload.image_clear = true;
  }

  payload.options = (data.options || []).flatMap((group) => {
    const groupName = String(group.name || 'Options').trim();
    return (group.choices || []).map((choice) => {
      const text = String(choice).trim();
      const match = text.match(/^(.*?)(?:\s*\+\s*([\d,]+)\s*RWF)?$/i);
      return {
        group_name: groupName || 'Options',
        name: (match?.[1] || text).trim() || groupName,
        additional_price_rwf: match?.[2] ? Number(match[2].replace(/,/g, '')) : 0,
      };
    });
  });

  return payload;
}

export { titleToStatus, statusToTitle, paymentStatusLabel };
