/**
 * Kitchen operations: departments, staff and roles, tables and QR codes,
 * preparation queues, the server board, invoices, stock and reports.
 *
 * Same kitchen session as vendorApi (`ofk_vendor_token`); the server checks
 * every call against the signed-in person's permissions. Responses are the
 * backend's snake_case JSON (like the admin pages, each page reads its fields).
 *
 * @module api/kitchenApi
 */

import { vendorRequest, vendorDownload } from './vendorApi';

const qs = (params = {}) => {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return entries.length ? `?${new URLSearchParams(entries).toString()}` : '';
};
const id = (value) => encodeURIComponent(value);

export const kitchenApi = {
  // Who is signed in, their permissions and badge counts.
  workspace: () => vendorRequest('/vendor/workspace'),
  permissions: () => vendorRequest('/vendor/permissions'),
  operations: () => vendorRequest('/vendor/operations'),
  saveOperations: (body) => vendorRequest('/vendor/operations', { method: 'PUT', body }),
  activity: (params) => vendorRequest(`/vendor/activity${qs(params)}`),

  departments: () => vendorRequest('/vendor/departments'),
  department: (departmentId) => vendorRequest(`/vendor/departments/${id(departmentId)}`),
  createDepartment: (body) => vendorRequest('/vendor/departments', { method: 'POST', body }),
  updateDepartment: (departmentId, body) => vendorRequest(`/vendor/departments/${id(departmentId)}`, { method: 'PATCH', body }),
  deleteDepartment: (departmentId) => vendorRequest(`/vendor/departments/${id(departmentId)}`, { method: 'DELETE' }),
  setDepartmentStaff: (departmentId, staffIds) =>
    vendorRequest(`/vendor/departments/${id(departmentId)}/staff`, { method: 'PUT', body: { staff_ids: staffIds } }),

  roles: () => vendorRequest('/vendor/roles'),
  createRole: (body) => vendorRequest('/vendor/roles', { method: 'POST', body }),
  updateRole: (roleId, body) => vendorRequest(`/vendor/roles/${id(roleId)}`, { method: 'PATCH', body }),
  deleteRole: (roleId) => vendorRequest(`/vendor/roles/${id(roleId)}`, { method: 'DELETE' }),

  staff: (params) => vendorRequest(`/vendor/staff${qs(params)}`),
  createStaff: (body) => vendorRequest('/vendor/staff', { method: 'POST', body }),
  updateStaff: (staffId, body) => vendorRequest(`/vendor/staff/${id(staffId)}`, { method: 'PATCH', body }),
  setStaffActive: (staffId, isActive) => vendorRequest(`/vendor/staff/${id(staffId)}/status`, { method: 'PATCH', body: { is_active: isActive } }),
  deleteStaff: (staffId) => vendorRequest(`/vendor/staff/${id(staffId)}`, { method: 'DELETE' }),

  tables: () => vendorRequest('/vendor/tables'),
  table: (tableId) => vendorRequest(`/vendor/tables/${id(tableId)}`),
  createTable: (body) => vendorRequest('/vendor/tables', { method: 'POST', body }),
  createTables: (body) => vendorRequest('/vendor/tables/batch', { method: 'POST', body }),
  updateTable: (tableId, body) => vendorRequest(`/vendor/tables/${id(tableId)}`, { method: 'PATCH', body }),
  deleteTable: (tableId) => vendorRequest(`/vendor/tables/${id(tableId)}`, { method: 'DELETE' }),
  rotateTableQr: (tableId) => vendorRequest(`/vendor/tables/${id(tableId)}/qr/rotate`, { method: 'POST' }),
  /** The QR image as a Blob ('svg' to print sharp at any size, 'png' for phones). */
  tableQr: (tableId, format = 'svg') => vendorDownload(`/vendor/tables/${id(tableId)}/qr${qs({ format })}`),

  queue: (params) => vendorRequest(`/vendor/kitchen/queue${qs(params)}`),
  advanceTicket: (orderId, ticketId, status) =>
    vendorRequest(`/vendor/kitchen/orders/${id(orderId)}/tickets/${id(ticketId)}`, { method: 'PATCH', body: { status } }),

  serviceBoard: (params) => vendorRequest(`/vendor/service/board${qs(params)}`),
  collectItems: (orderId, itemIds) => vendorRequest(`/vendor/service/orders/${id(orderId)}/collect`, { method: 'POST', body: itemIds ? { item_ids: itemIds } : {} }),
  serveItems: (orderId, itemIds) => vendorRequest(`/vendor/service/orders/${id(orderId)}/serve`, { method: 'POST', body: itemIds ? { item_ids: itemIds } : {} }),

  invoices: (params) => vendorRequest(`/vendor/invoices${qs(params)}`),
  invoice: (invoiceId) => vendorRequest(`/vendor/invoices/${id(invoiceId)}`),
  generateInvoice: (orderId) => vendorRequest('/vendor/invoices', { method: 'POST', body: { order_id: orderId } }),
  editInvoice: (invoiceId, body) => vendorRequest(`/vendor/invoices/${id(invoiceId)}`, { method: 'PATCH', body }),
  recordPayment: (invoiceId, body) => vendorRequest(`/vendor/invoices/${id(invoiceId)}/payments`, { method: 'POST', body }),
  refundInvoice: (invoiceId, body) => vendorRequest(`/vendor/invoices/${id(invoiceId)}/refunds`, { method: 'POST', body }),
  closeInvoice: (invoiceId) => vendorRequest(`/vendor/invoices/${id(invoiceId)}/close`, { method: 'POST' }),

  inventory: (params) => vendorRequest(`/vendor/inventory${qs(params)}`),
  createStockItem: (body) => vendorRequest('/vendor/inventory', { method: 'POST', body }),
  updateStockItem: (itemId, body) => vendorRequest(`/vendor/inventory/${id(itemId)}`, { method: 'PATCH', body }),
  deleteStockItem: (itemId) => vendorRequest(`/vendor/inventory/${id(itemId)}`, { method: 'DELETE' }),
  adjustStock: (itemId, body) => vendorRequest(`/vendor/inventory/${id(itemId)}/adjust`, { method: 'POST', body }),
  stockMovements: (params) => vendorRequest(`/vendor/inventory/movements${qs(params)}`),
  suppliers: () => vendorRequest('/vendor/suppliers'),
  createSupplier: (body) => vendorRequest('/vendor/suppliers', { method: 'POST', body }),
  updateSupplier: (supplierId, body) => vendorRequest(`/vendor/suppliers/${id(supplierId)}`, { method: 'PATCH', body }),
  deleteSupplier: (supplierId) => vendorRequest(`/vendor/suppliers/${id(supplierId)}`, { method: 'DELETE' }),
  setRecipe: (menuItemId, recipe) => vendorRequest(`/vendor/menu/${id(menuItemId)}/recipe`, { method: 'PUT', body: { recipe } }),

  report: (params) => vendorRequest(`/vendor/reports${qs(params)}`),
  reportToday: () => vendorRequest('/vendor/reports/today'),
  reportHistory: (period) => vendorRequest(`/vendor/reports/history${qs({ period })}`),
  reportCsv: (params) => vendorDownload(`/vendor/reports/export${qs(params)}`),
};

/** Whether a workspace (GET /vendor/workspace) holds a permission, optionally for one department. */
export function canDo(workspace, permission, departmentId) {
  if (!workspace) return false;
  if (workspace.is_admin) return true;
  const grant = workspace.permissions?.[permission];
  if (!grant) return false;
  if (grant === 'all' || departmentId === undefined) return true;
  return departmentId !== null && grant.includes(departmentId);
}

/** Saves a Blob as a file. */
export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default kitchenApi;
