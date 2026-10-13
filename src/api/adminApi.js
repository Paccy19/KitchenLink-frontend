/**
 * Admin Panel API service.
 *
 * Talks to the backend `/admin/*` endpoints with a dedicated admin token
 * (`ofk_admin_token`) so customer/vendor/driver sessions are never touched.
 *
 * @module api/adminApi
 */

import { ApiError, buildUrl } from './client';
import { notifyDataChanged } from './liveUpdates';

export const ADMIN_TOKEN_KEY = 'ofk_admin_token';

export const getAdminToken = () => localStorage.getItem(ADMIN_TOKEN_KEY) || '';
export const setAdminToken = (token) => {
  if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
};
export const clearAdminToken = () => localStorage.removeItem(ADMIN_TOKEN_KEY);

async function adminRequest(path, { method = 'GET', body } = {}) {
  const url = buildUrl(path);
  const headers = { Accept: 'application/json' };
  const token = getAdminToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (body !== undefined) {
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
    clearAdminToken();
    window.dispatchEvent(new Event('ofk:admin-unauthorized'));
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      data?.error?.message || data?.message || `Request failed (${response.status}).`,
      { status: response.status, path, code: data?.error?.code || '' },
    );
  }
  notifyDataChanged(method, path);
  return data;
}

const qs = (params = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, String(value));
  });
  const text = search.toString();
  return text ? `?${text}` : '';
};

export const adminApi = {
  login: (email, password) =>
    adminRequest('/admin/auth/login', { method: 'POST', body: { email, password } }),
  me: () => adminRequest('/admin/auth/me'),
  changePassword: (payload) =>
    adminRequest('/admin/auth/change-password', { method: 'POST', body: payload }),
  // SMS codes: second sign-in step, setup, and codes confirming money actions.
  verifyTwoFactor: (challengeToken, code) =>
    adminRequest('/admin/auth/verify-2fa', { method: 'POST', body: { challenge_token: challengeToken, code } }),
  startTwoFactor: (phone) => adminRequest('/admin/auth/2fa/start', { method: 'POST', body: { phone } }),
  enableTwoFactor: (phone, code) =>
    adminRequest('/admin/auth/2fa/enable', { method: 'POST', body: { phone, code } }),
  disableTwoFactor: (code) => adminRequest('/admin/auth/2fa/disable', { method: 'POST', body: { code } }),
  sendActionCode: (purpose) => adminRequest('/admin/auth/action-code', { method: 'POST', body: { purpose } }),

  // The owner's platform money (super admin only).
  ownerOverview: () => adminRequest('/admin/platform/owner'),
  ownerWithdraw: (body) => adminRequest('/admin/platform/owner/withdrawals', { method: 'POST', body }),
  ownerCompleteWithdrawal: (id, body) =>
    adminRequest(`/admin/platform/owner/withdrawals/${encodeURIComponent(id)}/complete`, { method: 'POST', body }),
  ownerCancelWithdrawal: (id, body) =>
    adminRequest(`/admin/platform/owner/withdrawals/${encodeURIComponent(id)}/cancel`, { method: 'POST', body }),
  ownerAddDestination: (body) => adminRequest('/admin/platform/owner/destinations', { method: 'POST', body }),
  ownerRemoveDestination: (id, body) =>
    adminRequest(`/admin/platform/owner/destinations/${encodeURIComponent(id)}/remove`, { method: 'POST', body }),
  ownerAdjustment: (body) => adminRequest('/admin/platform/owner/adjustments', { method: 'POST', body }),
  ownerReconciliation: (body) => adminRequest('/admin/platform/owner/reconciliations', { method: 'POST', body }),
  ownerSavePayoutSettings: (body) =>
    adminRequest('/admin/platform/owner/payout-settings', { method: 'PUT', body }),

  dashboard: () => adminRequest('/admin/dashboard/overview'),

  listNotifications: (params) => adminRequest(`/admin/notifications${qs(params)}`),
  markNotificationRead: (id) =>
    adminRequest(`/admin/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' }),
  markAllNotificationsRead: () =>
    adminRequest('/admin/notifications/read-all', { method: 'POST' }),

  listUsers: (params) => adminRequest(`/admin/users${qs(params)}`),
  getUser: (id, params) => adminRequest(`/admin/users/${encodeURIComponent(id)}${qs(params)}`),
  setUserStatus: (id, body) =>
    adminRequest(`/admin/users/${encodeURIComponent(id)}/status`, { method: 'PATCH', body }),

  listVendors: (params) => adminRequest(`/admin/vendors${qs(params)}`),
  vendorCounts: () => adminRequest('/admin/vendors/counts'),
  getVendor: (id) => adminRequest(`/admin/vendors/${encodeURIComponent(id)}`),
  setVendorStatus: (id, body) =>
    adminRequest(`/admin/vendors/${encodeURIComponent(id)}/status`, { method: 'PATCH', body }),

  listDrivers: (params) => adminRequest(`/admin/drivers${qs(params)}`),
  driverCounts: () => adminRequest('/admin/drivers/counts'),
  getDriver: (id) => adminRequest(`/admin/drivers/${encodeURIComponent(id)}`),
  setDriverStatus: (id, body) =>
    adminRequest(`/admin/drivers/${encodeURIComponent(id)}/status`, { method: 'PATCH', body }),
  liveDeliveries: (params) => adminRequest(`/admin/deliveries/live${qs(params)}`),

  listOrders: (params) => adminRequest(`/admin/orders${qs(params)}`),
  getOrder: (id) => adminRequest(`/admin/orders/${encodeURIComponent(id)}`),
  updateOrderStatus: (id, body) =>
    adminRequest(`/admin/orders/${encodeURIComponent(id)}/status`, { method: 'PATCH', body }),
  cancelOrder: (id, body) =>
    adminRequest(`/admin/orders/${encodeURIComponent(id)}/cancel`, { method: 'POST', body }),
  reassignDriver: (id, body) =>
    adminRequest(`/admin/orders/${encodeURIComponent(id)}/reassign-driver`, {
      method: 'POST',
      body,
    }),

  listPayments: (params) => adminRequest(`/admin/payments${qs(params)}`),
  paymentSummary: (params) => adminRequest(`/admin/payments/summary${qs(params)}`),

  listCommissions: (params) => adminRequest(`/admin/commissions${qs(params)}`),
  createCommission: (body) => adminRequest('/admin/commissions', { method: 'POST', body }),
  updateCommission: (id, body) =>
    adminRequest(`/admin/commissions/${encodeURIComponent(id)}`, { method: 'PUT', body }),
  deleteCommission: (id) =>
    adminRequest(`/admin/commissions/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  listPayouts: (params) => adminRequest(`/admin/payouts${qs(params)}`),
  payoutBalances: (params) => adminRequest(`/admin/payouts/balances${qs(params)}`),
  payoutSummary: (params) => adminRequest(`/admin/payouts/summary${qs(params)}`),
  updatePayout: (id, body) =>
    adminRequest(`/admin/payouts/${encodeURIComponent(id)}`, { method: 'PATCH', body }),

  listCategories: () => adminRequest('/admin/categories'),
  createCategory: (body) => adminRequest('/admin/categories', { method: 'POST', body }),
  updateCategory: (id, body) =>
    adminRequest(`/admin/categories/${encodeURIComponent(id)}`, { method: 'PUT', body }),
  deleteCategory: (id, force = false) =>
    adminRequest(`/admin/categories/${encodeURIComponent(id)}${force ? '?force=true' : ''}`, {
      method: 'DELETE',
    }),
  reorderCategories: (items) =>
    adminRequest('/admin/categories/reorder', { method: 'PATCH', body: { items } }),

  listComplaints: (params) => adminRequest(`/admin/complaints${qs(params)}`),
  getComplaint: (id) => adminRequest(`/admin/complaints/${encodeURIComponent(id)}`),
  createComplaint: (body) => adminRequest('/admin/complaints', { method: 'POST', body }),
  updateComplaint: (id, body) =>
    adminRequest(`/admin/complaints/${encodeURIComponent(id)}`, { method: 'PATCH', body }),

  analyticsOverview: (params) => adminRequest(`/admin/analytics/overview${qs(params)}`),
  analyticsSales: (params) => adminRequest(`/admin/analytics/sales${qs(params)}`),
  analyticsPayouts: (params) => adminRequest(`/admin/analytics/payouts${qs(params)}`),

  listActions: (params) => adminRequest(`/admin/actions${qs(params)}`),
};
