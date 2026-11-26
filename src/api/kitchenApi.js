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
  invoiceDocumentUrl: (invoiceId, kind = 'invoice') => `/vendor/invoices/${id(invoiceId)}/document?kind=${kind}`,
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
  closeDiningSession: (tableId) => vendorRequest(`/vendor/tables/${id(tableId)}/session/close`, { method: 'POST' }),
  seatBalances: (tableId) => vendorRequest(`/vendor/tables/${id(tableId)}/seat-balances`),
  recordSeatPayment: (tableId, body) => vendorRequest(`/vendor/tables/${id(tableId)}/seat-payments`, { method: 'POST', body }),
  releaseSeat: (tableId, seatNumber, body = {}) =>
    vendorRequest(`/vendor/tables/${id(tableId)}/seats/${id(seatNumber)}/release`, { method: 'POST', body }),
  rotateTableQr: (tableId) => vendorRequest(`/vendor/tables/${id(tableId)}/qr/rotate`, { method: 'POST' }),
  /** The QR image as a Blob ('svg' to print sharp at any size, 'png' for phones). */
  tableQr: (tableId, format = 'svg', seatNumber = null) =>
    vendorDownload(`/vendor/tables/${id(tableId)}/qr${qs({ format, seat: seatNumber })}`),
  rotateSeatQr: (tableId, seatNumber) =>
    vendorRequest(`/vendor/tables/${id(tableId)}/seats/${id(seatNumber)}/qr/rotate`, { method: 'POST' }),

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

  // Orders: priority, people, items, departments, tables, reopening, history, couriers.
  orderPriority: (orderId, priority) => vendorRequest(`/vendor/orders/${id(orderId)}/priority`, { method: 'PATCH', body: { priority } }),
  assignOrder: (orderId, staffId) => vendorRequest(`/vendor/orders/${id(orderId)}/assign`, { method: 'PATCH', body: { staff_id: staffId || null } }),
  addOrderItem: (orderId, body) => vendorRequest(`/vendor/orders/${id(orderId)}/items`, { method: 'POST', body }),
  setOrderItemQuantity: (orderId, itemId, quantity) => vendorRequest(`/vendor/orders/${id(orderId)}/items/${id(itemId)}`, { method: 'PATCH', body: { quantity } }),
  removeOrderItem: (orderId, itemId) => vendorRequest(`/vendor/orders/${id(orderId)}/items/${id(itemId)}`, { method: 'DELETE' }),
  moveOrderItem: (orderId, itemId, departmentId) => vendorRequest(`/vendor/orders/${id(orderId)}/items/${id(itemId)}/department`, { method: 'PATCH', body: { department_id: departmentId || null } }),
  reopenOrder: (orderId, reason) => vendorRequest(`/vendor/orders/${id(orderId)}/reopen`, { method: 'POST', body: { reason } }),
  orderHistory: (orderId) => vendorRequest(`/vendor/orders/${id(orderId)}/history`),
  setOrderTable: (orderId, tableId) => vendorRequest(`/vendor/orders/${id(orderId)}/table`, { method: 'PUT', body: { table_id: tableId } }),
  claimOrder: (orderId) => vendorRequest(`/vendor/orders/${id(orderId)}/claim`, { method: 'POST' }),
  setCourier: (orderId, staffId) => vendorRequest(`/vendor/orders/${id(orderId)}/courier`, { method: 'PUT', body: { staff_id: staffId } }),
  cancelCourier: (orderId) => vendorRequest(`/vendor/orders/${id(orderId)}/courier`, { method: 'DELETE' }),
  courierOnTheWay: (orderId) => vendorRequest(`/vendor/orders/${id(orderId)}/courier/status`, { method: 'PATCH', body: { status: 'in_transit' } }),
  // assigned → acknowledged → collected → in_transit; failed / customer_unavailable → in_transit or returned (with a note).
  courierStatus: (orderId, status, note) => vendorRequest(`/vendor/orders/${id(orderId)}/courier/status`, { method: 'PATCH', body: { status, note } }),

  pauseTicket: (orderId, ticketId, paused, reason) =>
    vendorRequest(`/vendor/kitchen/orders/${id(orderId)}/tickets/${id(ticketId)}/pause`, { method: 'PATCH', body: { paused, reason } }),
  cancelTicket: (orderId, ticketId, reason) => vendorRequest(`/vendor/kitchen/orders/${id(orderId)}/tickets/${id(ticketId)}/cancel`, { method: 'POST', body: { reason } }),
  assignTicket: (orderId, ticketId, staffId) =>
    vendorRequest(`/vendor/kitchen/orders/${id(orderId)}/tickets/${id(ticketId)}/assign`, { method: 'PATCH', body: { staff_id: staffId || null } }),

  mergeTables: (tableId, fromTableId) => vendorRequest(`/vendor/tables/${id(tableId)}/merge`, { method: 'POST', body: { from_table_id: fromTableId } }),
  splitInvoice: (invoiceId, lineIds) => vendorRequest(`/vendor/invoices/${id(invoiceId)}/split`, { method: 'POST', body: { line_ids: lineIds } }),
  cancelInvoice: (invoiceId, reason) => vendorRequest(`/vendor/invoices/${id(invoiceId)}/cancel`, { method: 'POST', body: { reason } }),
  applyCode: (invoiceId, code) => vendorRequest(`/vendor/invoices/${id(invoiceId)}/apply-code`, { method: 'POST', body: { code } }),
  setInvoiceCustomer: (invoiceId, customerId) => vendorRequest(`/vendor/invoices/${id(invoiceId)}/customer`, { method: 'PUT', body: { customer_id: customerId || null } }),
  redeemPoints: (invoiceId, points) => vendorRequest(`/vendor/invoices/${id(invoiceId)}/redeem-points`, { method: 'POST', body: { points } }),

  serviceRequests: (status) => vendorRequest(`/vendor/service/requests${qs({ status })}`),
  updateServiceRequest: (requestId, status) => vendorRequest(`/vendor/service/requests/${id(requestId)}`, { method: 'PATCH', body: { status } }),

  cashierSessions: (status) => vendorRequest(`/vendor/cashier/sessions${qs({ status })}`),
  openTill: (body) => vendorRequest('/vendor/cashier/sessions', { method: 'POST', body }),
  closeTill: (sessionId, body) => vendorRequest(`/vendor/cashier/sessions/${id(sessionId)}/close`, { method: 'POST', body }),
  cashierReport: (params) => vendorRequest(`/vendor/cashier/report${qs(params)}`),

  expenses: (params) => vendorRequest(`/vendor/finance/expenses${qs(params)}`),
  createExpense: (body) => vendorRequest('/vendor/finance/expenses', { method: 'POST', body }),
  updateExpense: (expenseId, body) => vendorRequest(`/vendor/finance/expenses/${id(expenseId)}`, { method: 'PATCH', body }),
  deleteExpense: (expenseId) => vendorRequest(`/vendor/finance/expenses/${id(expenseId)}`, { method: 'DELETE' }),
  profitLoss: (params) => vendorRequest(`/vendor/finance/profit-loss${qs(params)}`),
  transactions: (params) => vendorRequest(`/vendor/finance/transactions${qs(params)}`),

  renameStockCategory: (from, to) => vendorRequest('/vendor/inventory/categories', { method: 'PATCH', body: { from, to } }),
  transferStock: (itemId, body) => vendorRequest(`/vendor/inventory/${id(itemId)}/transfer`, { method: 'POST', body }),
  purchaseOrders: (status) => vendorRequest(`/vendor/purchase-orders${qs({ status })}`),
  createPurchaseOrder: (body) => vendorRequest('/vendor/purchase-orders', { method: 'POST', body }),
  updatePurchaseOrder: (poId, body) => vendorRequest(`/vendor/purchase-orders/${id(poId)}`, { method: 'PATCH', body }),
  receivePurchaseOrder: (poId, lines) => vendorRequest(`/vendor/purchase-orders/${id(poId)}/receive`, { method: 'POST', body: lines ? { lines } : {} }),

  customers: (params) => vendorRequest(`/vendor/customers${qs(params)}`),
  customer: (customerId) => vendorRequest(`/vendor/customers/${id(customerId)}`),
  createCustomer: (body) => vendorRequest('/vendor/customers', { method: 'POST', body }),
  updateCustomer: (customerId, body) => vendorRequest(`/vendor/customers/${id(customerId)}`, { method: 'PATCH', body }),
  adjustPoints: (customerId, points, reason) => vendorRequest(`/vendor/customers/${id(customerId)}/points`, { method: 'POST', body: { points, reason } }),
  notifyCustomers: (body) => vendorRequest('/vendor/customers/notify', { method: 'POST', body }),
  feedback: (params) => vendorRequest(`/vendor/feedback${qs(params)}`),
  replyFeedback: (feedbackId, reply) => vendorRequest(`/vendor/feedback/${id(feedbackId)}/reply`, { method: 'POST', body: { reply } }),

  reservations: (params) => vendorRequest(`/vendor/reservations${qs(params)}`),
  createReservation: (body) => vendorRequest('/vendor/reservations', { method: 'POST', body }),
  updateReservation: (reservationId, body) => vendorRequest(`/vendor/reservations/${id(reservationId)}`, { method: 'PATCH', body }),
  tableAvailability: (params) => vendorRequest(`/vendor/reservations/availability${qs(params)}`),
  diningSessions: () => vendorRequest('/vendor/sessions'),
  reservation: (reservationId) => vendorRequest(`/vendor/reservations/${id(reservationId)}`),
  // Each step of a booking (the server decides which are allowed: allowed_next_statuses).
  reservationStep: (reservationId, step, body = {}) => vendorRequest(`/vendor/reservations/${id(reservationId)}/${step}`, { method: 'POST', body }),
  recordDeposit: (reservationId, body) => vendorRequest(`/vendor/reservations/${id(reservationId)}/deposit`, { method: 'POST', body }),

  // The floor: table visits, seating and the waiting list.
  floor: () => vendorRequest('/vendor/floor'),
  tableSessions: (params) => vendorRequest(`/vendor/table-sessions${qs(params)}`),
  tableSession: (sessionId) => vendorRequest(`/vendor/table-sessions/${id(sessionId)}`),
  seatGuests: (body) => vendorRequest('/vendor/table-sessions', { method: 'POST', body }),
  updateTableSession: (sessionId, body) => vendorRequest(`/vendor/table-sessions/${id(sessionId)}`, { method: 'PATCH', body }),
  setSessionServer: (sessionId, serverId) => vendorRequest(`/vendor/table-sessions/${id(sessionId)}/server`, { method: 'PUT', body: { server_id: serverId || null } }),
  moveGuests: (sessionId, tableId) => vendorRequest(`/vendor/table-sessions/${id(sessionId)}/transfer`, { method: 'POST', body: { table_id: tableId } }),
  tableSessionMenu: (sessionId) => vendorRequest(`/vendor/table-sessions/${id(sessionId)}/menu`),
  orderForTable: (sessionId, body) => vendorRequest(`/vendor/table-sessions/${id(sessionId)}/orders`, { method: 'POST', body }),
  closeTableSession: (sessionId, body = {}) => vendorRequest(`/vendor/table-sessions/${id(sessionId)}/close`, { method: 'POST', body }),
  waitlist: () => vendorRequest('/vendor/waitlist'),
  addToWaitlist: (body) => vendorRequest('/vendor/waitlist', { method: 'POST', body }),
  updateWaitlist: (entryId, body) => vendorRequest(`/vendor/waitlist/${id(entryId)}`, { method: 'PATCH', body }),

  // Packing: leftovers (free), takeaway from a dine-in order, delivery and pickup orders.
  packing: (params) => vendorRequest(`/vendor/packing${qs(params)}`),
  packTask: (taskId) => vendorRequest(`/vendor/packing/${id(taskId)}/pack`, { method: 'POST' }),
  handOverTask: (taskId) => vendorRequest(`/vendor/packing/${id(taskId)}/handover`, { method: 'POST' }),
  packingIssue: (taskId, body) => vendorRequest(`/vendor/packing/${id(taskId)}/issue`, { method: 'POST', body }),
  packLeftovers: (orderId, body = {}) => vendorRequest(`/vendor/orders/${id(orderId)}/leftovers`, { method: 'POST', body }),
  toTakeaway: (orderId, body = {}) => vendorRequest(`/vendor/orders/${id(orderId)}/takeaway`, { method: 'POST', body }),
  orderPacking: (orderId) => vendorRequest(`/vendor/orders/${id(orderId)}/packing`),

  // Deliveries: the coordinator's board, or a kitchen driver's own.
  deliveries: (params) => vendorRequest(`/vendor/deliveries${qs(params)}`),
  confirmDeliveryCode: (orderId, code) => vendorRequest(`/vendor/orders/${id(orderId)}/collect`, { method: 'POST', body: { pickup_code: code } }),

  // A department raises a problem on its ticket (late, can't make an item, needs help).
  flagTicket: (orderId, ticketId, body) => vendorRequest(`/vendor/kitchen/orders/${id(orderId)}/tickets/${id(ticketId)}/flags`, { method: 'POST', body }),
  resolveTicketFlag: (orderId, ticketId, index) => vendorRequest(`/vendor/kitchen/orders/${id(orderId)}/tickets/${id(ticketId)}/flags/${id(index)}/resolve`, { method: 'POST' }),

  promotions: () => vendorRequest('/vendor/promotions'),
  createPromotion: (body) => vendorRequest('/vendor/promotions', { method: 'POST', body }),
  updatePromotion: (promotionId, body) => vendorRequest(`/vendor/promotions/${id(promotionId)}`, { method: 'PATCH', body }),
  deletePromotion: (promotionId) => vendorRequest(`/vendor/promotions/${id(promotionId)}`, { method: 'DELETE' }),

  inbox: (params) => vendorRequest(`/vendor/inbox${qs(params)}`),
  sendMessage: (body) => vendorRequest('/vendor/inbox', { method: 'POST', body }),
  readMessage: (notificationId) => vendorRequest(`/vendor/inbox/${id(notificationId)}/read`, { method: 'POST' }),
  readAllMessages: () => vendorRequest('/vendor/inbox/read-all', { method: 'POST' }),
  inboxPreferences: () => vendorRequest('/vendor/inbox/preferences'),
  saveInboxPreferences: (muted) => vendorRequest('/vendor/inbox/preferences', { method: 'PUT', body: { muted } }),

  inviteStaff: (staffId) => vendorRequest(`/vendor/staff/${id(staffId)}/invite`, { method: 'POST' }),
  signOutStaff: (staffId) => vendorRequest(`/vendor/staff/${id(staffId)}/sign-out`, { method: 'POST' }),
  shifts: (params) => vendorRequest(`/vendor/shifts${qs(params)}`),
  createShift: (body) => vendorRequest('/vendor/shifts', { method: 'POST', body }),
  updateShift: (shiftId, body) => vendorRequest(`/vendor/shifts/${id(shiftId)}`, { method: 'PATCH', body }),
  deleteShift: (shiftId) => vendorRequest(`/vendor/shifts/${id(shiftId)}`, { method: 'DELETE' }),
  attendance: (params) => vendorRequest(`/vendor/attendance${qs(params)}`),
  editAttendance: (entryId, body) => vendorRequest(`/vendor/attendance/${id(entryId)}`, { method: 'PATCH', body }),
  myAttendance: () => vendorRequest('/vendor/attendance/me'),
  clockIn: () => vendorRequest('/vendor/attendance/clock-in', { method: 'POST', body: {} }),
  clockOut: () => vendorRequest('/vendor/attendance/clock-out', { method: 'POST' }),

  renameMenuCategory: (categoryId, name) => vendorRequest(`/vendor/menu/categories/${id(categoryId)}`, { method: 'PATCH', body: { name } }),
  deleteMenuCategory: (categoryId) => vendorRequest(`/vendor/menu/categories/${id(categoryId)}`, { method: 'DELETE' }),
  menuCategories: () => vendorRequest('/vendor/menu/categories'),

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

/**
 * May this person make this request? `routes` is the server's own list of
 * what each route accepts (GET /vendor/permissions → routes), so a button
 * shows exactly when the server would allow it. key: 'POST /vendor/inventory/:item_id/adjust'.
 */
export function canRoute(workspace, routes, key, departmentId) {
  if (!workspace) return false;
  if (workspace.is_admin) return true;
  // Rules not loaded (or a server without them, like demo mode): the server still checks.
  if (!routes) return true;
  const list = routes[key];
  if (!list) return false;
  if (list.includes('admin')) return false;
  if (!list.length) return true;
  return list.some((permission) => canDo(workspace, permission, departmentId));
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
