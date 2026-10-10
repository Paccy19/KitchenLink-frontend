/**
 * Driver Web App API service.
 *
 * Talks to the backend `/driver/*` endpoints with a separate driver token
 * (`ofk_driver_token`) so neither the customer nor vendor session is touched.
 * Normalisers convert the backend snake_case contract into camelCase
 * view-models the driver components consume.
 *
 * @module api/driverApi
 */

import { ApiError, buildUrl } from './client';

export const DRIVER_TOKEN_KEY = 'ofk_driver_token';

export const getDriverToken = () => localStorage.getItem(DRIVER_TOKEN_KEY) || '';
export const setDriverToken = (token) => {
  if (token) localStorage.setItem(DRIVER_TOKEN_KEY, token);
};
export const clearDriverToken = () => localStorage.removeItem(DRIVER_TOKEN_KEY);

async function driverRequest(path, { method = 'GET', body, form, params } = {}) {
  const url = buildUrl(path) + buildQuery(params);
  const headers = { Accept: 'application/json' };
  const token = getDriverToken();
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
    clearDriverToken();
    window.dispatchEvent(new Event('ofk:driver-unauthorized'));
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      data?.error?.message || data?.message || `Request failed (${response.status}).`,
      { status: response.status, path },
    );
  }
  return data;
}

/** Builds a URL-encoded query string from defined params. */
function buildQuery(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.append(key, value);
    }
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/* ------------------------------ normalisers ------------------------------ */

const titleCase = (value) => {
  const text = String(value ?? '').trim();
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const STATUS_TITLES = {
  pending: 'Pending pickup',
  accepted: 'Accepted',
  preparing: 'Preparing',
  ready_for_pickup: 'Ready for pickup',
  assigned_to_driver: 'Assigned to you',
  picked_up: 'Picked up',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
};

export const deliveryStatusLabel = (status) => STATUS_TITLES[status] || titleCase(status);

export function mapDriverAccount(raw = {}) {
  return {
    id: raw.id,
    name: raw.name || '',
    phone: raw.phone || '',
    email: raw.email || '',
    avatar: raw.profile_image_url || '',
    vehicleType: raw.vehicle_type || 'motorcycle',
    plateNumber: raw.plate_number || '',
    rating: Number(raw.rating ?? 5),
    isOnline: Boolean(raw.is_online),
    isAvailable: Boolean(raw.is_available),
    status: raw.status || 'offline',
    activeDeliveries: Number(raw.active_deliveries_count ?? 0),
    maxActiveDeliveries: Number(raw.max_active_deliveries ?? 3),
    completedDeliveries: Number(raw.completed_deliveries ?? 0),
    totalEarnings: Number(raw.total_earnings_rwf ?? 0),
    verificationStatus: titleCase(raw.verification_status || 'approved'),
    currentLocation: {
      latitude: raw.current_location?.latitude ?? null,
      longitude: raw.current_location?.longitude ?? null,
      updatedAt: raw.current_location?.updated_at ?? null,
    },
    createdAt: raw.created_at,
  };
}

function mapLocationPoint(raw = {}) {
  return {
    address: raw.address || '',
    neighborhood: raw.neighborhood || '',
    note: raw.note || '',
    latitude: raw.latitude ?? null,
    longitude: raw.longitude ?? null,
  };
}

export function mapDelivery(raw = {}) {
  return {
    id: raw.id,
    orderId: raw.order_id,
    orderNumber: raw.order_number || raw.id,
    status: raw.status,
    statusLabel: raw.status_label || raw.status,
    allowedNextStatuses: raw.allowed_next_statuses || [],
    vendor: {
      id: raw.vendor?.id,
      name: raw.vendor?.name || 'Vendor',
      phone: raw.vendor?.phone || '',
      address: raw.vendor?.address || '',
      neighborhood: raw.vendor?.neighborhood || '',
      latitude: raw.vendor?.latitude ?? null,
      longitude: raw.vendor?.longitude ?? null,
    },
    customer: {
      id: raw.customer?.id,
      name: raw.customer?.name || 'Customer',
      phone: raw.customer?.phone_number || '',
    },
    pickup: mapLocationPoint(raw.pickup_location),
    dropoff: mapLocationPoint(raw.delivery_location),
    routeDistanceKm: Number(raw.route_distance_km ?? 0),
    distanceFromDriverKm: raw.distance_from_driver_km ?? null,
    deliveryFee: Number(raw.delivery_fee_rwf ?? 0),
    promisedEarnings: Number(raw.promised_earnings_rwf ?? 0),
    paymentMethod: raw.payment_method || '',
    otpRequired: Boolean(raw.otp_required),
    otpCode: raw.dev_otp || '',
    proofPhotoUrl: raw.proof_photo_url || '',
    assignedAt: raw.assigned_at ?? null,
    pickedUpAt: raw.picked_up_at ?? null,
    outForDeliveryAt: raw.out_for_delivery_at ?? null,
    deliveredAt: raw.delivered_at ?? null,
    completedAt: raw.completed_at ?? null,
    createdAt: raw.created_at,
    items: (raw.items || []).map((item) => ({
      name: item.name,
      quantity: Number(item.quantity ?? 1),
      price: Number(item.price_rwf ?? 0),
      options: (item.options || []).map((option) => option.name).join(', '),
    })),
    statusHistory: (raw.status_history || []).map((entry) => ({
      status: entry.status,
      label: entry.label,
      at: entry.at,
      note: entry.note || '',
    })),
  };
}

export function mapDriverStats(raw = {}) {
  return {
    activeDeliveries: Number(raw.active_deliveries ?? 0),
    completedToday: Number(raw.completed_today ?? 0),
    earningsToday: Number(raw.earnings_today_rwf ?? 0),
    completedTotal: Number(raw.completed_total ?? 0),
    earningsTotal: Number(raw.earnings_total_rwf ?? 0),
    rating: Number(raw.rating ?? 5),
    isOnline: Boolean(raw.is_online),
    status: raw.status || 'offline',
  };
}

export function mapDriverEarnings(raw = {}) {
  return {
    todayRwf: Number(raw.today_rwf ?? 0),
    todayDeliveries: Number(raw.today_deliveries ?? 0),
    totalRwf: Number(raw.total_rwf ?? 0),
    totalDeliveries: Number(raw.total_deliveries ?? 0),
    sharePercent: Number(raw.share_percent ?? 80),
    rating: Number(raw.rating ?? 5),
    deliveries: (raw.deliveries || []).map(mapDelivery),
    meta: raw.meta || {},
  };
}

/* -------------------------------- endpoints ------------------------------- */

export const driverApi = {
  sendLoginOtp: (phone) =>
    driverRequest('/driver/auth/send-otp', { method: 'POST', body: { phone } }),
  verifyLoginOtp: (phone, code) =>
    driverRequest('/driver/auth/verify-otp', { method: 'POST', body: { phone, code } }),
  register: (payload) =>
    driverRequest('/driver/auth/register', { method: 'POST', body: payload }),
  me: () => driverRequest('/driver/auth/me'),
  updateProfile: (payload) =>
    driverRequest('/driver/profile', { method: 'PATCH', body: payload }),

  stats: () => driverRequest('/driver/stats'),
  available: ({ lat, lng, radius } = {}) =>
    driverRequest('/driver/deliveries/available', { lat, lng, radius }),
  active: () => driverRequest('/driver/deliveries/active'),
  history: (params = {}) => driverRequest('/driver/deliveries/history', { params }),
  earnings: (params = {}) => driverRequest('/driver/deliveries/earnings', { params }),

  acceptDelivery: (id) =>
    driverRequest(`/driver/deliveries/${encodeURIComponent(id)}/accept`, {
      method: 'POST',
    }),
  rejectDelivery: (id) =>
    driverRequest(`/driver/deliveries/${encodeURIComponent(id)}/reject`, {
      method: 'POST',
    }),
  updateStatus: (id, status) =>
    driverRequest(`/driver/deliveries/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: { status },
    }),
  confirmDelivery: (id, payload) =>
    driverRequest(`/driver/deliveries/${encodeURIComponent(id)}/confirm-delivery`, {
      method: 'POST',
      body: payload,
    }),

  updateLocation: ({ latitude, longitude }) =>
    driverRequest('/driver/location', {
      method: 'PATCH',
      body: { latitude, longitude },
    }),
  setAvailability: (isOnline) =>
    driverRequest('/driver/availability', {
      method: 'PATCH',
      body: { is_online: isOnline },
    }),
};

export const DRIVER_VEHICLES = [
  'motorcycle',
  'scooter',
  'bicycle',
  'car',
  'foot',
];