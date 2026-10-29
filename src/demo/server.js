/**
 * In-browser demo backend.
 *
 * Answers the website's `/api/v1/*` requests from demo data (see `seed.js`)
 * following API_CONTRACT.md, so every screen can be used without a real
 * backend. State lives in localStorage and survives reloads until reset.
 *
 * Endpoints without demo data answer 501 with a readable message, which the
 * screens show like any other API error.
 *
 * @module demo/server
 */

import { DEMO_IDS, DEMO_OTP, createSeed } from './seed';
import { VENDOR_TYPES, vendorTypeLabel } from '../data/vendorTypes';

const STATE_KEY = 'ofk_demo_state';
const TOKENS = {
  customer: 'demo-token-customer',
  vendor: 'demo-token-vendor',
  driver: 'demo-token-driver',
  admin: 'demo-token-admin',
};
const COMMISSION_PERCENT = 10;
const DRIVER_SHARE_PERCENT = 80;
const NEAR_RADIUS_KM = 5;
const KIGALI = { lat: -1.9441, lng: 30.0619 };

/* --------------------------------- state --------------------------------- */

let state = null;
// Which account each role token belongs to (the demo signs into seed accounts).
let sessions = null;

function load() {
  if (state) return;
  try {
    const saved = JSON.parse(localStorage.getItem(STATE_KEY) || 'null');
    if (saved?.state?.version === 2) {
      state = saved.state;
      sessions = saved.sessions || {};
      return;
    }
  } catch {
    /* corrupt or unavailable storage: start fresh */
  }
  state = createSeed();
  sessions = {};
}

function save() {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify({ state, sessions }));
  } catch {
    /* storage full or unavailable: the demo keeps working in memory */
  }
}

/** Throws the demo world away; the next request starts from the seed. */
export function resetDemoState() {
  state = null;
  sessions = null;
  try {
    localStorage.removeItem(STATE_KEY);
  } catch {
    /* ignore */
  }
}

const nextId = (prefix) => `${prefix}-${(state.nextId += 1)}`;
const nowIso = () => new Date().toISOString();

/* -------------------------------- helpers -------------------------------- */

class HttpError extends Error {
  constructor(status, message, code = '') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const fail = (status, message, code) => {
  throw new HttpError(status, message, code);
};

const toRad = (deg) => (deg * Math.PI) / 180;
function distanceKm(a, b) {
  if (a?.lat == null || b?.lat == null) return null;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  // Roads are longer than the straight line.
  return Number((6371 * 2 * Math.asin(Math.sqrt(h)) * 1.3).toFixed(1));
}

const coordsOf = (query) => {
  const lat = Number(query.get('lat'));
  const lng = Number(query.get('lng'));
  return query.get('lat') && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
};

const vendorPoint = (vendor) => ({ lat: vendor.latitude, lng: vendor.longitude });

/** A fee from distance ranges ({from_km, to_km, fee_rwf}), or null when none fits. */
const feeFromRanges = (ranges, km) => {
  if (!ranges?.length) return null;
  const range = ranges.find((r) => km >= r.from_km && (r.to_km == null || km < r.to_km)) || ranges[ranges.length - 1];
  return range.fee_rwf;
};

// The admin's fee ranges when set, otherwise the standard formula
// (500 RWF + 200 RWF per km, at least 800 RWF).
const feeForKm = (km) =>
  feeFromRanges(state.settings.delivery_fee_ranges, km ?? 3) ??
  Math.max(800, Math.round((500 + 200 * (km ?? 3)) / 100) * 100);

function paginate(list, query, defaultLimit = 20) {
  const page = Math.max(1, Number(query.get('page')) || 1);
  const limit = Math.max(1, Number(query.get('limit')) || defaultLimit);
  return { page, limit, total: list.length, slice: list.slice((page - 1) * limit, page * limit) };
}

const matches = (text, q) => String(text || '').toLowerCase().includes(q);

const categoryName = (id) => state.categories.find((c) => c.id === id)?.name || 'Menu';
const findVendor = (id) => state.vendors.find((v) => v.id === id);
const findCustomer = (id) => state.customers.find((c) => c.id === id);
const findDriver = (id) => state.drivers.find((d) => d.id === id);
const findItem = (id) => state.menuItems.find((m) => m.id === id);
const findOrder = (id) =>
  state.orders.find((o) => o.id === id || o.order_number === id) || fail(404, 'Order not found.');

const isToday = (iso) => new Date(iso).toDateString() === new Date().toDateString();

/* --------------------------- order life cycle ---------------------------- */

const STATUS_LABELS = {
  placed: 'Placed',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready',
  assigned: 'Delivery worker assigned',
  picked_up: 'Picked up',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};
const OPEN = ['placed', 'confirmed', 'preparing', 'ready', 'assigned', 'picked_up', 'out_for_delivery'];

function setStatus(order, status, note = '') {
  if (order.status === status) return;
  order.status = status;
  order.history.push({ status, at: nowIso(), note });
  if (status === 'assigned') order.assigned_at = nowIso();
  if (status === 'picked_up') order.picked_up_at = nowIso();
  if (status === 'ready') order.ready_at = nowIso();
  if (status === 'delivered') order.completed_at = nowIso();
  if (status === 'cancelled' && ['paid', 'partially_paid'].includes(order.payment_status)) {
    order.payment_status = 'refunded';
    const customer = findCustomer(order.customer_id);
    const why = `${note} ${order.cancel_reason}`.toLowerCase();
    state.refunds.unshift({
      id: nextId('rf'),
      order_id: order.id,
      amount_rwf: order.deposit ? order.deposit.amount_paid_rwf : order.total_rwf,
      status: 'pending',
      destination: { type: 'mobile_money', label: `MTN Mobile Money · ${customer?.phone_number || ''}`, phone: customer?.phone_number || '' },
      reason: note || order.cancel_reason || 'Order cancelled',
      cancelled_by: why.includes('kitchen') ? 'vendor' : why.includes('support') || why.includes('admin') ? 'admin' : 'customer',
      reference: '',
      failure_reason: '',
      created_at: nowIso(),
      completed_at: null,
    });
  }
  notify(`customer:${order.customer_id}`, 'order', `Order ${STATUS_LABELS[status].toLowerCase()}`,
    `${findVendor(order.vendor_id)?.name}: order ${order.order_number} is ${STATUS_LABELS[status].toLowerCase()}.`);
}

// Orders placed in the demo move on by themselves (kitchen, then a delivery
// worker) until a kitchen or delivery worker account acts on them.
const AUTO_STEPS = [
  [15, 'confirmed'],
  [35, 'preparing'],
  [70, 'ready'],
  [95, 'assigned'],
  [120, 'picked_up'],
  [140, 'out_for_delivery'],
  [200, 'delivered'],
];

function tick() {
  const now = Date.now();
  let changed = false;
  state.orders.forEach((order) => {
    if (!order.auto || !OPEN.includes(order.status)) return;
    const seconds = (now - new Date(order.created_at).getTime()) / 1000;
    for (const [after, status] of AUTO_STEPS) {
      if (seconds < after) break;
      if (order.fulfillment === 'pickup' && !['confirmed', 'preparing', 'ready'].includes(status)) continue;
      const step = AUTO_STEPS.findIndex(([, s]) => s === status);
      const current = AUTO_STEPS.findIndex(([, s]) => s === order.status);
      if (step > current) {
        if (status === 'assigned') order.driver_id = 'drv-2';
        setStatus(order, status);
        changed = true;
      }
    }
  });
  if (changed) save();
}

function notify(audience, type, title, body) {
  state.notifications.unshift({ id: nextId('n'), audience, type, title, body, read: false, created_at: nowIso() });
}

/* ------------------------------ projections ------------------------------ */

function publicVendor(vendor, from = null) {
  const point = vendorPoint(vendor);
  const km = from ? distanceKm(from, point) : null;
  return {
    id: vendor.id,
    name: vendor.name,
    vendor_type: vendor.vendor_type,
    vendor_type_label: vendorTypeLabel(vendor.vendor_type),
    rating: vendor.rating,
    reviews_count: vendor.reviews_count,
    ...(km != null ? { distance_km: km, is_nearby: km <= NEAR_RADIUS_KM } : {}),
    estimated_prep_time: vendor.estimated_prep_time,
    delivery_available: true,
    is_open: vendor.is_open,
    banner_image_url: vendor.banner,
    avatar_url: vendor.avatar,
    neighborhood: vendor.neighborhood,
    description: vendor.description,
    categories: vendor.categories.map(categoryName),
    delivery_fee: feeForKm(km),
    minimum_order: 0,
    special: state.specials[vendor.id] || null,
    operating_hours: vendor.hours.length ? `Daily ${vendor.hours[0].open_time}–${vendor.hours[0].close_time}` : '',
    coordinates: point,
  };
}

function publicDish(item) {
  const vendor = findVendor(item.vendor_id);
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    price_rwf: item.price_rwf,
    image_url: item.image_url,
    category: categoryName(item.category_id),
    is_available: item.is_available,
    estimated_prep_time: item.preparation_time_minutes,
    is_preorder: item.is_preorder,
    preorder_cutoff: item.preorder_cutoff,
    popular: item.is_popular,
    options: groupOptions(item.options),
    vendor: { id: vendor.id, name: vendor.name, vendor_type: vendor.vendor_type },
    rating: vendor.rating,
  };
}

function groupOptions(options = []) {
  const groups = new Map();
  options.forEach((option) => {
    const name = option.group_name || 'Options';
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(option.name);
  });
  return [...groups.entries()].map(([name, choices]) => ({ name, choices }));
}

const visibleVendors = () => state.vendors.filter((v) => v.status === 'approved');
const liveItems = () =>
  state.menuItems.filter((item) => findVendor(item.vendor_id)?.status === 'approved');

function filterVendors(list, query) {
  const category = query.get('category_id');
  const types = (query.get('vendor_type') || '').split(',').filter(Boolean);
  return list.filter(
    (v) => (!category || v.categories.includes(category)) && (!types.length || types.includes(v.vendor_type)),
  );
}

function sortVendors(list, query, from) {
  const sort = query.get('sort') || 'distance';
  return [...list].sort((a, b) => {
    if (sort === 'rating' || !from) return b.rating - a.rating;
    return distanceKm(from, vendorPoint(a)) - distanceKm(from, vendorPoint(b));
  });
}

const deliveryStatusOf = (order) => {
  if (order.status === 'cancelled') return 'cancelled';
  if (['placed', 'confirmed', 'preparing'].includes(order.status)) return 'pending';
  if (order.status === 'ready') return order.driver_id ? 'assigned_to_driver' : 'ready_for_pickup';
  if (order.status === 'assigned') return 'assigned_to_driver';
  return order.status;
};

function customerOrder(order) {
  const vendor = findVendor(order.vendor_id);
  const driver = order.driver_id ? findDriver(order.driver_id) : null;
  const done = ['delivered', 'cancelled'].includes(order.status);
  const methodLabel = { mobile_money: 'Mobile Money', card: 'Cards', ekash: 'eKash', wallet: 'Wallet' }[order.payment_method];
  return {
    id: order.id,
    order_number: order.order_number,
    created_at: order.created_at,
    status: order.status,
    order_type: order.order_type,
    order_type_label: order.order_type === 'immediate' ? 'Immediate' : 'Scheduled',
    fulfillment: order.fulfillment,
    scheduled_for: order.scheduled_for,
    special_text: order.special_text,
    vendor: { id: vendor.id, name: vendor.name, vendor_type: vendor.vendor_type, neighborhood: vendor.neighborhood, phone: vendor.phone },
    items: order.items,
    subtotal_rwf: order.subtotal_rwf,
    delivery_fee_rwf: order.delivery_fee_rwf,
    total_rwf: order.total_rwf,
    payment_method: order.payment_method,
    payment_method_label: methodLabel,
    payment_status: order.payment_status,
    payment: { method: order.payment_method, method_label: methodLabel, status: order.payment_status, reference: `PAY-${order.order_number}` },
    delivery_location: order.delivery_location || {},
    delivery: order.fulfillment === 'delivery'
      ? {
          status: deliveryStatusOf(order),
          proof_of_delivery_code: order.delivery_code,
          otp_required: true,
          otp_verified: order.status === 'delivered',
          can_confirm: false,
        }
      : {},
    rider: driver ? { name: driver.name, phone: driver.phone } : null,
    eta_minutes: done ? null : order.fulfillment === 'pickup' ? 20 : 35,
    pickup: ['pickup', 'vendor_delivery'].includes(order.fulfillment)
      ? {
          address: vendor.address,
          neighborhood: vendor.neighborhood,
          latitude: vendor.latitude,
          longitude: vendor.longitude,
          vendor_phone: vendor.phone,
          code: order.pickup_code,
          ready_for_collection: order.status === 'ready',
          collected_at: order.status === 'delivered' ? order.completed_at || order.created_at : null,
        }
      : null,
    cancel_reason: order.cancel_reason,
    refund: refundView(state.refunds.find((r) => r.order_id === order.id)),
    event: order.event || null,
    deposit: depositView(order),
  };
}

const REFUND_LABELS = { pending: 'On its way', completed: 'Refunded', failed: 'Refund failed' };

function refundView(refund) {
  if (!refund) return null;
  return {
    id: refund.id,
    amount_rwf: refundAmount(refund),
    status: refund.status,
    status_label: REFUND_LABELS[refund.status] || refund.status,
    destination: refund.destination,
    reference: refund.reference,
    failure_reason: refund.failure_reason,
    completed_at: refund.completed_at,
    can_change_destination: refund.status !== 'completed',
    expected_within_hours: 24,
  };
}

const refundAmount = (refund) =>
  refund.amount_rwf || state.orders.find((o) => o.id === refund.order_id)?.total_rwf || 0;

/** Big events: deposit now, balance a day before the event. */
function depositView(order) {
  const d = order.deposit;
  if (!d) return null;
  const paid = Boolean(d.balance_paid_at);
  const due = new Date(d.balance_due_at).getTime();
  return {
    deposit_rwf: d.deposit_rwf,
    balance_rwf: d.balance_rwf,
    amount_paid_rwf: d.amount_paid_rwf,
    balance_due_at: d.balance_due_at,
    balance_paid_at: d.balance_paid_at,
    balance_unpaid: !paid,
    can_pay_balance: !paid && order.status !== 'cancelled',
    overdue: !paid && Date.now() > due,
  };
}

const VENDOR_STATUS = {
  placed: 'new',
  confirmed: 'accepted',
  preparing: 'preparing',
  ready: 'ready',
  assigned: 'ready',
  picked_up: 'completed',
  out_for_delivery: 'completed',
  delivered: 'completed',
  cancelled: 'cancelled',
};
const VENDOR_NEXT = { new: ['accepted', 'cancelled'], accepted: ['preparing', 'cancelled'], preparing: ['ready'] };

function moneySplit(order) {
  const commission = Math.round((order.subtotal_rwf * COMMISSION_PERCENT) / 100);
  return { commission, payout: order.subtotal_rwf - commission };
}

function vendorOrder(order) {
  const customer = findCustomer(order.customer_id);
  const status = VENDOR_STATUS[order.status];
  const { commission, payout } = moneySplit(order);
  return {
    id: order.id,
    order_number: order.order_number,
    status,
    created_at: order.created_at,
    fulfillment: order.fulfillment,
    can_confirm_pickup: ['pickup', 'vendor_delivery'].includes(order.fulfillment) && order.status === 'ready',
    pickup_attempts_left: 5,
    collected_at: ['pickup', 'vendor_delivery'].includes(order.fulfillment) && order.status === 'delivered' ? order.completed_at : null,
    customer: { name: customer?.name || 'Customer', phone_number: customer?.phone_number || '' },
    delivery_location: order.delivery_location || {},
    items: order.items.map((item) => ({ ...item, options: [] })),
    subtotal_rwf: order.subtotal_rwf,
    delivery_fee_rwf: order.delivery_fee_rwf,
    total_amount_rwf: order.total_rwf,
    commission_percent: COMMISSION_PERCENT,
    commission_rwf: commission,
    vendor_payout_rwf: payout,
    settlement_status: order.status === 'delivered' ? 'settled' : 'unpaid',
    order_type: order.order_type,
    order_type_label: order.order_type === 'immediate' ? 'Immediate' : 'Scheduled',
    scheduled_for: order.scheduled_for,
    special_text: order.special_text,
    payment_status: order.payment_status,
    payment_method: order.payment_method,
    cancel_reason: order.cancel_reason,
    eta_minutes: OPEN.includes(order.status) ? 25 : null,
    allowed_next_statuses: VENDOR_NEXT[status] || [],
    event: order.event || null,
    deposit: depositView(order),
  };
}

const DELIVERY_LABELS = {
  ready_for_pickup: 'Ready for pickup',
  assigned_to_driver: 'Assigned to you',
  picked_up: 'Picked up',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  pending: 'Kitchen preparing',
};
const DRIVER_NEXT = { assigned_to_driver: ['picked_up'], picked_up: ['out_for_delivery'] };

function delivery(order, driverPoint = null) {
  const vendor = findVendor(order.vendor_id);
  const customer = findCustomer(order.customer_id);
  const status = deliveryStatusOf(order);
  const drop = order.delivery_location || {};
  const routeKm = distanceKm(vendorPoint(vendor), { lat: drop.latitude, lng: drop.longitude });
  const earnings = Math.round((order.delivery_fee_rwf * DRIVER_SHARE_PERCENT) / 100);
  const history = order.history.map((entry) => ({ ...entry, label: STATUS_LABELS[entry.status] || entry.status }));
  return {
    id: `del-${order.id}`,
    order_id: order.id,
    order_number: order.order_number,
    status,
    status_label: DELIVERY_LABELS[status] || status,
    allowed_next_statuses: DRIVER_NEXT[status] || [],
    vendor: {
      id: vendor.id,
      name: vendor.name,
      phone: vendor.phone,
      address: vendor.address,
      neighborhood: vendor.neighborhood,
      latitude: vendor.latitude,
      longitude: vendor.longitude,
    },
    customer: { id: customer?.id, name: customer?.name || 'Customer', phone_number: customer?.phone_number || '' },
    pickup_location: { address: vendor.address, neighborhood: vendor.neighborhood, latitude: vendor.latitude, longitude: vendor.longitude },
    delivery_location: drop,
    route_distance_km: routeKm,
    distance_from_driver_km: driverPoint ? distanceKm(driverPoint, vendorPoint(vendor)) : null,
    delivery_fee_rwf: order.delivery_fee_rwf,
    promised_earnings_rwf: earnings,
    paid_earnings_rwf: order.status === 'delivered' ? earnings : null,
    payment_method: order.payment_method,
    otp_required: true,
    dev_otp: order.delivery_code,
    kitchen_ready: !['placed', 'confirmed', 'preparing'].includes(order.status),
    ready_at: order.ready_at || null,
    pickup_grace_minutes: 15,
    pickup_due_at: order.ready_at ? new Date(new Date(order.ready_at).getTime() + 15 * 60_000).toISOString() : null,
    assigned_at: order.assigned_at || null,
    picked_up_at: order.picked_up_at || null,
    delivered_at: order.status === 'delivered' ? order.completed_at || order.created_at : null,
    completed_at: order.status === 'delivered' ? order.completed_at || order.created_at : null,
    created_at: order.created_at,
    items: order.items.map((item) => ({ ...item, options: [] })),
    status_history: history,
    order_progress: { status: order.status, label: STATUS_LABELS[order.status], history },
  };
}

function adminOrder(order) {
  const vendor = findVendor(order.vendor_id);
  const customer = findCustomer(order.customer_id);
  const driver = order.driver_id ? findDriver(order.driver_id) : null;
  return {
    id: order.id,
    order_number: order.order_number,
    created_at: order.created_at,
    status: order.status,
    status_label: STATUS_LABELS[order.status],
    fulfillment: order.fulfillment,
    fulfillment_label: order.fulfillment === 'pickup' ? 'Customer pickup' : 'Delivery',
    order_type: order.order_type,
    scheduled_for: order.scheduled_for,
    special_text: order.special_text,
    vendor: { id: vendor.id, name: vendor.name },
    customer: { id: customer?.id, name: customer?.name || 'Customer', phone_number: customer?.phone_number },
    driver: driver ? { id: driver.id, name: driver.name, phone: driver.phone } : null,
    payment_method: order.payment_method,
    payment_status: order.payment_status,
    subtotal_rwf: order.subtotal_rwf,
    delivery_fee_rwf: order.delivery_fee_rwf,
    total_amount_rwf: order.total_rwf,
    items: order.items.map((item) => ({ ...item, subtotal_rwf: item.price_rwf * item.quantity })),
    status_history: order.history.map((entry) => ({ label: STATUS_LABELS[entry.status], at: entry.at, note: entry.note || '' })),
    pickup: order.fulfillment === 'pickup'
      ? { code_sent_at: order.created_at, wrong_attempts: 0, max_attempts: 5, locked: false, collected_at: order.status === 'delivered' ? order.completed_at || order.created_at : null }
      : null,
  };
}

/* --------------------------------- auth ---------------------------------- */

function bearer(request) {
  const header = request.headers.Authorization || request.headers.authorization || '';
  return header.replace(/^Bearer\s+/i, '');
}

function signedIn(request, role) {
  const token = bearer(request);
  if (token !== TOKENS[role]) fail(401, 'Please sign in again.');
  return sessions[role] || DEMO_IDS[role];
}

const me = {
  customer: (request) => findCustomer(signedIn(request, 'customer')) || fail(401, 'Please sign in again.'),
  vendor: (request) => findVendor(signedIn(request, 'vendor')) || fail(401, 'Please sign in again.'),
  driver: (request) => findDriver(signedIn(request, 'driver')) || fail(401, 'Please sign in again.'),
};

function checkOtp(code) {
  if (String(code).trim() !== DEMO_OTP) fail(400, `Wrong code. In demo mode the code is ${DEMO_OTP}.`, 'OTP_INVALID');
}

function vendorAccount(vendor) {
  const withdrawn = withdrawnBy(`vendor:${vendor.id}`);
  const totals = vendorTotals(vendor);
  return {
    id: vendor.id,
    name: vendor.name,
    vendor_type: vendor.vendor_type,
    vendor_type_label: vendorTypeLabel(vendor.vendor_type),
    vendor_type_request: vendor.vendor_type_request || null,
    owner_name: vendor.owner_name,
    phone: vendor.phone,
    email: vendor.email || '',
    location: {
      address: vendor.address,
      neighborhood: vendor.neighborhood,
      latitude: vendor.latitude,
      longitude: vendor.longitude,
      updated_at: nowIso(),
      accuracy_m: 12,
    },
    description: vendor.description,
    profile_image_url: vendor.avatar,
    banner_image_url: vendor.banner,
    rating: vendor.rating,
    is_open: vendor.is_open,
    is_live: vendor.is_open,
    operating_hours: vendor.hours,
    food_categories: vendor.categories.map(categoryName),
    food_category_ids: vendor.categories,
    verification_status: vendor.status,
    payment_information: { method: 'mobile_money', phone: vendor.phone, account_name: vendor.owner_name },
    commission_percent: COMMISSION_PERCENT,
    created_at: vendor.created_at,
    available_balance_rwf: totals.net - withdrawn,
    total_sales_rwf: totals.sales,
  };
}

function driverAccount(driver) {
  const active = state.orders.filter((o) => o.driver_id === driver.id && ['assigned', 'picked_up', 'out_for_delivery'].includes(o.status));
  return {
    id: driver.id,
    name: driver.name,
    phone: driver.phone,
    email: driver.email || '',
    profile_image_url: '',
    vehicle_type: driver.vehicle_type,
    plate_number: driver.plate_number,
    rating: driver.rating,
    is_online: driver.is_online,
    is_available: driver.is_online && active.length < 3,
    status: driver.is_online ? (active.length ? 'busy' : 'available') : 'offline',
    active_deliveries_count: active.length,
    max_active_deliveries: 3,
    completed_deliveries: driver.completed_deliveries,
    total_earnings_rwf: driver.total_earnings_rwf,
    available_balance_rwf: driver.total_earnings_rwf - withdrawnBy(`driver:${driver.id}`),
    verification_status: driver.verification_status,
    current_location: { latitude: driver.latitude, longitude: driver.longitude, updated_at: nowIso() },
    created_at: driver.created_at,
  };
}


/* -------------------------------- money ---------------------------------- */

const withdrawnBy = (owner) =>
  state.withdrawals.filter((w) => w.owner === owner && w.status !== 'failed').reduce((sum, w) => sum + w.amount_rwf, 0);

function vendorTotals(vendor) {
  const delivered = state.orders.filter((o) => o.vendor_id === vendor.id && o.status === 'delivered');
  const sales = vendor.total_sales_rwf + delivered.reduce((sum, o) => sum + o.subtotal_rwf, 0);
  return { sales, net: Math.round((sales * (100 - COMMISSION_PERCENT)) / 100) };
}

function withdraw(owner, body, available) {
  const amount = Number(body.amount_rwf);
  if (!amount || amount < 1000) fail(400, 'The smallest withdrawal is 1,000 RWF.');
  if (amount > available) fail(400, 'That is more than your available balance.');
  const withdrawal = {
    id: nextId('wd'),
    owner,
    amount_rwf: amount,
    method: body.bank_name ? 'bank' : 'mobile_money',
    method_label: body.bank_name ? 'Bank transfer' : body.method || 'MTN Mobile Money',
    bank_name: body.bank_name || '',
    account_number: body.account_number || body.phone || '',
    status: 'processing',
    reference: `WD-${state.nextId}`,
    created_at: nowIso(),
  };
  state.withdrawals.unshift(withdrawal);
  return { withdrawal };
}

/* ------------------------------ chats/support ---------------------------- */

const visibleMessages = (chat) => chat.messages.filter((m) => new Date(m.created_at).getTime() <= Date.now());

function conversationFor(chat, side) {
  const messages = visibleMessages(chat);
  const last = messages.at(-1);
  const other = side === 'customer' ? findVendor(chat.vendor_id) : findCustomer(chat.customer_id);
  const unread = side === 'customer' ? !chat.read_by_customer : !chat.read_by_vendor;
  return {
    id: chat.id,
    with: {
      id: other?.id,
      name: other?.name || 'Customer',
      avatar_url: side === 'customer' ? other?.avatar : '',
      vendor_type: side === 'customer' ? other?.vendor_type : undefined,
    },
    last_message_preview: last?.body || '',
    last_message_at: last?.created_at || null,
    last_message_mine: last?.from === side,
    unread_count: unread && last && last.from !== side ? 1 : 0,
  };
}

function chatMessages(chat, side, query) {
  let messages = visibleMessages(chat);
  const after = query.get('after');
  const before = query.get('before');
  if (after) messages = messages.filter((m) => m.created_at > after);
  if (before) messages = messages.filter((m) => m.created_at < before);
  return { conversation: conversationFor(chat, side), messages: messages.map((m) => ({ id: m.id, body: m.body, created_at: m.created_at, mine: m.from === side })) };
}

function chatRoutes(side) {
  const prefix = side === 'customer' ? '/chats' : '/vendor/chats';
  const owns = (request, chat) =>
    side === 'customer' ? chat.customer_id === me.customer(request).id : chat.vendor_id === me.vendor(request).id;
  const mine = (request) => state.chats.filter((chat) => owns(request, chat));
  const get = (request, id) => mine(request).find((chat) => chat.id === id) || fail(404, 'Conversation not found.');
  return [
    ['GET', `${prefix}`, (r) => ({ conversations: mine(r).map((c) => conversationFor(c, side)).sort((a, b) => String(b.last_message_at).localeCompare(String(a.last_message_at))) })],
    ['GET', `${prefix}/unread-count`, (r) => ({ unread_count: mine(r).reduce((n, c) => n + conversationFor(c, side).unread_count, 0) })],
    ['GET', `${prefix}/:id`, (r, p) => chatMessages(get(r, p.id), side, r.query)],
    ['POST', `${prefix}/:id/read`, (r, p) => {
      get(r, p.id)[side === 'customer' ? 'read_by_customer' : 'read_by_vendor'] = true;
      return { ok: true };
    }],
    ['POST', `${prefix}/:id/messages`, (r, p) => {
      const chat = get(r, p.id);
      const body = String(r.body?.body || '').trim() || fail(400, 'Write a message first.');
      const message = { id: nextId('msg'), from: side, body, created_at: nowIso() };
      chat.messages.push(message);
      if (side === 'customer') {
        chat.read_by_vendor = false;
        // The kitchen answers a moment later (demo).
        chat.messages.push({ id: nextId('msg'), from: 'vendor', body: 'Thanks for your message! We’ll get back to you shortly. (demo reply)', created_at: new Date(Date.now() + 2500).toISOString() });
        chat.read_by_customer = false;
      } else {
        chat.read_by_customer = false;
      }
      return { message: { id: message.id, body, created_at: message.created_at, mine: true } };
    }],
  ];
}

function supportRoutes(role, prefix) {
  const owner = (request) => `${role}:${me[role](request).id}`;
  const view = (ticket) => {
    const messages = ticket.messages.filter((m) => new Date(m.at).getTime() <= Date.now());
    const last = messages.at(-1);
    return {
      id: ticket.id,
      reference: ticket.reference,
      subject: ticket.subject,
      category: ticket.category,
      status: ticket.status,
      status_label: ticket.status === 'open' ? 'Open' : 'Answered',
      last_message: last ? { from: last.from, body: last.body } : null,
      last_message_at: last?.at,
      unread: Boolean(last && last.from === 'support' && !ticket.read),
      messages,
    };
  };
  const mine = (request) => state.tickets.filter((t) => t.owner === owner(request));
  const get = (request, id) => {
    const ticket = mine(request).find((t) => t.id === id) || fail(404, 'Conversation not found.');
    ticket.read = true;
    return ticket;
  };
  const supportReply = () => ({ id: nextId('sm'), from: 'support', author_name: 'KitchenLink Support', body: 'Hi! Thanks for reaching out — a member of our team will reply here soon. (demo reply)', at: new Date(Date.now() + 3000).toISOString() });
  return [
    ['GET', prefix, (r) => ({ tickets: mine(r).map(view) })],
    ['GET', `${prefix}/unread-count`, (r) => ({ unread_count: mine(r).map(view).filter((t) => t.unread).length })],
    ['GET', `${prefix}/:id`, (r, p) => ({ ticket: view(get(r, p.id)) })],
    ['POST', prefix, (r) => {
      const message = String(r.body?.message || '').trim() || fail(400, 'Describe the problem first.');
      const ticket = {
        id: nextId('tk'),
        owner: owner(r),
        reference: `SUP-${state.nextId}`,
        subject: r.body.subject || 'Support request',
        category: r.body.category || 'other',
        status: 'open',
        read: true,
        messages: [{ id: nextId('sm'), from: 'you', author_name: 'You', body: message, at: nowIso() }, supportReply()],
      };
      state.tickets.unshift(ticket);
      return { ticket: view(ticket) };
    }],
    ['POST', `${prefix}/:id/messages`, (r, p) => {
      const ticket = get(r, p.id);
      ticket.messages.push({ id: nextId('sm'), from: 'you', author_name: 'You', body: String(r.body?.message || ''), at: nowIso() });
      return { ticket: view(ticket) };
    }],
  ];
}

function notificationRoutes(prefix, audience) {
  const mine = (request) => state.notifications.filter((n) => n.audience === audience(request));
  return [
    ['GET', prefix, (r) => {
      const list = mine(r).slice(0, Number(r.query.get('limit')) || 50);
      return { notifications: list, unread_count: mine(r).filter((n) => !n.read).length };
    }],
    ['POST', `${prefix}/read-all`, (r) => {
      mine(r).forEach((n) => { n.read = true; n.read_at = nowIso(); });
      return { ok: true };
    }],
    ['POST', `${prefix}/:id/read`, (r, p) => {
      const n = mine(r).find((entry) => entry.id === p.id);
      if (n) { n.read = true; n.read_at = nowIso(); }
      return { ok: true };
    }],
  ];
}

/* ------------------------------- customer -------------------------------- */

function cartView(customerId) {
  const cart = state.carts[customerId] || { vendor_id: null, items: [] };
  const vendor = cart.vendor_id ? findVendor(cart.vendor_id) : null;
  const items = cart.items
    .map((line) => ({ line, item: findItem(line.menu_item_id) }))
    .filter(({ item }) => item)
    .map(({ line, item }) => ({
      menu_item_id: item.id,
      name: item.name,
      price_rwf: item.price_rwf,
      image_url: item.image_url,
      quantity: line.quantity,
      vendor_id: item.vendor_id,
      vendor_name: vendor?.name,
      is_available: item.is_available,
    }));
  return {
    vendor: vendor ? { id: vendor.id, name: vendor.name, vendor_type: vendor.vendor_type, ordering: null } : null,
    items,
    subtotal_rwf: items.reduce((sum, item) => sum + item.price_rwf * item.quantity, 0),
    delivery_fee_rwf: vendor ? feeForKm(distanceKm(KIGALI, vendorPoint(vendor))) : 0,
  };
}

function setCartLines(customerId, lines) {
  const valid = lines.filter((line) => findItem(line.menu_item_id) && line.quantity > 0);
  const vendorId = valid.length ? findItem(valid[0].menu_item_id).vendor_id : null;
  state.carts[customerId] = {
    vendor_id: vendorId,
    items: valid
      .filter((line) => findItem(line.menu_item_id).vendor_id === vendorId)
      .map((line) => ({ menu_item_id: line.menu_item_id, quantity: Math.min(99, Number(line.quantity)) })),
  };
  return cartView(customerId);
}

function wishlistView(customerId) {
  return {
    items: (state.wishlists[customerId] || [])
      .map((entry) => ({ entry, item: findItem(entry.menu_item_id) }))
      .filter(({ item }) => item)
      .map(({ entry, item }) => {
        const vendor = findVendor(item.vendor_id);
        return {
          menu_item_id: item.id,
          name: item.name,
          price_rwf: item.price_rwf,
          image_url: item.image_url,
          is_available: item.is_available,
          vendor_id: vendor.id,
          vendor_name: vendor.name,
          vendor_type: vendorTypeLabel(vendor.vendor_type),
          vendor_neighborhood: vendor.neighborhood,
          added_at: entry.added_at,
        };
      }),
  };
}

function createOrderFromCart(customer, body) {
  const cart = cartView(customer.id);
  if (!cart.items.length) fail(400, 'Your basket is empty.');
  const vendor = findVendor(cart.vendor.id);
  if (!vendor.is_open) fail(400, `${vendor.name} is closed right now.`);
  const fulfillment = body.fulfillment === 'pickup' ? 'pickup' : 'delivery';
  const drop = body.delivery_location || {};
  const km = distanceKm(vendorPoint(vendor), { lat: drop.latitude ?? KIGALI.lat, lng: drop.longitude ?? KIGALI.lng });
  const fee = fulfillment === 'delivery' ? feeForKm(km) : 0;
  const seq = state.nextId + 1;
  const order = {
    id: nextId('ord'),
    order_number: `KL-${30000 + seq}`,
    created_at: nowIso(),
    status: 'placed',
    auto: true,
    customer_id: customer.id,
    vendor_id: vendor.id,
    driver_id: null,
    items: cart.items.map(({ menu_item_id, name, price_rwf, quantity, image_url }) => ({ menu_item_id, name, price_rwf, quantity, image_url })),
    subtotal_rwf: cart.subtotal_rwf,
    delivery_fee_rwf: fee,
    total_rwf: cart.subtotal_rwf + fee,
    payment_method: body.payment_method || 'mobile_money',
    payment_status: 'paid',
    fulfillment,
    order_type: body.order_type || 'immediate',
    scheduled_for: body.scheduled_for || null,
    special_text: body.special_text || '',
    delivery_location: fulfillment === 'delivery'
      ? {
          address: drop.address || drop.street || 'Kigali',
          neighborhood: drop.neighborhood || drop.district || '',
          note: drop.note || drop.instructions || '',
          latitude: drop.latitude ?? KIGALI.lat,
          longitude: drop.longitude ?? KIGALI.lng,
        }
      : null,
    pickup_code: String(100000 + Math.floor(Math.random() * 900000)),
    delivery_code: String(100000 + Math.floor(Math.random() * 900000)),
    cancel_reason: '',
    history: [{ status: 'placed', at: nowIso() }],
    rejected_by: [],
  };
  state.orders.unshift(order);
  state.carts[customer.id] = { vendor_id: null, items: [] };
  notify(`vendor:${vendor.id}`, 'new_order', 'New order', `${customer.name} placed an order (${order.order_number}).`);
  return customerOrder(order);
}

const KIGALI_PLACES = [
  ['Kimihurura', -1.9506, 30.0921], ['Remera', -1.9573, 30.1127], ['Kicukiro', -1.9706, 30.1044],
  ['Nyamirambo', -1.9789, 30.0446], ['Kiyovu', -1.9497, 30.0607], ['Kacyiru', -1.9367, 30.0874],
  ['Kimironko', -1.9349, 30.1263], ['Gikondo', -1.9772, 30.0731], ['Nyarugenge', -1.9460, 30.0580],
  ['Kibagabaga', -1.9290, 30.1110], ['Gisozi', -1.9180, 30.0640], ['Kanombe', -1.9700, 30.1400],
];

const customerRoutes = [
  ['POST', '/auth/send-otp', (r) => ({ phone_number: r.body.phone_number, dev_otp: DEMO_OTP, expires_in_seconds: 300 })],
  ['POST', '/auth/verify-otp', (r) => {
    checkOtp(r.body.code);
    const phone = String(r.body.phone_number || '');
    let customer = state.customers.find((c) => c.phone_number === phone);
    if (!customer) {
      customer = state.customers.find((c) => c.id === DEMO_IDS.customer);
      customer.phone_number = phone || customer.phone_number;
      if (r.body.name) customer.name = r.body.name;
    }
    sessions.customer = customer.id;
    return { token: TOKENS.customer, customer };
  }],
  ['POST', '/auth/logout', () => ({ ok: true })],
  ['GET', '/auth/me', (r) => ({ customer: me.customer(r) })],
  ['PATCH', '/auth/me/profile', (r) => {
    const customer = me.customer(r);
    ['name', 'phone_number', 'email', 'profile_image_url'].forEach((key) => {
      if (r.body[key] !== undefined) customer[key] = r.body[key];
    });
    if (r.body.profile_image_base64) customer.profile_image_url = r.body.profile_image_base64;
    return { customer };
  }],
  ['PUT', '/auth/me/location', () => ({ ok: true })],

  ['GET', '/home/categories', () => ({
    categories: state.categories.filter((c) => c.is_active).map((c) => ({ ...c, vendor_count: visibleVendors().filter((v) => v.categories.includes(c.id)).length })),
  })],
  ['GET', '/home/feed', (r) => {
    const from = coordsOf(r.query);
    const vendors = filterVendors(visibleVendors(), r.query);
    const open = vendors.filter((v) => v.is_open);
    return {
      location: from ? { ...from, label: r.query.get('label') || 'Your location' } : { ...KIGALI, label: 'Kigali' },
      categories: state.categories.filter((c) => c.is_active),
      featured_vendors: [...open].sort((a, b) => b.rating - a.rating).slice(0, 6).map((v) => publicVendor(v, from)),
      nearby_vendors: sortVendors(open, r.query, from || KIGALI).map((v) => publicVendor(v, from)),
      popular_dishes: liveItems().filter((item) => item.is_popular && open.some((v) => v.id === item.vendor_id)).slice(0, 12).map(publicDish),
      updated_at: nowIso(),
    };
  }],
  ['GET', '/home/vendors/nearby', (r) => {
    const from = coordsOf(r.query) || KIGALI;
    const radius = Number(r.query.get('radius')) || NEAR_RADIUS_KM;
    const list = sortVendors(
      filterVendors(visibleVendors(), r.query).filter((v) => v.is_open && distanceKm(from, vendorPoint(v)) <= radius),
      r.query,
      from,
    );
    const { page, limit, total, slice } = paginate(list, r.query, 6);
    return { vendors: slice.map((v) => publicVendor(v, from)), meta: { page, limit, total, offset: (page - 1) * limit, radius_km: radius } };
  }],
  ['GET', '/home/vendors', (r) => {
    const from = coordsOf(r.query);
    // Big events: only kitchens with an event package that fits the guests.
    const events = r.query.get('events') ? eventVendors(r.query, from) : null;
    const list = events || sortVendors(filterVendors(visibleVendors(), r.query), r.query, from);
    const { page, limit, total, slice } = paginate(list, r.query, 9);
    return {
      vendors: events ? slice : slice.map((v) => publicVendor(v, from)),
      meta: {
        page,
        limit,
        total,
        nearby_total: from ? list.filter((v) => distanceKm(from, vendorPoint(v)) <= NEAR_RADIUS_KM).length : 0,
        near_radius_km: NEAR_RADIUS_KM,
        location_used: Boolean(from),
      },
    };
  }],
  ['GET', '/home/vendors/map', (r) => {
    const from = coordsOf(r.query);
    const list = filterVendors(visibleVendors(), r.query).filter((v) => v.is_open);
    return { vendors: sortVendors(list, r.query, from).map((v) => publicVendor(v, from)) };
  }],
  ['GET', '/home/search', (r) => {
    const q = String(r.query.get('q') || '').trim().toLowerCase();
    const from = coordsOf(r.query);
    const dishes = liveItems().filter((item) => matches(item.name, q) || matches(item.description, q) || matches(categoryName(item.category_id), q));
    const vendors = visibleVendors().filter(
      (v) => matches(v.name, q) || matches(v.description, q) || matches(vendorTypeLabel(v.vendor_type), q) || v.categories.some((c) => matches(categoryName(c), q)),
    );
    return {
      query: q,
      dishes: dishes.map(publicDish),
      vendors: vendors.map((v) => publicVendor(v, from)),
      counts: { dishes: dishes.length, vendors: vendors.length },
    };
  }],

  ['GET', '/vendors/types', () => ({ types: VENDOR_TYPES.map(({ code, label, description }) => ({ code, label, description })) })],
  ['GET', '/vendors/specials', (r) => {
    const from = coordsOf(r.query);
    return {
      specials: Object.keys(state.specials)
        .map(findVendor)
        .filter((v) => v && v.status === 'approved' && state.specials[v.id]?.is_active)
        .map((v) => publicVendor(v, from)),
    };
  }],
  ['GET', '/vendors/offers', (r) => {
    const from = coordsOf(r.query);
    return {
      offers: state.offers
        .filter((o) => findVendor(o.vendor_id)?.status === 'approved')
        .sort((a, b) => a.offer_date.localeCompare(b.offer_date))
        .map((o) => ({ ...o, vendor: publicVendor(findVendor(o.vendor_id), from) })),
    };
  }],
  ['GET', '/vendors/:id', (r, p) => {
    const vendor = findVendor(p.id);
    if (!vendor || vendor.status !== 'approved') fail(404, 'This kitchen is not on KitchenLink.');
    const items = state.menuItems.filter((item) => item.vendor_id === vendor.id);
    const groups = [...new Set(items.map((item) => categoryName(item.category_id)))];
    return {
      ...publicVendor(vendor),
      location: { neighborhood: vendor.neighborhood, address: vendor.address, latitude: vendor.latitude, longitude: vendor.longitude },
      menu_categories: groups,
      menu: groups.map((category) => ({ category, items: items.filter((item) => categoryName(item.category_id) === category).map(publicDish) })),
    };
  }],
  ['GET', '/vendors/:id/delivery-quote', (r, p) => {
    const vendor = findVendor(p.id) || fail(404, 'Kitchen not found.');
    const km = distanceKm(vendorPoint(vendor), coordsOf(r.query) || KIGALI);
    return { delivery_fee_rwf: feeForKm(km), distance_km: km, duration_minutes: Math.round(8 + km * 3), distance_source: 'estimate' };
  }],

  ['GET', '/banks', () => ({
    banks: state.banks.map((bank) => ({
      name: bank.name,
      min: bank.digits_min ?? 6,
      max: bank.digits_max ?? 30,
      exact: bank.digits_min != null && bank.digits_min === bank.digits_max,
    })),
    general: { min: 6, max: 30, exact: false },
  })],
  ['GET', '/geo/places/autocomplete', (r) => {
    const q = String(r.query.get('q') || '').toLowerCase();
    return {
      suggestions: KIGALI_PLACES.filter(([name]) => matches(name, q)).slice(0, 6).map(([name, lat, lng]) => ({
        id: `place-${name.toLowerCase()}`, name, secondary: 'Kigali, Rwanda', kind: 'area', lat, lng, bounds: [lng - 0.01, lat - 0.01, lng + 0.01, lat + 0.01],
      })),
    };
  }],
  ['GET', '/geo/places/details', (r) => {
    const place = KIGALI_PLACES.find(([name]) => `place-${name.toLowerCase()}` === r.query.get('id')) || fail(404, 'Place not found.');
    const [name, lat, lng] = place;
    return { id: r.query.get('id'), name, kind: 'area', lat, lng, bounds: [lng - 0.01, lat - 0.01, lng + 0.01, lat + 0.01], zone: null };
  }],
  ['GET', '/geo/places/reverse', (r) => {
    const at = coordsOf(r.query) || KIGALI;
    const [area] = [...KIGALI_PLACES].sort((a, b) => distanceKm(at, { lat: a[1], lng: a[2] }) - distanceKm(at, { lat: b[1], lng: b[2] }))[0];
    return { area, street: '' };
  }],

  ['GET', '/cart', (r) => cartView(me.customer(r).id)],
  ['PUT', '/cart', (r) => setCartLines(me.customer(r).id, r.body.items || [])],
  ['DELETE', '/cart', (r) => setCartLines(me.customer(r).id, [])],
  ['POST', '/cart', (r) => {
    const customer = me.customer(r);
    const item = findItem(r.body.menu_item_id) || fail(404, 'That dish is no longer on the menu.');
    const cart = state.carts[customer.id] || { vendor_id: null, items: [] };
    // A basket holds one kitchen at a time: a dish from another kitchen starts a new basket.
    const lines = cart.vendor_id === item.vendor_id ? [...cart.items] : [];
    const line = lines.find((l) => l.menu_item_id === item.id);
    if (line) line.quantity += Number(r.body.quantity) || 1;
    else lines.push({ menu_item_id: item.id, quantity: Number(r.body.quantity) || 1 });
    return setCartLines(customer.id, lines);
  }],
  ['PATCH', '/cart/:id', (r, p) => {
    const customer = me.customer(r);
    const lines = (state.carts[customer.id]?.items || []).map((l) => (l.menu_item_id === p.id ? { ...l, quantity: Number(r.body.quantity) } : l));
    return setCartLines(customer.id, lines);
  }],
  ['DELETE', '/cart/:id', (r, p) => {
    const customer = me.customer(r);
    return setCartLines(customer.id, (state.carts[customer.id]?.items || []).filter((l) => l.menu_item_id !== p.id));
  }],

  ['GET', '/wishlist', (r) => wishlistView(me.customer(r).id)],
  ['POST', '/wishlist', (r) => {
    const customer = me.customer(r);
    const list = (state.wishlists[customer.id] = state.wishlists[customer.id] || []);
    if (!list.some((e) => e.menu_item_id === r.body.menu_item_id)) list.unshift({ menu_item_id: r.body.menu_item_id, added_at: nowIso() });
    return wishlistView(customer.id);
  }],
  ['DELETE', '/wishlist/:id', (r, p) => {
    const customer = me.customer(r);
    state.wishlists[customer.id] = (state.wishlists[customer.id] || []).filter((e) => e.menu_item_id !== p.id);
    return wishlistView(customer.id);
  }],

  ['GET', '/orders/payment-methods', () => ({
    methods: [
      { code: 'mobile_money', label: 'Mobile Money', enabled: true },
      { code: 'card', label: 'Cards', enabled: true },
      { code: 'ekash', label: 'eKash', enabled: true },
      { code: 'wallet', label: 'Wallet', enabled: true },
    ],
  })],
  ['GET', '/orders/refunds', (r) => {
    me.customer(r);
    return { refunds: [] };
  }],
  ['POST', '/orders/checkout', (r) => createOrderFromCart(me.customer(r), r.body)],
  ['GET', '/orders', (r) => {
    const customer = me.customer(r);
    const list = state.orders.filter((o) => o.customer_id === customer.id);
    const { page, limit, total, slice } = paginate(list, r.query, 50);
    return { orders: slice.map(customerOrder), meta: { page, limit, total } };
  }],
  ['GET', '/orders/:id', (r, p) => customerOrder(customerOwned(r, p.id))],
  ['GET', '/orders/:id/track', (r, p) => customerOrder(customerOwned(r, p.id))],
  ['POST', '/orders/:id/pay', (r, p) => {
    const order = customerOwned(r, p.id);
    order.payment_status = 'paid';
    return customerOrder(order);
  }],
  ['POST', '/orders/:id/cancel', (r, p) => {
    const order = customerOwned(r, p.id);
    if (!['placed', 'confirmed', 'preparing', 'ready'].includes(order.status)) fail(400, 'This order can no longer be cancelled.');
    order.auto = false;
    order.cancel_reason = r.body?.reason || 'Cancelled by the customer';
    setStatus(order, 'cancelled', order.cancel_reason);
    return customerOrder(order);
  }],

  ...notificationRoutes('/notifications', (r) => `customer:${me.customer(r).id}`),
  ...chatRoutes('customer'),
  ['POST', '/chats/with/:vendorId', (r, p) => {
    const customer = me.customer(r);
    findVendor(p.vendorId) || fail(404, 'Kitchen not found.');
    // Customers can only message kitchens they have placed an order with.
    if (!state.orders.some((o) => o.customer_id === customer.id && o.vendor_id === p.vendorId)) {
      fail(403, 'Place an order with this kitchen first, then you can message it.', 'NO_ORDER_WITH_VENDOR');
    }
    let chat = state.chats.find((c) => c.customer_id === customer.id && c.vendor_id === p.vendorId);
    if (!chat) {
      chat = { id: nextId('chat'), customer_id: customer.id, vendor_id: p.vendorId, messages: [], read_by_customer: true, read_by_vendor: true };
      state.chats.unshift(chat);
    }
    return { conversation: conversationFor(chat, 'customer') };
  }],
  ...supportRoutes('customer', '/support'),
];

function customerOwned(request, id) {
  const customer = me.customer(request);
  const order = findOrder(id);
  if (order.customer_id !== customer.id) fail(404, 'Order not found.');
  return order;
}

/* -------------------------------- vendor --------------------------------- */

const vendorOrders = (vendor) => state.orders.filter((o) => o.vendor_id === vendor.id);

function rawMenuItem(item) {
  return {
    id: item.id,
    name: item.name,
    category: { id: item.category_id, name: categoryName(item.category_id) },
    price_rwf: item.price_rwf,
    preparation_time_minutes: item.preparation_time_minutes,
    description: item.description,
    image_url: item.image_url,
    is_available: item.is_available,
    is_preorder: item.is_preorder,
    preorder_cutoff: item.preorder_cutoff,
    is_popular: item.is_popular,
    options: item.options,
  };
}

/** Reads the dashboard's multipart menu form into a menu item patch. */
function menuPatch(form) {
  const get = (key) => (form?.get ? form.get(key) : form?.[key]);
  const patch = {};
  ['name', 'description', 'preorder_cutoff'].forEach((key) => {
    if (get(key) != null) patch[key] = String(get(key));
  });
  if (get('price_rwf') != null) patch.price_rwf = Number(get('price_rwf'));
  if (get('preparation_time_minutes') != null) patch.preparation_time_minutes = Number(get('preparation_time_minutes'));
  ['is_available', 'is_preorder', 'is_popular'].forEach((key) => {
    if (get(key) != null) patch[key] = String(get(key)) === 'true';
  });
  if (get('category_id')) patch.category_id = String(get('category_id'));
  try {
    if (get('options')) patch.options = JSON.parse(get('options'));
  } catch {
    /* keep the old options */
  }
  const image = get('image');
  if (image && typeof image === 'object') patch.image_url = URL.createObjectURL(image);
  else if (get('image_url')) patch.image_url = String(get('image_url'));
  if (String(get('image_clear')) === 'true') patch.image_url = '';
  return patch;
}

function vendorDashboard(vendor) {
  const orders = vendorOrders(vendor);
  const count = (statuses) => orders.filter((o) => statuses.includes(VENDOR_STATUS[o.status])).length;
  const today = orders.filter((o) => isToday(o.created_at));
  const totals = vendorTotals(vendor);
  const withdrawn = withdrawnBy(`vendor:${vendor.id}`);
  return {
    today_orders: today.length,
    new_orders: count(['new']),
    preparing_orders: count(['accepted', 'preparing']),
    ready_orders: count(['ready']),
    completed_orders_total: count(['completed']),
    cancelled_orders: count(['cancelled']),
    today_sales_rwf: today.filter((o) => o.status !== 'cancelled').reduce((sum, o) => sum + o.subtotal_rwf, 0),
    total_sales_rwf: totals.sales,
    commission_percent: COMMISSION_PERCENT,
    net_earned_rwf: totals.net,
    available_balance_rwf: totals.net - withdrawn,
    pending_balance_rwf: orders.filter((o) => OPEN.includes(o.status)).reduce((sum, o) => sum + moneySplit(o).payout, 0),
    withdrawn_rwf: withdrawn,
  };
}

function vendorOwned(request, id) {
  const vendor = me.vendor(request);
  const order = findOrder(id);
  if (order.vendor_id !== vendor.id) fail(404, 'Order not found.');
  return order;
}

const vendorRoutes = [
  ['POST', '/vendor/auth/send-otp', (r) => ({ phone_number: r.body.phone, dev_otp: DEMO_OTP })],
  ['POST', '/vendor/auth/verify-otp', (r) => {
    checkOtp(r.body.code);
    const vendor = state.vendors.find((v) => v.phone === r.body.phone) || findVendor(DEMO_IDS.vendor);
    sessions.vendor = vendor.id;
    return { token: TOKENS.vendor, vendor: vendorAccount(vendor) };
  }],
  ['POST', '/vendor/auth/logout', () => ({ ok: true })],
  ['POST', '/vendor/auth/register', (r) => {
    const form = r.body;
    const get = (key) => (form?.get ? form.get(key) : form?.[key]);
    const phone = String(get('phone') || '');
    if (state.vendors.some((v) => v.phone === phone)) fail(409, 'A kitchen with this phone number already exists.');
    const vendor = {
      ...findVendor(DEMO_IDS.vendor),
      id: nextId('v'),
      name: String(get('name') || 'New Kitchen'),
      owner_name: String(get('owner_name') || ''),
      phone,
      email: String(get('email') || ''),
      vendor_type: String(get('vendor_type') || 'restaurant'),
      description: String(get('description') || ''),
      categories: [],
      // Approved straight away so the demo can carry on into the dashboard.
      status: 'approved',
      total_sales_rwf: 0,
      rating: 0,
      reviews_count: 0,
      is_open: false,
      created_at: nowIso(),
    };
    state.vendors.push(vendor);
    notify('admin', 'vendor_registered', 'New kitchen registered', `${vendor.name} signed up.`);
    return { vendor: vendorAccount(vendor) };
  }],
  ['GET', '/vendor/auth/me', (r) => ({ vendor: vendorAccount(me.vendor(r)) })],
  ['GET', '/vendor/dashboard', (r) => vendorDashboard(me.vendor(r))],
  ['PATCH', '/vendor/profile', (r) => {
    const vendor = me.vendor(r);
    const b = r.body || {};
    ['name', 'owner_name', 'description', 'phone', 'email'].forEach((key) => {
      if (b[key] !== undefined) vendor[key] = b[key];
    });
    if (b.profile_image_base64) vendor.avatar = b.profile_image_base64;
    if (b.banner_image_base64) vendor.banner = b.banner_image_base64;
    if (b.location) {
      vendor.address = b.location.address ?? vendor.address;
      vendor.neighborhood = b.location.neighborhood ?? vendor.neighborhood;
      vendor.latitude = b.location.latitude ?? vendor.latitude;
      vendor.longitude = b.location.longitude ?? vendor.longitude;
    }
    if (Array.isArray(b.operating_hours)) vendor.hours = b.operating_hours;
    if (Array.isArray(b.food_category_ids)) vendor.categories = b.food_category_ids;
    return { vendor: vendorAccount(vendor) };
  }],
  ['POST', '/vendor/profile/type-request', (r) => {
    const vendor = me.vendor(r);
    vendor.vendor_type_request = {
      vendor_type: r.body.vendor_type,
      vendor_type_label: vendorTypeLabel(r.body.vendor_type),
      reason: r.body.reason || '',
      requested_at: nowIso(),
    };
    return { vendor: vendorAccount(vendor) };
  }],
  ['DELETE', '/vendor/profile/type-request', (r) => {
    const vendor = me.vendor(r);
    vendor.vendor_type_request = null;
    return { vendor: vendorAccount(vendor) };
  }],
  ['PATCH', '/vendor/availability', (r) => {
    const vendor = me.vendor(r);
    if (typeof r.body.is_open === 'boolean') vendor.is_open = r.body.is_open;
    if (r.body.latitude != null) {
      vendor.latitude = r.body.latitude;
      vendor.longitude = r.body.longitude;
    }
    return { vendor: vendorAccount(vendor) };
  }],
  ...notificationRoutes('/vendor/notifications', (r) => `vendor:${me.vendor(r).id}`),
  ...chatRoutes('vendor'),
  ...supportRoutes('vendor', '/vendor/support'),

  ['GET', '/vendor/menu', (r) => {
    const vendor = me.vendor(r);
    const items = state.menuItems.filter((item) => item.vendor_id === vendor.id).map(rawMenuItem);
    return { items, meta: { page: 1, limit: items.length, total: items.length } };
  }],
  ['POST', '/vendor/menu', (r) => {
    const vendor = me.vendor(r);
    const patch = menuPatch(r.body);
    if (!patch.name) fail(400, 'Give the dish a name.');
    const item = {
      id: nextId('m'),
      vendor_id: vendor.id,
      description: '',
      price_rwf: 0,
      category_id: vendor.categories[0] || state.categories[0].id,
      image_url: '',
      is_available: true,
      is_popular: false,
      is_preorder: false,
      preorder_cutoff: '',
      preparation_time_minutes: 20,
      options: [],
      ...patch,
    };
    state.menuItems.push(item);
    return { item: rawMenuItem(item) };
  }],
  ['PUT', '/vendor/menu/:id', (r, p) => {
    const vendor = me.vendor(r);
    const item = state.menuItems.find((m) => m.id === p.id && m.vendor_id === vendor.id) || fail(404, 'Dish not found.');
    Object.assign(item, menuPatch(r.body));
    return { item: rawMenuItem(item) };
  }],
  ['DELETE', '/vendor/menu/:id', (r, p) => {
    const vendor = me.vendor(r);
    state.menuItems = state.menuItems.filter((m) => !(m.id === p.id && m.vendor_id === vendor.id));
    return { ok: true };
  }],
  ['PATCH', '/vendor/menu/:id/availability', (r, p) => {
    const vendor = me.vendor(r);
    const item = state.menuItems.find((m) => m.id === p.id && m.vendor_id === vendor.id) || fail(404, 'Dish not found.');
    item.is_available = Boolean(r.body.is_available);
    return { item: rawMenuItem(item) };
  }],
  ['POST', '/vendor/menu/categories', (r) => {
    me.vendor(r);
    const name = String(r.body.name || '').trim() || fail(400, 'Name the category.');
    let category = state.categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (!category) {
      category = { id: nextId('cat'), name, slug: name.toLowerCase(), icon_url: '🍽️', description: '', sort_order: state.categories.length, is_active: true, created_by_vendor: true };
      state.categories.push(category);
    }
    return { category };
  }],

  ['GET', '/vendor/orders', (r) => {
    const vendor = me.vendor(r);
    return { orders: vendorOrders(vendor).map(vendorOrder) };
  }],
  ['PATCH', '/vendor/orders/:id/status', (r, p) => {
    const order = vendorOwned(r, p.id);
    const next = r.body.status;
    if (!(VENDOR_NEXT[VENDOR_STATUS[order.status]] || []).includes(next) && next !== 'completed') {
      fail(400, 'This order cannot move to that status now.');
    }
    order.auto = false;
    const status = { accepted: 'confirmed', preparing: 'preparing', ready: 'ready', cancelled: 'cancelled', completed: 'delivered' }[next];
    if (status === 'cancelled') order.cancel_reason = 'Declined by the kitchen';
    setStatus(order, status);
    if (status === 'ready' && order.fulfillment === 'delivery') {
      notify(`driver:${DEMO_IDS.driver}`, 'delivery_offer', 'New delivery near you', `${findVendor(order.vendor_id).name} has an order ready (${order.order_number}).`);
    }
    return { order: vendorOrder(order) };
  }],
  ['POST', '/vendor/orders/:id/collect', (r, p) => {
    const order = vendorOwned(r, p.id);
    if (String(r.body.pickup_code).trim() !== order.pickup_code) {
      fail(400, `That code doesn't match. (Demo: the customer's code is ${order.pickup_code}.)`);
    }
    order.auto = false;
    setStatus(order, 'delivered', 'Collected at the kitchen');
    return { order: vendorOrder(order) };
  }],

  ['GET', '/vendor/special', (r) => ({ special: state.specials[me.vendor(r).id] || null })],
  ['PUT', '/vendor/special', (r) => {
    const vendor = me.vendor(r);
    state.specials[vendor.id] = { ...r.body, is_active: true, is_orderable: true, updated_at: nowIso() };
    return { special: state.specials[vendor.id] };
  }],
  ['DELETE', '/vendor/special', (r) => {
    delete state.specials[me.vendor(r).id];
    return { special: null };
  }],
  ['GET', '/vendor/offers', (r) => ({ offers: state.offers.filter((o) => o.vendor_id === me.vendor(r).id) })],
  ['POST', '/vendor/offers', (r) => {
    const vendor = me.vendor(r);
    const offer = { id: nextId('off'), vendor_id: vendor.id, title: r.body.title, details: r.body.details || '', offer_date: r.body.offer_date };
    state.offers.push(offer);
    return { offer };
  }],
  ['DELETE', '/vendor/offers/:id', (r, p) => {
    const vendor = me.vendor(r);
    state.offers = state.offers.filter((o) => !(o.id === p.id && o.vendor_id === vendor.id));
    return { ok: true };
  }],
  ['GET', '/vendor/ordering', (r) => {
    me.vendor(r);
    return { ordering: null };
  }],
  ['PUT', '/vendor/ordering', (r) => {
    me.vendor(r);
    return { ordering: null };
  }],

  ['GET', '/vendor/wallet', (r) => {
    const vendor = me.vendor(r);
    const totals = vendorTotals(vendor);
    const withdrawn = withdrawnBy(`vendor:${vendor.id}`);
    return {
      total_sales_rwf: totals.sales,
      net_earned_rwf: totals.net,
      withdrawn_rwf: withdrawn,
      available_balance_rwf: totals.net - withdrawn,
      payout_phone: vendor.phone,
      payout_name: vendor.owner_name,
      withdrawals: state.withdrawals.filter((w) => w.owner === `vendor:${vendor.id}`),
    };
  }],
  ['POST', '/vendor/wallet/withdrawals', (r) => {
    const vendor = me.vendor(r);
    return withdraw(`vendor:${vendor.id}`, r.body, vendorTotals(vendor).net - withdrawnBy(`vendor:${vendor.id}`));
  }],
];

/* -------------------------------- driver --------------------------------- */

const driverPoint = (driver) => (driver.latitude != null ? { lat: driver.latitude, lng: driver.longitude } : null);
const ACTIVE_DRIVER = ['assigned', 'picked_up', 'out_for_delivery'];

function driverOwned(request, deliveryId) {
  const driver = me.driver(request);
  const order = findOrder(String(deliveryId).replace(/^del-/, ''));
  return { driver, order };
}

function driverEarnings(driver) {
  const done = state.orders.filter((o) => o.driver_id === driver.id && o.status === 'delivered');
  const earned = (o) => Math.round((o.delivery_fee_rwf * DRIVER_SHARE_PERCENT) / 100);
  const today = done.filter((o) => isToday(o.completed_at || o.created_at));
  return { done, today, earned };
}

const driverRoutes = [
  ['POST', '/driver/auth/send-otp', (r) => ({ phone_number: r.body.phone, dev_otp: DEMO_OTP })],
  ['POST', '/driver/auth/verify-otp', (r) => {
    checkOtp(r.body.code);
    const driver = state.drivers.find((d) => d.phone === r.body.phone) || findDriver(DEMO_IDS.driver);
    sessions.driver = driver.id;
    return { token: TOKENS.driver, driver: driverAccount(driver) };
  }],
  ['POST', '/driver/auth/logout', () => ({ ok: true })],
  ['POST', '/driver/auth/register', (r) => {
    if (state.drivers.some((d) => d.phone === r.body.phone)) fail(409, 'A delivery worker with this phone number already exists.');
    const driver = {
      id: nextId('drv'),
      name: r.body.name,
      phone: r.body.phone,
      email: r.body.email || '',
      vehicle_type: r.body.vehicle_type || 'motorcycle',
      plate_number: r.body.plate_number || '',
      rating: 5,
      is_online: false,
      verification_status: 'approved',
      completed_deliveries: 0,
      total_earnings_rwf: 0,
      latitude: KIGALI.lat,
      longitude: KIGALI.lng,
      created_at: nowIso(),
    };
    state.drivers.push(driver);
    return { driver: driverAccount(driver) };
  }],
  ['GET', '/driver/auth/me', (r) => ({ driver: driverAccount(me.driver(r)) })],
  ['PATCH', '/driver/profile', (r) => {
    const driver = me.driver(r);
    ['name', 'phone', 'email', 'vehicle_type', 'plate_number'].forEach((key) => {
      if (r.body[key] !== undefined) driver[key] = r.body[key];
    });
    return { driver: driverAccount(driver) };
  }],
  ['PATCH', '/driver/availability', (r) => {
    const driver = me.driver(r);
    driver.is_online = Boolean(r.body.is_online);
    return { driver: driverAccount(driver), reassigned_deliveries: 0 };
  }],
  ['PATCH', '/driver/location', (r) => {
    const driver = me.driver(r);
    if (r.body.latitude != null) {
      driver.latitude = r.body.latitude;
      driver.longitude = r.body.longitude;
    }
    return { ok: true };
  }],
  ['GET', '/driver/stats', (r) => {
    const driver = me.driver(r);
    const account = driverAccount(driver);
    const { today, earned } = driverEarnings(driver);
    return {
      active_deliveries: account.active_deliveries_count,
      completed_today: today.length,
      earnings_today_rwf: today.reduce((sum, o) => sum + earned(o), 0),
      completed_total: driver.completed_deliveries,
      earnings_total_rwf: driver.total_earnings_rwf,
      rating: driver.rating,
      is_online: driver.is_online,
      status: account.status,
    };
  }],
  ['GET', '/driver/deliveries/available', (r) => {
    const driver = me.driver(r);
    if (!driver.is_online) return { deliveries: [] };
    const from = coordsOf(r.query) || driverPoint(driver);
    return {
      deliveries: state.orders
        .filter((o) => o.fulfillment === 'delivery' && o.status === 'ready' && !o.driver_id && !o.rejected_by.includes(driver.id))
        .map((o) => delivery(o, from)),
    };
  }],
  ['GET', '/driver/deliveries/active', (r) => {
    const driver = me.driver(r);
    const order = state.orders.find((o) => o.driver_id === driver.id && ACTIVE_DRIVER.includes(o.status));
    return { delivery: order ? delivery(order, driverPoint(driver)) : null };
  }],
  ['GET', '/driver/deliveries/history', (r) => {
    const driver = me.driver(r);
    return { deliveries: state.orders.filter((o) => o.driver_id === driver.id && ['delivered', 'cancelled'].includes(o.status)).map((o) => delivery(o)) };
  }],
  ['GET', '/driver/deliveries/earnings', (r) => {
    const driver = me.driver(r);
    const { done, today, earned } = driverEarnings(driver);
    return {
      today_rwf: today.reduce((sum, o) => sum + earned(o), 0),
      today_deliveries: today.length,
      total_rwf: driver.total_earnings_rwf,
      total_deliveries: driver.completed_deliveries,
      share_percent: DRIVER_SHARE_PERCENT,
      rating: driver.rating,
      deliveries: done.map((o) => delivery(o)),
      meta: { page: 1, limit: done.length, total: done.length },
    };
  }],
  ['POST', '/driver/deliveries/:id/accept', (r, p) => {
    const { driver, order } = driverOwned(r, p.id);
    if (order.driver_id && order.driver_id !== driver.id) fail(409, `Order ${order.order_number} has already been assigned to another delivery worker.`);
    order.auto = false;
    order.driver_id = driver.id;
    setStatus(order, 'assigned');
    return { delivery: delivery(order, driverPoint(driver)) };
  }],
  ['POST', '/driver/deliveries/:id/reject', (r, p) => {
    const { driver, order } = driverOwned(r, p.id);
    order.rejected_by.push(driver.id);
    return { ok: true };
  }],
  ['PATCH', '/driver/deliveries/:id/status', (r, p) => {
    const { driver, order } = driverOwned(r, p.id);
    if (order.driver_id !== driver.id) fail(403, 'This delivery is not yours.');
    if (!(DRIVER_NEXT[deliveryStatusOf(order)] || []).includes(r.body.status)) fail(400, 'This delivery cannot move to that status now.');
    order.auto = false;
    setStatus(order, r.body.status);
    return { delivery: delivery(order, driverPoint(driver)) };
  }],
  ['POST', '/driver/deliveries/:id/confirm-delivery', (r, p) => {
    const { driver, order } = driverOwned(r, p.id);
    if (order.driver_id !== driver.id) fail(403, 'This delivery is not yours.');
    if (String(r.body.otp_code || '').trim() !== order.delivery_code) {
      fail(400, `Wrong code. (Demo: the customer's code is ${order.delivery_code}.)`);
    }
    order.auto = false;
    setStatus(order, 'delivered', 'Delivered with the customer’s code');
    const earned = Math.round((order.delivery_fee_rwf * DRIVER_SHARE_PERCENT) / 100);
    driver.completed_deliveries += 1;
    driver.total_earnings_rwf += earned;
    return { earned_rwf: earned, delivery: delivery(order) };
  }],
  ...notificationRoutes('/driver/notifications', (r) => `driver:${me.driver(r).id}`),
  ...supportRoutes('driver', '/driver/support'),
  ['GET', '/driver/wallet', (r) => {
    const driver = me.driver(r);
    const owner = `driver:${driver.id}`;
    const processing = state.withdrawals.filter((w) => w.owner === owner && w.status === 'processing').reduce((sum, w) => sum + w.amount_rwf, 0);
    const withdrawn = withdrawnBy(owner);
    return {
      available_balance_rwf: driver.total_earnings_rwf - withdrawn,
      total_earnings_rwf: driver.total_earnings_rwf,
      withdrawn_rwf: withdrawn - processing,
      processing_rwf: processing,
      payout_phone: driver.phone,
      payout_name: driver.name,
      withdrawals: state.withdrawals.filter((w) => w.owner === owner),
    };
  }],
  ['POST', '/driver/wallet/withdrawals', (r) => {
    const driver = me.driver(r);
    const owner = `driver:${driver.id}`;
    return withdraw(owner, r.body, driver.total_earnings_rwf - withdrawnBy(owner));
  }],
];

/* --------------------------------- admin --------------------------------- */

const admin = (request) => {
  signedIn(request, 'admin');
  return adminProfile();
};

function adminList(list, query) {
  const { page, limit, total, slice } = paginate(list, query, 20);
  return { items: slice, page, limit, total };
}

function adminVendor(vendor) {
  return {
    id: vendor.id,
    name: vendor.name,
    owner_name: vendor.owner_name,
    vendor_type: vendor.vendor_type,
    vendor_type_label: vendorTypeLabel(vendor.vendor_type),
    vendor_type_request: vendor.vendor_type_request || null,
    phone: vendor.phone,
    email: vendor.email || '',
    description: vendor.description,
    neighborhood: vendor.neighborhood,
    address: vendor.address,
    location: { address: vendor.address, neighborhood: vendor.neighborhood, latitude: vendor.latitude, longitude: vendor.longitude },
    status: vendor.status,
    is_open: vendor.is_open,
    rating: vendor.rating,
    total_sales_rwf: vendorTotals(vendor).sales,
    commission_percent: COMMISSION_PERCENT,
    nationwide: { enabled: Boolean(state.nationwide[vendor.id]?.enabled ?? vendor.vendor_type === 'caterer'), default: vendor.vendor_type === 'caterer' },
    verification_documents: [],
    documents_reviewed_at: vendor.status === 'approved' ? vendor.created_at : null,
    created_at: vendor.created_at,
  };
}

function adminDriver(driver) {
  const account = driverAccount(driver);
  return {
    id: driver.id,
    name: driver.name,
    phone: driver.phone,
    email: driver.email || '',
    vehicle_type: driver.vehicle_type,
    plate_number: driver.plate_number,
    verification_status: driver.verification_status,
    status: driver.verification_status,
    is_online: driver.is_online,
    rating: driver.rating,
    active_deliveries_count: account.active_deliveries_count,
    completed_deliveries: driver.completed_deliveries,
    total_earnings_rwf: driver.total_earnings_rwf,
    location: { latitude: driver.latitude, longitude: driver.longitude, updated_at: driver.latitude != null ? nowIso() : null, counts_for_dispatch: driver.is_online },
    created_at: driver.created_at,
  };
}

const counts = (list, key) => list.reduce((acc, item) => ({ ...acc, [item[key]]: (acc[item[key]] || 0) + 1 }), {});

const searchFilter = (list, query, fields) => {
  const q = String(query.get('search') || '').trim().toLowerCase();
  return q ? list.filter((item) => fields.some((field) => matches(item[field], q))) : list;
};

function adminUsers() {
  return [
    ...state.customers.map((c) => ({ id: c.id, role: 'customer', name: c.name, identifier: c.phone_number, secondary: c.email || '', status: c.status, avatar_url: '', last_location: null, created_at: c.created_at })),
    ...state.vendors.map((v) => ({ id: v.id, role: 'vendor', name: v.name, identifier: v.phone, secondary: v.owner_name, status: v.status === 'suspended' ? 'suspended' : 'active', avatar_url: v.avatar, last_location: null, created_at: v.created_at })),
    ...state.drivers.map((d) => ({ id: d.id, role: 'driver', name: d.name, identifier: d.phone, secondary: d.vehicle_type, status: d.verification_status === 'suspended' ? 'suspended' : 'active', avatar_url: '', last_location: null, created_at: d.created_at })),
  ];
}

const paymentRows = () =>
  state.orders.map((o) => ({
    id: `pay-${o.id}`,
    order_id: o.id,
    order_number: o.order_number,
    customer: { name: findCustomer(o.customer_id)?.name },
    amount_rwf: o.total_rwf,
    method: o.payment_method,
    provider: o.payment_method,
    status: o.payment_status === 'paid' ? 'successful' : o.payment_status,
    created_at: o.created_at,
  }));

const adminRoutes = [
  ['POST', '/admin/auth/login', (r) => {
    if (!r.body.email || !r.body.password) fail(400, 'Enter your email and password.');
    // With SMS codes turned on (Settings), sign-in asks for the code too.
    if (state.admin2fa) {
      return { two_factor_required: true, challenge_token: 'demo-challenge', sent_to: '+250 78• ••• 001', dev_otp: DEMO_OTP };
    }
    return { token: TOKENS.admin, admin: adminProfile() };
  }],
  ['POST', '/admin/auth/logout', () => ({ ok: true })],
  ['GET', '/admin/auth/me', (r) => ({ admin: admin(r), limits: { large_money_action_rwf: 50000 }, idle_timeout_minutes: 120 })],
  ...notificationRoutes('/admin/notifications', (r) => {
    admin(r);
    return 'admin';
  }),
  ['GET', '/admin/dashboard/overview', (r) => {
    admin(r);
    const today = state.orders.filter((o) => isToday(o.created_at));
    const sales = today.filter((o) => o.status !== 'cancelled').reduce((sum, o) => sum + o.subtotal_rwf, 0);
    const vendorCounts = counts(state.vendors, 'status');
    const driverCounts = counts(state.drivers, 'verification_status');
    return {
      commission_percent: COMMISSION_PERCENT,
      today: {
        orders: today.length,
        sales_rwf: sales,
        completed_orders: today.filter((o) => o.status === 'delivered').length,
        commission_rwf: Math.round((sales * COMMISSION_PERCENT) / 100),
        delivery_fees_rwf: today.reduce((sum, o) => sum + o.delivery_fee_rwf, 0),
      },
      orders: {
        pending: state.orders.filter((o) => o.status === 'placed').length,
        live: state.orders.filter((o) => OPEN.includes(o.status)).length,
      },
      deliveries: { active: state.orders.filter((o) => ACTIVE_DRIVER.includes(o.status)).length },
      complaints: { open: state.complaints.filter((c) => ['open', 'in_review'].includes(c.status)).length },
      vendors: { total: state.vendors.length, pending: vendorCounts.pending || 0, approved: vendorCounts.approved || 0, suspended: vendorCounts.suspended || 0 },
      drivers: { total: state.drivers.length, online: state.drivers.filter((d) => d.is_online).length, pending: driverCounts.pending || 0, suspended: driverCounts.suspended || 0 },
      customers: { total: state.customers.length, active: state.customers.filter((c) => c.status === 'active').length },
      operations: {
        orders_awaiting_driver: state.orders.filter((o) => o.fulfillment === 'delivery' && o.status === 'ready' && !o.driver_id).length,
        late_pickups_waiting: 0,
        late_pickups_pending_charge: 0,
        pickups_awaiting_collection: state.orders.filter((o) => o.fulfillment === 'pickup' && o.status === 'ready').length,
        pickups_locked: 0,
        kitchens_open: state.vendors.filter((v) => v.status === 'approved' && v.is_open).length,
        drivers_matchable: state.drivers.filter((d) => d.is_online && d.verification_status === 'approved').length,
        pickup_orders_last_24h: state.orders.filter((o) => o.fulfillment === 'pickup' && Date.now() - new Date(o.created_at) < 86400_000).length,
      },
      recent_orders: state.orders.slice(0, 8).map(adminOrder),
    };
  }],

  ['GET', '/admin/vendors/counts', (r) => {
    admin(r);
    const c = counts(state.vendors, 'status');
    return { total: state.vendors.length, pending: c.pending || 0, approved: c.approved || 0, rejected: c.rejected || 0, suspended: c.suspended || 0 };
  }],
  ['GET', '/admin/vendors', (r) => {
    admin(r);
    const status = r.query.get('status');
    const byStatus = state.vendors.filter((v) => !status || v.status === status);
    const types = (r.query.get('vendor_type') || '').split(',').filter(Boolean);
    const list = searchFilter(byStatus, r.query, ['name', 'phone', 'owner_name']).filter((v) => !types.length || types.includes(v.vendor_type));
    const typeCounts = counts(byStatus, 'vendor_type');
    return { ...adminList(list.map(adminVendor), r.query), type_counts: Object.entries(typeCounts).map(([code, count]) => ({ code, count })) };
  }],
  ['GET', '/admin/vendors/:id', (r, p) => {
    admin(r);
    return { vendor: adminVendor(findVendor(p.id) || fail(404, 'Vendor not found.')) };
  }],
  ['PATCH', '/admin/vendors/:id/status', (r, p) => {
    admin(r);
    const vendor = findVendor(p.id) || fail(404, 'Vendor not found.');
    vendor.status = r.body.status;
    if (vendor.status !== 'approved') vendor.is_open = false;
    return { vendor: adminVendor(vendor), cancelled_orders: 0 };
  }],
  ['PATCH', '/admin/vendors/:id/type', (r, p) => {
    admin(r);
    const vendor = findVendor(p.id) || fail(404, 'Vendor not found.');
    if (r.body.decision === 'approve' && vendor.vendor_type_request) vendor.vendor_type = vendor.vendor_type_request.vendor_type;
    if (r.body.vendor_type) vendor.vendor_type = r.body.vendor_type;
    if (r.body.decision || r.body.vendor_type) vendor.vendor_type_request = null;
    return { vendor: adminVendor(vendor) };
  }],
  ['POST', '/admin/vendors/:id/documents/review', (r, p) => {
    admin(r);
    return { vendor: { ...adminVendor(findVendor(p.id)), documents_reviewed_at: nowIso() } };
  }],

  ['GET', '/admin/drivers/counts', (r) => {
    admin(r);
    const c = counts(state.drivers, 'verification_status');
    return { total: state.drivers.length, online: state.drivers.filter((d) => d.is_online).length, pending: c.pending || 0, approved: c.approved || 0, suspended: c.suspended || 0, rejected: c.rejected || 0 };
  }],
  ['GET', '/admin/drivers', (r) => {
    admin(r);
    const status = r.query.get('status');
    const online = r.query.get('online');
    const list = searchFilter(state.drivers, r.query, ['name', 'phone'])
      .filter((d) => !status || d.verification_status === status)
      .filter((d) => !online || String(d.is_online) === online);
    return adminList(list.map(adminDriver), r.query);
  }],
  ['GET', '/admin/drivers/:id', (r, p) => {
    admin(r);
    return { driver: adminDriver(findDriver(p.id) || fail(404, 'Delivery worker not found.')) };
  }],
  ['PATCH', '/admin/drivers/:id/status', (r, p) => {
    admin(r);
    const driver = findDriver(p.id) || fail(404, 'Delivery worker not found.');
    driver.verification_status = r.body.status || r.body.verification_status || driver.verification_status;
    if (driver.verification_status !== 'approved') driver.is_online = false;
    return { driver: adminDriver(driver) };
  }],

  ['GET', '/admin/users', (r) => {
    admin(r);
    const role = r.query.get('role');
    const status = r.query.get('status');
    const list = searchFilter(adminUsers(), r.query, ['name', 'identifier', 'secondary'])
      .filter((u) => !role || u.role === role)
      .filter((u) => !status || u.status === status);
    return adminList(list, r.query);
  }],
  ['PATCH', '/admin/users/:id/status', (r, p) => {
    admin(r);
    const status = r.body.status;
    const customer = findCustomer(p.id);
    const vendor = findVendor(p.id);
    const driver = findDriver(p.id);
    if (customer) customer.status = status;
    if (vendor) vendor.status = status === 'suspended' ? 'suspended' : 'approved';
    if (driver) driver.verification_status = status === 'suspended' ? 'suspended' : 'approved';
    return { ok: true };
  }],

  ['GET', '/admin/orders', (r) => {
    admin(r);
    const status = r.query.get('status');
    const fulfillment = r.query.get('fulfillment');
    const q = String(r.query.get('search') || '').toLowerCase();
    const list = state.orders
      .filter((o) => !status || o.status === status)
      .filter((o) => !fulfillment || o.fulfillment === fulfillment)
      .filter((o) => !q || matches(o.order_number, q) || matches(findCustomer(o.customer_id)?.name, q) || matches(findVendor(o.vendor_id)?.name, q));
    return adminList(list.map(adminOrder), r.query);
  }],
  ['GET', '/admin/orders/:id', (r, p) => {
    admin(r);
    const order = findOrder(p.id);
    const d = order.fulfillment === 'delivery' && !['placed', 'confirmed', 'preparing', 'cancelled'].includes(order.status) ? delivery(order) : null;
    return {
      order: adminOrder(order),
      delivery: d,
      dispatch: d
        ? { radius_km: 5, last_broadcast_at: order.ready_at || null, replaced_late: [], offers: order.driver_id ? [{ driver_id: order.driver_id, driver_name: findDriver(order.driver_id)?.name, response: 'accepted' }] : [] }
        : null,
    };
  }],
  ['PATCH', '/admin/orders/:id/status', (r, p) => {
    admin(r);
    const order = findOrder(p.id);
    order.auto = false;
    setStatus(order, r.body.status, r.body.note || 'Changed by an admin');
    return { order: adminOrder(order) };
  }],
  ['POST', '/admin/orders/:id/cancel', (r, p) => {
    admin(r);
    const order = findOrder(p.id);
    order.auto = false;
    order.cancel_reason = r.body.reason || 'Cancelled by KitchenLink support';
    setStatus(order, 'cancelled', order.cancel_reason);
    return { order: adminOrder(order) };
  }],
  ['GET', '/admin/payments/summary', (r) => {
    admin(r);
    const rows = paymentRows();
    const byStatus = Object.entries(counts(rows, 'status')).map(([status, count]) => ({
      status,
      count,
      total_rwf: rows.filter((p) => p.status === status).reduce((sum, p) => sum + p.amount_rwf, 0),
    }));
    const ok = rows.filter((p) => p.status === 'successful');
    return { successful_total_rwf: ok.reduce((sum, p) => sum + p.amount_rwf, 0), successful_count: ok.length, by_status: byStatus };
  }],
  ['GET', '/admin/payments', (r) => {
    admin(r);
    const status = r.query.get('status');
    const method = r.query.get('method');
    return adminList(paymentRows().filter((p) => (!status || p.status === status) && (!method || p.method === method)), r.query);
  }],
  ['GET', '/admin/commissions', (r) => {
    admin(r);
    return {
      items: [
        { id: 'com-1', name: 'Standard commission', scope: 'global', percentage: COMMISSION_PERCENT, fixed_fee_rwf: 0, is_active: true },
        ...(state.commissions || []),
      ],
    };
  }],

  ['GET', '/admin/categories', (r) => {
    admin(r);
    return { items: [...state.categories].sort((a, b) => a.sort_order - b.sort_order) };
  }],
  ['POST', '/admin/categories', (r) => {
    admin(r);
    const category = { id: nextId('cat'), slug: String(r.body.name || '').toLowerCase(), icon_url: '', description: '', is_active: true, ...r.body, sort_order: state.categories.length };
    state.categories.push(category);
    return { category };
  }],
  ['PUT', '/admin/categories/:id', (r, p) => {
    admin(r);
    const category = state.categories.find((c) => c.id === p.id) || fail(404, 'Category not found.');
    Object.assign(category, r.body);
    return { category };
  }],
  ['DELETE', '/admin/categories/:id', (r, p) => {
    admin(r);
    state.categories = state.categories.filter((c) => c.id !== p.id);
    return { ok: true };
  }],
  ['PATCH', '/admin/categories/reorder', (r) => {
    admin(r);
    (r.body.items || []).forEach(({ id, sort_order: order }) => {
      const category = state.categories.find((c) => c.id === id);
      if (category) category.sort_order = order;
    });
    return { ok: true };
  }],
];

/* --------------------------- routes & live maps -------------------------- */

const bearingDeg = (a, b) => (Math.atan2(b.lng - a.lng, b.lat - a.lat) * 180) / Math.PI;
const AVG_SPEED_KMH = 22;

/**
 * A believable road route between two points ({lat, lng}): an L-shaped path
 * through the city, with turn-by-turn steps. Geometry is [lng, lat] pairs.
 */
function routeBetween(a, b) {
  const corner = { lat: a.lat, lng: b.lng };
  const geometry = [];
  const leg = (p, q, n) => {
    for (let i = 0; i < n; i += 1) {
      const t = i / n;
      geometry.push([p.lng + (q.lng - p.lng) * t, p.lat + (q.lat - p.lat) * t]);
    }
  };
  leg(a, corner, 10);
  leg(corner, b, 10);
  geometry.push([b.lng, b.lat]);
  const first = Math.round((distanceKm(a, corner) || 0) * 1000);
  const second = Math.round((distanceKm(corner, b) || 0) * 1000);
  const distance = first + second;
  const turnRight = (b.lat - a.lat) * (b.lng - a.lng) < 0;
  return {
    distance_m: distance,
    duration_s: Math.round((distance / 1000 / AVG_SPEED_KMH) * 3600) + 60,
    geometry,
    source: 'estimate',
    steps: [
      { instruction: 'Head out along the main road', distance_m: first, maneuver: { type: 'depart', location: [a.lng, a.lat] } },
      { instruction: `Turn ${turnRight ? 'right' : 'left'}`, distance_m: second, maneuver: { type: 'turn', modifier: turnRight ? 'right' : 'left', location: [corner.lng, corner.lat] } },
      { instruction: 'You have arrived', distance_m: 0, maneuver: { type: 'arrive', location: [b.lng, b.lat] } },
    ],
  };
}

/** The point a fraction `t` (0–1) along a route's geometry, with its heading. */
function along(route, t) {
  const g = route.geometry;
  const x = Math.min(g.length - 1, Math.max(0, t) * (g.length - 1));
  const i = Math.min(g.length - 2, Math.floor(x));
  const f = x - i;
  const p = { lng: g[i][0] + (g[i + 1][0] - g[i][0]) * f, lat: g[i][1] + (g[i + 1][1] - g[i][1]) * f };
  const next = { lng: g[i + 1][0], lat: g[i + 1][1] };
  return { ...p, heading: Math.round((bearingDeg(p, next) + 360) % 360) };
}

const PHASE_SECONDS = { to_kitchen: 150, to_customer: 240 };

/**
 * Where the delivery worker is right now on a delivery (simulated: they move
 * along the route from when they accepted / picked up), and the route left.
 */
function liveView(order) {
  if (order.fulfillment !== 'delivery' || !ACTIVE_DRIVER.includes(order.status) || !order.delivery_location) {
    return { active: false };
  }
  const vendor = findVendor(order.vendor_id);
  const driver = findDriver(order.driver_id);
  const kitchen = vendorPoint(vendor);
  const drop = { lat: order.delivery_location.latitude, lng: order.delivery_location.longitude };
  const toKitchen = order.status === 'assigned';
  const start = toKitchen ? { lat: kitchen.lat + 0.011, lng: kitchen.lng - 0.009 } : kitchen;
  const target = toKitchen ? kitchen : drop;
  const since = new Date((toKitchen ? order.assigned_at : order.picked_up_at) || order.created_at).getTime();
  const progress = Math.min(0.97, (Date.now() - since) / 1000 / PHASE_SECONDS[toKitchen ? 'to_kitchen' : 'to_customer']);
  const here = along(routeBetween(start, target), progress);
  const remaining = routeBetween(here, target);
  return {
    active: true,
    phase: toKitchen ? 'to_kitchen' : 'to_customer',
    phase_label: toKitchen ? 'Heading to the kitchen' : 'On the way to you',
    kitchen_ready: !['placed', 'confirmed', 'preparing'].includes(order.status),
    driver: driver
      ? {
          id: driver.id,
          name: driver.name,
          phone: driver.phone,
          plate_number: driver.plate_number,
          vehicle_type: driver.vehicle_type,
          rating: driver.rating,
          avatar_url: '',
          location: { latitude: here.lat, longitude: here.lng, heading: here.heading, updated_at: nowIso(), stale: false },
        }
      : null,
    route: {
      distance_m: remaining.distance_m,
      duration_s: remaining.duration_s,
      eta_at: new Date(Date.now() + remaining.duration_s * 1000).toISOString(),
      geometry: remaining.geometry,
      steps: remaining.steps,
    },
    kitchen: { name: vendor.name, latitude: kitchen.lat, longitude: kitchen.lng },
    destination: { address: order.delivery_location.address, latitude: drop.lat, longitude: drop.lng },
  };
}

/* ------------------------------- big events ------------------------------ */

const SERVICE_STYLES = [
  { code: 'buffet', label: 'Buffet' },
  { code: 'plated', label: 'Plated service' },
  { code: 'family_style', label: 'Family style' },
  { code: 'boxed', label: 'Boxed meals' },
  { code: 'drop_off', label: 'Drop-off only' },
];
const styleLabel = (code) => SERVICE_STYLES.find((s) => s.code === code)?.label || code;
const EVENT_MIN_LEAD_HOURS = 48;
const EVENT_BALANCE_HOURS_BEFORE = 24;
const EVENT_DEPOSIT_PERCENT = 50;

function publicPackage(pkg) {
  const tiers = pkg.tiers.filter((t) => t.min_guests > 0 && t.max_guests > 0 && t.price_per_plate_rwf > 0);
  return {
    ...pkg,
    tiers,
    service_style_label: styleLabel(pkg.service_style),
    min_guests: tiers.length ? Math.min(...tiers.map((t) => t.min_guests)) : 0,
    max_guests: tiers.length ? Math.max(...tiers.map((t) => t.max_guests)) : 0,
    from_price_per_plate_rwf: tiers.length ? Math.min(...tiers.map((t) => t.price_per_plate_rwf)) : 0,
  };
}

/** Price one package for a number of guests (null when the guests don't fit). */
function priceEvent(vendor, offer, pkg, guests, fulfillment, venue) {
  const tier = pkg.tiers.find((t) => t.min_guests <= guests && guests <= t.max_guests);
  if (!tier) return null;
  const food = guests * tier.price_per_plate_rwf;
  const km = venue ? distanceKm(vendorPoint(vendor), venue) : null;
  const delivery = fulfillment === 'pickup' ? 0 : km != null ? feeFromRanges(offer.delivery_fee_ranges, km) : null;
  const total = food + (delivery || 0);
  const deposit = Math.round((total * EVENT_DEPOSIT_PERCENT) / 100);
  return {
    package_id: pkg.id,
    guests,
    price_per_plate_rwf: tier.price_per_plate_rwf,
    food_total_rwf: food,
    delivery_fee_rwf: delivery,
    distance_km: km,
    total_rwf: total,
    pickup_total_rwf: food,
    deposit_percent: EVENT_DEPOSIT_PERCENT,
    deposit_rwf: deposit,
    balance_rwf: total - deposit,
    min_lead_hours: EVENT_MIN_LEAD_HOURS,
    balance_due_hours_before: EVENT_BALANCE_HOURS_BEFORE,
  };
}

const eventOffer = (vendorId) => {
  const offer = state.eventPackages[vendorId];
  return offer?.enabled && offer.packages.some((p) => p.enabled) ? offer : null;
};

/** GET /home/vendors?events=1&guests=N: kitchens with a package that fits. */
function eventVendors(query, from) {
  const guests = Number(query.get('guests')) || 0;
  const pickup = query.get('pickup') === '1';
  return visibleVendors()
    .map((vendor) => {
      const offer = eventOffer(vendor.id);
      if (!offer) return null;
      const packages = offer.packages
        .filter((pkg) => pkg.enabled)
        .map((pkg) => ({ ...publicPackage(pkg), quote: guests ? priceEvent(vendor, offer, pkg, guests, pickup ? 'pickup' : 'delivery', from) : null }))
        .filter((pkg) => !guests || pkg.quote);
      if (!packages.length) return null;
      return {
        ...publicVendor(vendor, from),
        nationwide: Boolean(state.nationwide[vendor.id]?.enabled),
        event: { packages, delivery_fee_ranges: offer.delivery_fee_ranges, delivery_details: offer.delivery_details },
      };
    })
    .filter(Boolean)
    .sort((a, b) => (from ? a.distance_km - b.distance_km : b.rating - a.rating));
}

function eventQuote(body) {
  const vendor = findVendor(body.vendor_id);
  if (!vendor || vendor.status !== 'approved') fail(404, 'This kitchen is not on KitchenLink.');
  const offer = eventOffer(vendor.id) || fail(404, `${vendor.name} doesn't take big events yet.`);
  const enabled = offer.packages.filter((p) => p.enabled);
  let guests = Number(body.guests) || 0;
  const pkg =
    enabled.find((p) => p.id === body.package_id) ||
    enabled.find((p) => p.tiers.some((t) => t.min_guests <= guests && guests <= t.max_guests)) ||
    enabled[0];
  const range = publicPackage(pkg);
  // No guest count yet: price the smallest event so the page can show the offer.
  if (guests < 1) guests = range.min_guests;
  const venue = body.delivery_location?.latitude != null
    ? { lat: body.delivery_location.latitude, lng: body.delivery_location.longitude }
    : null;
  const quote = priceEvent(vendor, offer, pkg, guests, body.fulfillment, venue);
  if (!quote) fail(400, `"${pkg.name}" is for ${range.min_guests}–${range.max_guests} guests.`, 'GUESTS_OUT_OF_RANGE');
  return {
    vendor: { id: vendor.id, name: vendor.name, address: vendor.address, neighborhood: vendor.neighborhood },
    offer: {
      package: range,
      packages: enabled.map(publicPackage).map(({ id, name, min_guests: min, max_guests: max, from_price_per_plate_rwf: from }) => ({
        id, name, min_guests: min, max_guests: max, from_price_per_plate_rwf: from,
      })),
      delivery_details: offer.delivery_details,
      delivery_fee_ranges: offer.delivery_fee_ranges,
    },
    quote,
  };
}

function createEventOrder(customer, body) {
  const { vendor, offer, quote } = eventQuote(body);
  const eventAt = new Date(body.event_at);
  if (Number.isNaN(eventAt.getTime()) || eventAt.getTime() < Date.now() + (EVENT_MIN_LEAD_HOURS - 1) * 3600_000) {
    fail(400, `Big events must be booked at least ${EVENT_MIN_LEAD_HOURS / 24} days ahead.`);
  }
  const pkg = offer.package;
  const pickup = body.fulfillment === 'pickup';
  const drop = body.delivery_location || {};
  const seq = state.nextId + 1;
  const order = {
    id: nextId('ord'),
    order_number: `KL-${30000 + seq}`,
    created_at: nowIso(),
    status: 'placed',
    auto: false,
    customer_id: customer.id,
    vendor_id: vendor.id,
    driver_id: null,
    items: [{ menu_item_id: pkg.id, name: `${pkg.name} (per guest)`, price_rwf: quote.price_per_plate_rwf, quantity: quote.guests, image_url: '' }],
    subtotal_rwf: quote.food_total_rwf,
    delivery_fee_rwf: quote.delivery_fee_rwf || 0,
    total_rwf: quote.total_rwf,
    payment_method: body.payment_method || 'mobile_money',
    payment_status: 'partially_paid',
    // The kitchen brings event food itself.
    fulfillment: pickup ? 'pickup' : 'vendor_delivery',
    order_type: 'scheduled',
    scheduled_for: eventAt.toISOString(),
    special_text: body.note || '',
    delivery_location: pickup ? null : { address: drop.address || '', neighborhood: '', note: body.note || '', latitude: drop.latitude, longitude: drop.longitude },
    pickup_code: String(100000 + Math.floor(Math.random() * 900000)),
    delivery_code: String(100000 + Math.floor(Math.random() * 900000)),
    cancel_reason: '',
    history: [{ status: 'placed', at: nowIso() }],
    rejected_by: [],
    event: {
      guests: quote.guests,
      package_id: pkg.id,
      package_name: pkg.name,
      portion: pkg.portion,
      menu: pkg.menu,
      service_style: pkg.service_style,
      service_style_label: pkg.service_style_label,
      service_details: pkg.service_details,
      event_at: eventAt.toISOString(),
    },
    deposit: {
      deposit_rwf: quote.deposit_rwf,
      balance_rwf: quote.balance_rwf,
      amount_paid_rwf: quote.deposit_rwf,
      balance_due_at: new Date(eventAt.getTime() - EVENT_BALANCE_HOURS_BEFORE * 3600_000).toISOString(),
      balance_paid_at: null,
    },
  };
  state.orders.unshift(order);
  notify(`vendor:${vendor.id}`, 'new_order', 'New big-event booking', `${customer.name} booked "${pkg.name}" for ${quote.guests} guests.`);
  return customerOrder(order);
}

const eventPackageOptions = {
  limits: { packages: 5, tiers: 6, delivery_fee_rwf: [0, 200000] },
  service_styles: SERVICE_STYLES,
};

function savedEventPackage(vendorId) {
  const offer = state.eventPackages[vendorId] || { enabled: false, packages: [], delivery_fee_ranges: [], delivery_details: '' };
  return { event_package: offer, options: eventPackageOptions };
}

function nationwideView(vendor) {
  const saved = state.nationwide[vendor.id] || {};
  return {
    nationwide: {
      enabled: saved.enabled ?? vendor.vendor_type === 'caterer',
      platform_delivery_max_km: state.settings.dispatch.platform_delivery_max_km,
      travel_base_fee_rwf: saved.travel_base_fee_rwf ?? 0,
      travel_per_km_rwf: saved.travel_per_km_rwf ?? 0,
      ranges: { base_fee_rwf: [0, 50000], per_km_rwf: [0, 2000] },
    },
  };
}

const extraCustomerRoutes = [
  ['GET', '/geo/route', (r) => {
    const q = r.query;
    return routeBetween({ lat: Number(q.get('from_lat')), lng: Number(q.get('from_lng')) }, { lat: Number(q.get('to_lat')), lng: Number(q.get('to_lng')) });
  }],
  ['GET', '/orders/:id/live', (r, p) => liveView(customerOwned(r, p.id))],
  ['POST', '/orders/event-quote', (r) => eventQuote(r.body)],
  ['POST', '/orders/event-checkout', (r) => createEventOrder(me.customer(r), r.body)],
  ['POST', '/orders/:id/pay-balance', (r, p) => {
    const order = customerOwned(r, p.id);
    if (!order.deposit || order.deposit.balance_paid_at) fail(400, 'Nothing is left to pay on this order.');
    order.deposit.amount_paid_rwf = order.total_rwf;
    order.deposit.balance_paid_at = nowIso();
    order.payment_status = 'paid';
    return customerOrder(order);
  }],
  ['POST', '/orders/:id/switch-to-delivery/quote', (r, p) => {
    const order = customerOwned(r, p.id);
    if (order.fulfillment !== 'pickup' || !['placed', 'confirmed', 'preparing', 'ready'].includes(order.status)) {
      fail(400, 'This order can no longer be switched to delivery.');
    }
    const drop = r.body.delivery_location || {};
    const km = distanceKm(vendorPoint(findVendor(order.vendor_id)), { lat: drop.latitude ?? KIGALI.lat, lng: drop.longitude ?? KIGALI.lng });
    const fee = feeForKm(km);
    return { delivery_fee_rwf: fee, distance_km: km, new_total_rwf: order.total_rwf + fee, pay_now_rwf: fee };
  }],
  ['POST', '/orders/:id/switch-to-delivery', (r, p) => {
    const order = customerOwned(r, p.id);
    if (order.fulfillment !== 'pickup' || !['placed', 'confirmed', 'preparing', 'ready'].includes(order.status)) {
      fail(400, 'This order can no longer be switched to delivery.');
    }
    const drop = r.body.delivery_location || {};
    const point = { lat: drop.latitude ?? KIGALI.lat, lng: drop.longitude ?? KIGALI.lng };
    const fee = feeForKm(distanceKm(vendorPoint(findVendor(order.vendor_id)), point));
    order.fulfillment = 'delivery';
    order.delivery_fee_rwf = fee;
    order.total_rwf += fee;
    order.delivery_location = { address: drop.address || 'Kigali', neighborhood: drop.neighborhood || '', note: drop.note || '', latitude: point.lat, longitude: point.lng };
    order.history.push({ status: order.status, at: nowIso(), note: 'Switched from pick-up to delivery' });
    return customerOrder(order);
  }],
  ['PUT', '/orders/:id/refund-destination', (r, p) => {
    const order = customerOwned(r, p.id);
    const refund = state.refunds.find((rf) => rf.order_id === order.id) || fail(404, 'This order has no refund.');
    if (refund.status === 'completed') fail(400, 'This refund was already sent.');
    refund.destination = { type: 'mobile_money', label: `Mobile Money · ${r.body.phone}`, phone: r.body.phone };
    if (refund.status === 'failed') refund.status = 'pending';
    return { refund: refundView(refund), order: customerOrder(order) };
  }],
  ['POST', '/wishlist/:id/move-to-cart', (r, p) => {
    const customer = me.customer(r);
    const item = findItem(p.id) || fail(404, 'That dish is no longer on the menu.');
    const cart = state.carts[customer.id] || { vendor_id: null, items: [] };
    const lines = cart.vendor_id === item.vendor_id ? [...cart.items] : [];
    const line = lines.find((l) => l.menu_item_id === item.id);
    if (line) line.quantity += Number(r.body.quantity) || 1;
    else lines.push({ menu_item_id: item.id, quantity: Number(r.body.quantity) || 1 });
    state.wishlists[customer.id] = (state.wishlists[customer.id] || []).filter((e) => e.menu_item_id !== item.id);
    return { cart: setCartLines(customer.id, lines), wishlist: wishlistView(customer.id) };
  }],
];

const extraVendorRoutes = [
  ['GET', '/vendor/event-package', (r) => savedEventPackage(me.vendor(r).id)],
  ['PUT', '/vendor/event-package', (r) => {
    const vendor = me.vendor(r);
    const b = r.body || {};
    (b.packages || []).forEach((pkg) => {
      if (!String(pkg.name || '').trim()) fail(400, 'Give every package a name.');
    });
    state.eventPackages[vendor.id] = {
      enabled: Boolean(b.enabled),
      delivery_details: b.delivery_details || '',
      delivery_fee_ranges: b.delivery_fee_ranges || [],
      packages: (b.packages || []).map((pkg) => ({ ...pkg, id: pkg.id || nextId('pkg'), menu: pkg.menu || [], tiers: pkg.tiers || [] })),
    };
    return savedEventPackage(vendor.id);
  }],
  ['GET', '/vendor/nationwide', (r) => nationwideView(me.vendor(r))],
  ['PUT', '/vendor/nationwide', (r) => {
    const vendor = me.vendor(r);
    const current = state.nationwide[vendor.id] || { enabled: vendor.vendor_type === 'caterer' };
    state.nationwide[vendor.id] = {
      ...current,
      travel_base_fee_rwf: Number(r.body.travel_base_fee_rwf) || 0,
      travel_per_km_rwf: Number(r.body.travel_per_km_rwf) || 0,
    };
    return nationwideView(vendor);
  }],
];

const extraDriverRoutes = [
  ['GET', '/driver/deliveries/:id/navigation', (r, p) => {
    const { driver, order } = driverOwned(r, p.id);
    if (order.driver_id !== driver.id) return { active: false };
    const live = liveView(order);
    if (!live.active) return live;
    return { active: true, phase: live.phase, route: live.route, driver: { location: live.driver?.location } };
  }],
];

/* ------------------------------ admin: extras ---------------------------- */

const PERMISSION_CATEGORIES = [
  { id: 'orders', label: 'Orders & deliveries' },
  { id: 'people', label: 'Kitchens, delivery workers & customers' },
  { id: 'money', label: 'Payments, payouts & refunds' },
  { id: 'support', label: 'Support' },
  { id: 'platform', label: 'Platform settings' },
];
const PERMISSIONS = [
  ['orders:read', 'See orders', 'orders'], ['orders:write', 'Change and cancel orders', 'orders'],
  ['deliveries:read', 'See deliveries', 'orders'], ['deliveries:write', 'Reassign deliveries, delivery rules', 'orders'],
  ['vendors:read', 'See kitchens', 'people'], ['vendors:write', 'Approve and suspend kitchens', 'people'],
  ['drivers:read', 'See delivery workers', 'people'], ['drivers:write', 'Approve and suspend delivery workers', 'people'],
  ['users:read', 'See customers', 'people'], ['users:write', 'Suspend and erase customers', 'people'],
  ['payments:read', 'See payments', 'money'], ['payouts:write', 'Pay out withdrawals', 'money'], ['refunds:write', 'Send refunds', 'money'],
  ['complaints:write', 'Handle complaints', 'support'], ['chats:read', 'Read customer–kitchen chats', 'support'],
  ['categories:write', 'Edit food categories', 'platform'], ['settings:write', 'Change fees and settings', 'platform'],
].map(([id, label, category]) => ({ id, label, category }));
const ROLES = [
  { id: 'super_admin', label: 'Owner', description: 'Everything, including the platform wallet and the team.', permissions: PERMISSIONS.map((p) => p.id) },
  { id: 'operations', label: 'Operations', description: 'Orders, deliveries, kitchens and delivery workers.', permissions: ['orders:read', 'orders:write', 'deliveries:read', 'deliveries:write', 'vendors:read', 'vendors:write', 'drivers:read', 'drivers:write', 'categories:write'] },
  { id: 'support', label: 'Support', description: 'Customers, complaints and chats.', permissions: ['orders:read', 'deliveries:read', 'vendors:read', 'drivers:read', 'users:read', 'users:write', 'complaints:write', 'chats:read'] },
  { id: 'finance', label: 'Finance', description: 'Payments, payouts, refunds and the books.', permissions: ['orders:read', 'payments:read', 'payouts:write', 'refunds:write', 'vendors:read', 'drivers:read'] },
];
const roleOf = (id) => ROLES.find((r) => r.id === id) || ROLES[0];

function adminProfile() {
  const owner = state.team.find((m) => m.id === DEMO_IDS.admin);
  return {
    ...owner,
    role_label: roleOf(owner.role).label,
    permissions: roleOf(owner.role).permissions,
    is_active: true,
    two_factor_enabled: state.admin2fa,
    uses_default_password: false,
  };
}

/** SMS codes for admin actions: in the demo the code is always DEMO_OTP. */
function checkCode(code) {
  if (code != null && code !== '' && String(code).trim() !== DEMO_OTP) {
    fail(400, `Wrong code. In demo mode the code is ${DEMO_OTP}.`, 'OTP_INVALID');
  }
}
const codeSent = () => ({ sent_to: '+250 78• ••• 001', dev_otp: DEMO_OTP });

const teamView = (m) => ({ ...m, role_label: roleOf(m.role).label });
const findMember = (id) => state.team.find((m) => m.id === id) || fail(404, 'Team member not found.');
const inviteUrl = (member) =>
  `${typeof window === 'undefined' ? '' : window.location.origin}/admin-invite?token=demo-invite-${member.id}`;

/* Payouts: the kitchens' and delivery workers' withdrawals. */
function payoutRow(w) {
  const [type, id] = w.owner.split(':');
  const payee = type === 'vendor' ? findVendor(id) : findDriver(id);
  return { ...w, payee_type: type, payee_id: id, payee_name: payee?.name || '' };
}
const payoutRows = () => state.withdrawals.filter((w) => /^(vendor|driver):/.test(w.owner)).map(payoutRow);

const byStatus = (rows, amount) =>
  Object.entries(counts(rows, 'status')).map(([status, count]) => ({
    status,
    count,
    total_rwf: rows.filter((row) => row.status === status).reduce((sum, row) => sum + amount(row), 0),
  }));

function vendorBalanceRow(vendor) {
  const totals = vendorTotals(vendor);
  return {
    id: vendor.id,
    name: vendor.name,
    neighborhood: vendor.neighborhood,
    available_balance_rwf: totals.net - withdrawnBy(`vendor:${vendor.id}`),
    total_sales_rwf: totals.sales,
    estimated_commission_rwf: totals.sales - totals.net,
  };
}

/* The platform's books: everything customers paid, and where it sits now. */
function computeBooks() {
  const opening = state.owner.opening;
  let collected = 0;
  let held = 0;
  let vendorEarned = 0;
  let driverEarned = 0;
  let commission = 0;
  let refundsPaid = 0;
  let refundsOwed = 0;
  const ledger = [];
  const entry = (type, direction, amount, at, extra = {}) =>
    amount > 0 && ledger.push({ id: `tx-${ledger.length + 1}`, type, direction, amount_rwf: amount, created_at: at, reference: '', ...extra });

  state.orders.forEach((o) => {
    const paid = o.status === 'delivered' ? o.total_rwf : o.deposit ? o.deposit.amount_paid_rwf : ['paid', 'refunded'].includes(o.payment_status) ? o.total_rwf : 0;
    if (!paid) return;
    collected += paid;
    entry('order_payment', 'credit', paid, o.created_at, { order_number: o.order_number, description: `Payment for ${o.order_number}` });
    if (o.status === 'delivered') {
      const { commission: c, payout } = moneySplit(o);
      const rider = o.driver_id ? Math.round((o.delivery_fee_rwf * DRIVER_SHARE_PERCENT) / 100) : 0;
      vendorEarned += payout;
      driverEarned += rider;
      commission += c + (o.delivery_fee_rwf - rider);
      const at = o.completed_at || o.created_at;
      entry('vendor_earning', 'debit', payout, at, { order_number: o.order_number, description: `${findVendor(o.vendor_id)?.name} earned` });
      entry('driver_earning', 'debit', rider, at, { order_number: o.order_number, description: 'Delivery worker earned' });
      entry('commission', 'credit', c + (o.delivery_fee_rwf - rider), at, { order_number: o.order_number, description: 'Commission and delivery margin' });
    } else if (o.status === 'cancelled') {
      const refund = state.refunds.find((rf) => rf.order_id === o.id);
      if (refund?.status === 'completed') {
        refundsPaid += refundAmount(refund);
        entry('refund', 'debit', refundAmount(refund), refund.completed_at, { order_number: o.order_number, reference: refund.reference, description: 'Refund sent to the customer' });
      } else refundsOwed += paid;
    } else held += paid;
  });

  const done = (owner) => state.withdrawals.filter((w) => w.owner.startsWith(owner) && w.status === 'completed');
  const vendorOut = done('vendor:').reduce((s, w) => s + w.amount_rwf, 0);
  const driverOut = done('driver:').reduce((s, w) => s + w.amount_rwf, 0);
  [...done('vendor:'), ...done('driver:')].forEach((w) =>
    entry('withdrawal', 'debit', w.amount_rwf, w.created_at, { reference: w.reference, description: `Withdrawal to ${payoutRow(w).payee_name}` }));
  const ownerDone = state.owner.withdrawals.filter((w) => w.status === 'completed');
  const ownerOut = ownerDone.reduce((s, w) => s + w.amount_rwf, 0);
  ownerDone.forEach((w) => entry('platform_withdrawal', 'debit', w.amount_rwf, w.created_at, { reference: w.reference, description: 'Owner withdrawal' }));
  const ownerProcessing = state.owner.withdrawals.filter((w) => w.status === 'processing').reduce((s, w) => s + w.amount_rwf, 0);

  const vendorPayable = opening.vendor + vendorEarned - vendorOut;
  const driverPayable = opening.driver + driverEarned - driverOut;
  const ownerBalance = opening.owner + commission - ownerOut;
  const cash = held + refundsOwed + vendorPayable + driverPayable + ownerBalance;
  ledger.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  return {
    cash_balance_rwf: cash,
    held_balance_rwf: held,
    refunds_owed_rwf: refundsOwed,
    vendor_payable_rwf: vendorPayable,
    driver_payable_rwf: driverPayable,
    commission_balance_rwf: ownerBalance,
    owner_balance_rwf: ownerBalance,
    owner_processing_rwf: ownerProcessing,
    total_collected_rwf: collected,
    total_commission_rwf: commission,
    total_vendor_payouts_rwf: vendorOut,
    total_driver_payouts_rwf: driverOut,
    total_refunded_rwf: refundsPaid,
    balanced: true,
    unreconciled_rwf: 0,
    reconciliation: { balanced: true, unreconciled_rwf: 0 },
    computed_at: nowIso(),
    ledger,
  };
}

function ownerOverview() {
  const { ledger, ...books } = computeBooks();
  const reservePercent = 10;
  const reserve = Math.round((books.owner_balance_rwf * reservePercent) / 100);
  const available = Math.max(0, books.owner_balance_rwf - reserve - books.owner_processing_rwf);
  const weekAgo = Date.now() - 7 * 86400_000;
  const thisWeek = state.owner.withdrawals.filter((w) => w.status !== 'cancelled' && new Date(w.created_at) > weekAgo).reduce((s, w) => s + w.amount_rwf, 0);
  const maxWeekly = 2000000;
  const destination = (id) => state.owner.destinations.find((d) => d.id === id);
  return {
    security: { uses_default_password: false, two_factor_enabled: state.admin2fa, default_jwt_secret: false },
    books,
    withdrawable: {
      available_rwf: available,
      max_now_rwf: Math.max(0, Math.min(available, 1000000, maxWeekly - thisWeek)),
      max_per_withdrawal_rwf: 1000000,
      max_weekly_rwf: maxWeekly,
      processing_rwf: books.owner_processing_rwf,
      reserve_percent: reservePercent,
      reserve_rwf: reserve,
      withdrawn_this_week_rwf: thisWeek,
    },
    blockers: [],
    destinations: state.owner.destinations,
    withdrawals: state.owner.withdrawals.map((w) => ({ ...w, destination: destination(w.destination_id) || null })),
    payout_settings: state.owner.payout_settings,
    sweep: state.owner.sweep,
    reconciliations: state.owner.reconciliations,
  };
}

/* Analytics: the last weeks of sales, with a steady demo history behind them. */
function analyticsSeries(days) {
  return Array.from({ length: days }, (_, i) => {
    const day = new Date(Date.now() - (days - 1 - i) * 86400_000);
    const key = day.toISOString().slice(0, 10);
    const real = state.orders.filter((o) => o.created_at.slice(0, 10) === key && o.status !== 'cancelled');
    const base = 38000 + ((i * 7919) % 41) * 1900 + (day.getDay() === 5 || day.getDay() === 6 ? 30000 : 0);
    return {
      period: key,
      orders: real.length + 6 + (i % 5),
      gross_rwf: base + real.reduce((s, o) => s + o.subtotal_rwf, 0),
    };
  });
}

function complaintView(c) {
  return { ...c, messages: c.messages, notes: c.notes };
}

function adminChatRow(chat) {
  const customer = findCustomer(chat.customer_id);
  const vendor = findVendor(chat.vendor_id);
  const messages = visibleMessages(chat);
  const last = messages.at(-1);
  return {
    id: chat.id,
    customer: { name: customer?.name, phone: customer?.phone_number },
    vendor: { name: vendor?.name, phone: vendor?.phone, vendor_type: vendor?.vendor_type },
    last_message_at: last?.created_at || null,
    last_message_preview: last?.body || '',
    last_message_role: last?.from || null,
    messages_count: messages.length,
  };
}

function lateRow(record) {
  const order = findOrder(record.order_id);
  const driver = findDriver(record.driver_id);
  const readyAt = order.ready_at || order.created_at;
  return {
    id: record.id,
    key: record.id,
    order_id: order.id,
    order_number: order.order_number,
    vendor: { name: findVendor(order.vendor_id)?.name },
    driver: { name: driver?.name, phone: driver?.phone },
    ready_at: readyAt,
    pickup_due_at: new Date(new Date(readyAt).getTime() + state.settings.timing.charge_after_minutes * 60_000).toISOString(),
    picked_up_at: order.picked_up_at || order.created_at,
    minutes_late: record.minutes_late,
    charge_status: record.charge_status,
    charge_rwf: record.charge_rwf,
    penalty_percent: record.penalty_percent,
    note: record.note,
    still_waiting: false,
    can_reassign: false,
    reassigned_at: null,
  };
}

const activeDeliveryOrders = () =>
  state.orders.filter((o) => o.fulfillment === 'delivery' && ['ready', ...ACTIVE_DRIVER].includes(o.status));

function adminLiveDelivery(order) {
  const d = delivery(order);
  const driver = order.driver_id ? findDriver(order.driver_id) : null;
  const live = liveView(order);
  return {
    id: d.id,
    order_id: order.id,
    order_number: order.order_number,
    status: d.status,
    status_label: d.status_label,
    vendor: { name: d.vendor.name },
    kitchen: { name: d.vendor.name, latitude: d.vendor.latitude, longitude: d.vendor.longitude },
    destination: order.delivery_location,
    driver: driver ? { id: driver.id, name: driver.name, phone: driver.phone, location: live.driver?.location || null } : null,
    kitchen_ready: d.kitchen_ready,
    pickup_due_at: d.pickup_due_at,
    offered_to: driver ? 1 : state.drivers.filter((x) => x.is_online && x.verification_status === 'approved').length,
    late: false,
    late_pickup: null,
    updated_at: order.history.at(-1)?.at || order.created_at,
  };
}

function operationsRules() {
  const s = state.settings;
  return {
    dispatch: { ...s.dispatch, offered_when: 'when the kitchen marks the order ready', updated_at: s.updated_at },
    customer_pickup: { max_wrong_codes: s.max_wrong_codes, code_digits: 6 },
    pickup_clock: {
      grace_minutes: s.timing.charge_after_minutes,
      warning_after_minutes: s.timing.warning_minutes,
      reassign_after_minutes: s.timing.reassign_after_minutes,
    },
    fees: { base_rwf: 500, per_km_rwf: 200, minimum_rwf: 800, driver_share_percent: DRIVER_SHARE_PERCENT, ranges: s.delivery_fee_ranges },
    sms: { configured: false, note: 'Demo mode: no SMS is sent; codes are shown on screen.' },
    tracking: { google_key_configured: false, place_search_provider: 'Demo places', routes_provider: 'Demo routes' },
    limits: {
      radius_km: [1, 20, 1],
      max_offer_recipients: [1, 50],
      location_max_age_minutes: [1, 60],
      rebroadcast_every_seconds: [15, 600],
      max_active_deliveries: [1, 5],
      platform_delivery_max_km: [3, 50, 1],
      pickup_code_max_attempts: [3, 10],
    },
  };
}

const RULE_FIELDS = {
  radius_km: 'radius_km',
  max_offer_recipients: 'max_drivers_per_broadcast',
  location_max_age_minutes: 'driver_location_max_age_minutes',
  rebroadcast_every_seconds: 'rebroadcast_every_seconds',
  max_active_deliveries: 'max_active_deliveries_per_driver',
  platform_delivery_max_km: 'platform_delivery_max_km',
};

function nearbyDrivers(order, query) {
  const vendor = findVendor(order.vendor_id);
  const radius = Number(query.get('radius')) || state.settings.dispatch.radius_km;
  const current = order.driver_id ? findDriver(order.driver_id) : null;
  return {
    order_number: order.order_number,
    kitchen: { name: vendor.name },
    kitchen_ready: !['placed', 'confirmed', 'preparing'].includes(order.status),
    pickup_due_at: delivery(order).pickup_due_at,
    late: false,
    collected: ['picked_up', 'out_for_delivery', 'delivered'].includes(order.status),
    radius_km: radius,
    current_driver: current ? { name: current.name, phone: current.phone } : null,
    drivers: state.drivers
      .filter((d) => d.verification_status === 'approved' && d.id !== order.driver_id)
      .map((d) => {
        const km = driverPoint(d) ? distanceKm(driverPoint(d), vendorPoint(vendor)) : null;
        const active = driverAccount(d).active_deliveries_count;
        return {
          id: d.id,
          name: d.name,
          phone: d.phone,
          vehicle_type: d.vehicle_type,
          is_online: d.is_online,
          distance_km: km,
          within_radius: km != null && km <= radius,
          has_capacity: active < state.settings.dispatch.max_active_deliveries_per_driver,
          active_deliveries: active,
          location_known: km != null,
          location_fresh: d.is_online,
          location_updated_at: km != null ? nowIso() : null,
        };
      })
      .sort((a, b) => (a.distance_km ?? 99) - (b.distance_km ?? 99)),
  };
}

const extraAdminRoutes = [
  ['POST', '/admin/auth/verify-2fa', (r) => {
    checkOtp(r.body.code);
    return { token: TOKENS.admin, admin: adminProfile() };
  }],
  ['POST', '/admin/auth/change-password', (r) => {
    admin(r);
    if (String(r.body.new_password || r.body.password || 'x').length < 8) fail(400, 'Use at least 8 characters.');
    return { ok: true };
  }],
  ['POST', '/admin/auth/2fa/start', (r) => {
    admin(r);
    return codeSent();
  }],
  ['POST', '/admin/auth/2fa/enable', (r) => {
    admin(r);
    checkOtp(r.body.code);
    state.admin2fa = true;
    findMember(DEMO_IDS.admin).phone = r.body.phone || findMember(DEMO_IDS.admin).phone;
    return { admin: adminProfile() };
  }],
  ['POST', '/admin/auth/2fa/disable', (r) => {
    admin(r);
    checkOtp(r.body.code);
    state.admin2fa = false;
    return { admin: adminProfile() };
  }],
  ['POST', '/admin/auth/action-code', (r) => {
    admin(r);
    return codeSent();
  }],
  ['GET', '/admin/auth/invitations/:token', (r, p) => {
    const member = state.team.find((m) => `demo-invite-${m.id}` === p.token && m.status === 'invited');
    if (!member) fail(404, 'This invitation link is not valid any more. Ask the owner for a new one.');
    const role = roleOf(member.role);
    return { invitation: { email: member.email, role: role.id, role_label: role.label, role_description: role.description } };
  }],
  ['POST', '/admin/auth/invitations/:token/accept', (r, p) => {
    const member = state.team.find((m) => `demo-invite-${m.id}` === p.token && m.status === 'invited') || fail(404, 'This invitation link is not valid any more.');
    member.status = 'active';
    member.name = r.body.name || member.name || member.email.split('@')[0];
    member.invite_expires_at = null;
    return { ok: true };
  }],

  ['GET', '/admin/team', (r) => {
    admin(r);
    return { members: state.team.map(teamView), roles: ROLES, categories: PERMISSION_CATEGORIES, permissions: PERMISSIONS };
  }],
  ['POST', '/admin/team/invitations', (r) => {
    admin(r);
    const email = String(r.body.email || '').trim().toLowerCase() || fail(400, 'Enter their email address.');
    if (state.team.some((m) => m.email === email)) fail(409, 'This person is already on the team.');
    const member = {
      id: nextId('adm'), name: r.body.name || '', email, phone: r.body.phone || '', role: r.body.role || 'support',
      status: 'invited', is_owner: false, two_factor_enabled: false, last_login_at: null,
      invite_expires_at: new Date(Date.now() + 7 * 86400_000).toISOString(),
    };
    state.team.push(member);
    return { member: teamView(member), invite_url: inviteUrl(member) };
  }],
  ['POST', '/admin/team/:id/resend-invitation', (r, p) => {
    admin(r);
    const member = findMember(p.id);
    member.invite_expires_at = new Date(Date.now() + 7 * 86400_000).toISOString();
    return { member: teamView(member), invite_url: inviteUrl(member) };
  }],
  ['PATCH', '/admin/team/:id/role', (r, p) => {
    admin(r);
    const member = findMember(p.id);
    if (member.is_owner) fail(400, 'The owner’s role cannot change.');
    member.role = r.body.role;
    return { member: teamView(member) };
  }],
  ['POST', '/admin/team/:id/deactivate', (r, p) => {
    admin(r);
    const member = findMember(p.id);
    if (member.is_owner) fail(400, 'The owner cannot be deactivated.');
    member.status = 'disabled';
    return { member: teamView(member) };
  }],
  ['POST', '/admin/team/:id/reactivate', (r, p) => {
    admin(r);
    const member = findMember(p.id);
    member.status = 'active';
    if (r.body?.role) member.role = r.body.role;
    return { member: teamView(member) };
  }],
  ['DELETE', '/admin/team/:id', (r, p) => {
    admin(r);
    if (findMember(p.id).is_owner) fail(400, 'The owner cannot be removed.');
    state.team = state.team.filter((m) => m.id !== p.id);
    return { ok: true };
  }],

  ['GET', '/admin/actions', (r) => {
    admin(r);
    const q = String(r.query.get('search') || '').toLowerCase();
    const action = r.query.get('action');
    const list = state.audit.filter((log) => (!action || log.action.startsWith(action)) && (!q || matches(log.action, q) || matches(log.target_label, q) || matches(log.admin_name, q)));
    return adminList(list, r.query);
  }],

  ['GET', '/admin/analytics/overview', (r) => {
    admin(r);
    const series = analyticsSeries(30);
    const gross = series.reduce((s, p) => s + p.gross_rwf, 0);
    const delivered = state.orders.filter((o) => o.status !== 'cancelled');
    const topVendors = visibleVendors()
      .map((v) => ({ vendor_id: v.id, name: v.name, orders: delivered.filter((o) => o.vendor_id === v.id).length + Math.round(v.reviews_count / 10), gross_rwf: vendorTotals(v).sales }))
      .sort((a, b) => b.gross_rwf - a.gross_rwf)
      .slice(0, 5);
    const deliveryStatuses = {};
    state.orders.filter((o) => o.fulfillment === 'delivery').forEach((o) => {
      const s = deliveryStatusOf(o);
      deliveryStatuses[s] = (deliveryStatuses[s] || 0) + 1;
    });
    return {
      sales: {
        gross_rwf: gross,
        orders: series.reduce((s, p) => s + p.orders, 0),
        commission_percent: COMMISSION_PERCENT,
        commission_rwf: Math.round((gross * COMMISSION_PERCENT) / 100),
        delivery_fees_rwf: Math.round(gross * 0.08),
      },
      orders_created: series.reduce((s, p) => s + p.orders, 0),
      signups: { customers: state.customers.length + 41, vendors: state.vendors.length, drivers: state.drivers.length },
      top_vendors: topVendors,
      deliveries_by_status: deliveryStatuses,
      complaints_by_status: counts(state.complaints, 'status'),
    };
  }],
  ['GET', '/admin/analytics/sales', (r) => {
    admin(r);
    const granularity = r.query.get('granularity') || 'day';
    const days = analyticsSeries(granularity === 'month' ? 180 : granularity === 'week' ? 84 : 30);
    if (granularity === 'day') return { granularity, series: days };
    const size = granularity === 'week' ? 7 : 30;
    const series = [];
    for (let i = 0; i < days.length; i += size) {
      const chunk = days.slice(i, i + size);
      series.push({ period: chunk[0].period, orders: chunk.reduce((s, p) => s + p.orders, 0), gross_rwf: chunk.reduce((s, p) => s + p.gross_rwf, 0) });
    }
    return { granularity, series };
  }],
  ['GET', '/admin/analytics/payouts', (r) => {
    admin(r);
    return {
      withdrawals_by_status: byStatus(payoutRows(), (w) => w.amount_rwf),
      top_vendor_balances: visibleVendors().map(vendorBalanceRow).sort((a, b) => b.available_balance_rwf - a.available_balance_rwf).slice(0, 5)
        .map((row) => ({ vendor_id: row.id, name: row.name, available_balance_rwf: row.available_balance_rwf })),
    };
  }],

  ['GET', '/admin/chats', (r) => {
    admin(r);
    const q = String(r.query.get('search') || '').toLowerCase();
    const rows = state.chats.map(adminChatRow).filter((c) => !q || matches(c.customer.name, q) || matches(c.vendor.name, q));
    return adminList(rows, r.query);
  }],
  ['GET', '/admin/chats/:id', (r, p) => {
    admin(r);
    const chat = state.chats.find((c) => c.id === p.id) || fail(404, 'Chat not found.');
    return {
      conversation: adminChatRow(chat),
      messages: visibleMessages(chat).map((m) => ({ id: m.id, author_role: m.from, body: m.body, created_at: m.created_at })),
      has_more: false,
    };
  }],

  ['POST', '/admin/commissions', (r) => {
    admin(r);
    const rule = { id: nextId('com'), ...r.body };
    (state.commissions = state.commissions || []).push(rule);
    return { commission: rule };
  }],
  ['PUT', '/admin/commissions/:id', (r, p) => {
    admin(r);
    const rule = (state.commissions || []).find((c) => c.id === p.id);
    if (rule) Object.assign(rule, r.body);
    return { commission: rule || { id: p.id, ...r.body } };
  }],
  ['DELETE', '/admin/commissions/:id', (r, p) => {
    admin(r);
    state.commissions = (state.commissions || []).filter((c) => c.id !== p.id);
    return { ok: true };
  }],

  ['GET', '/admin/complaints', (r) => {
    admin(r);
    const q = String(r.query.get('search') || '').toLowerCase();
    const list = state.complaints.filter((c) =>
      ['status', 'priority', 'category'].every((key) => !r.query.get(key) || c[key] === r.query.get(key)) &&
      (!q || matches(c.subject, q) || matches(c.reference, q) || matches(c.raised_by.name, q)));
    const c = counts(state.complaints, 'status');
    return { ...adminList(list.map(complaintView), r.query), counts: { ...c, unread: state.complaints.filter((x) => x.unread).length } };
  }],
  ['GET', '/admin/complaints/:id', (r, p) => {
    admin(r);
    const complaint = state.complaints.find((c) => c.id === p.id) || fail(404, 'Complaint not found.');
    complaint.unread = false;
    return { complaint: complaintView(complaint) };
  }],
  ['POST', '/admin/complaints', (r) => {
    admin(r);
    const b = r.body;
    const customer = state.customers.find((c) => c.phone_number === b.phone);
    const complaint = {
      id: nextId('cmp'),
      reference: `CMP-${state.nextId}`,
      subject: b.subject,
      description: b.description,
      category: b.category || 'other',
      priority: b.priority || 'medium',
      status: 'open',
      unread: false,
      raised_by: customer
        ? { role: 'customer', user_id: customer.id, name: customer.name, phone: customer.phone_number }
        : { role: 'guest', user_id: null, name: b.name || 'Caller', phone: b.phone || '' },
      messages: [],
      notes: [],
      created_at: nowIso(),
      last_message_at: nowIso(),
    };
    state.complaints.unshift(complaint);
    return { complaint: complaintView(complaint) };
  }],
  ['PATCH', '/admin/complaints/:id', (r, p) => {
    const me_ = admin(r);
    const complaint = state.complaints.find((c) => c.id === p.id) || fail(404, 'Complaint not found.');
    const b = r.body;
    if (b.status) complaint.status = b.status;
    if (b.priority) complaint.priority = b.priority;
    if (b.note) complaint.notes.push({ id: nextId('cn'), author_name: me_.name, body: b.note, at: nowIso() });
    if (b.reply) {
      complaint.messages.push({ id: nextId('cm'), author_role: 'admin', author_name: me_.name, body: b.reply, at: nowIso() });
      complaint.last_message_at = nowIso();
    }
    return { complaint: complaintView(complaint) };
  }],

  ['GET', '/admin/deliveries/live', (r) => {
    admin(r);
    return adminList(activeDeliveryOrders().map(adminLiveDelivery), r.query);
  }],
  ['GET', '/admin/deliveries/:id/live', (r, p) => {
    admin(r);
    return liveView(findOrder(String(p.id).replace(/^del-/, '')));
  }],
  ['GET', '/admin/operations/live-map', (r) => {
    admin(r);
    return {
      generated_at: nowIso(),
      kitchens: visibleVendors().filter((v) => v.is_open).map((v) => ({ id: v.id, name: v.name, neighborhood: v.neighborhood, latitude: v.latitude, longitude: v.longitude })),
      drivers: state.drivers.filter((d) => d.verification_status === 'approved' && d.latitude != null).map((d) => ({
        id: d.id, name: d.name, phone: d.phone, plate_number: d.plate_number, vehicle_type: d.vehicle_type,
        counts_for_dispatch: d.is_online,
        location: { latitude: d.latitude, longitude: d.longitude, updated_at: nowIso() },
      })),
      deliveries: activeDeliveryOrders().map(adminLiveDelivery),
    };
  }],
  ['GET', '/admin/operations/late-pickups', (r) => {
    admin(r);
    const status = r.query.get('charge_status');
    const rows = state.late.map(lateRow).filter((row) => !status || row.charge_status === status);
    return { ...adminList(rows, r.query), pending_charges: state.late.filter((l) => l.charge_status === 'pending').length, still_waiting: 0 };
  }],
  ['GET', '/admin/operations/rules', (r) => {
    admin(r);
    return operationsRules();
  }],
  ['PUT', '/admin/operations/rules', (r) => {
    admin(r);
    Object.entries(RULE_FIELDS).forEach(([field, key]) => {
      if (r.body[field] != null) state.settings.dispatch[key] = Number(r.body[field]);
    });
    if (r.body.pickup_code_max_attempts != null) state.settings.max_wrong_codes = Number(r.body.pickup_code_max_attempts);
    state.settings.updated_at = nowIso();
    return operationsRules();
  }],
  ['GET', '/admin/operations/delivery-timing', (r) => {
    admin(r);
    return { timing: { ...state.settings.timing, updated_at: state.settings.updated_at } };
  }],
  ['PUT', '/admin/operations/delivery-timing', (r) => {
    admin(r);
    const b = r.body;
    if (!(b.warning_minutes < b.charge_after_minutes)) fail(400, 'The warning must come before the late charge.');
    state.settings.timing = { warning_minutes: b.warning_minutes, charge_after_minutes: b.charge_after_minutes, reassign_after_minutes: b.reassign_after_minutes };
    state.settings.updated_at = nowIso();
    return { timing: { ...state.settings.timing, updated_at: state.settings.updated_at } };
  }],
  ['GET', '/admin/settings/delivery-fees', (r) => {
    admin(r);
    return { ranges: state.settings.delivery_fee_ranges, updated_at: state.settings.delivery_fee_ranges.length ? state.settings.updated_at : null };
  }],
  ['PUT', '/admin/settings/delivery-fees', (r) => {
    admin(r);
    state.settings.delivery_fee_ranges = r.body.ranges || [];
    state.settings.updated_at = nowIso();
    return { ranges: state.settings.delivery_fee_ranges, updated_at: state.settings.updated_at };
  }],
  ['GET', '/admin/settings/banks', (r) => {
    admin(r);
    return { banks: state.banks, updated_at: state.settings.updated_at };
  }],
  ['PUT', '/admin/settings/banks', (r) => {
    admin(r);
    state.banks = r.body.banks || [];
    return { banks: state.banks, updated_at: nowIso() };
  }],

  ['GET', '/admin/orders/:id/nearby-drivers', (r, p) => {
    admin(r);
    return nearbyDrivers(findOrder(p.id), r.query);
  }],
  ['POST', '/admin/orders/:id/reassign-driver', (r, p) => {
    admin(r);
    const order = findOrder(p.id);
    const driver = findDriver(r.body.driver_id) || fail(404, 'Delivery worker not found.');
    if (['picked_up', 'out_for_delivery', 'delivered', 'cancelled'].includes(order.status)) fail(400, 'This order was already collected.');
    order.auto = false;
    order.driver_id = driver.id;
    if (order.status === 'ready') setStatus(order, 'assigned', `Assigned to ${driver.name} by support`);
    else order.history.push({ status: order.status, at: nowIso(), note: `Assigned to ${driver.name} by support` });
    notify(`driver:${driver.id}`, 'delivery_assigned', 'Delivery assigned to you', `Support gave you order ${order.order_number}.`);
    return { order: adminOrder(order) };
  }],

  ['GET', '/admin/payouts', (r) => {
    admin(r);
    const status = r.query.get('status');
    const type = r.query.get('payee_type');
    return adminList(payoutRows().filter((w) => (!status || w.status === status) && (!type || w.payee_type === type)), r.query);
  }],
  ['GET', '/admin/payouts/summary', (r) => {
    admin(r);
    const type = r.query.get('payee_type');
    return { by_status: byStatus(payoutRows().filter((w) => !type || w.payee_type === type), (w) => w.amount_rwf) };
  }],
  ['GET', '/admin/payouts/balances', (r) => {
    admin(r);
    if (r.query.get('payee_type') === 'driver') {
      const rows = state.drivers.map((d) => {
        const account = driverAccount(d);
        return { id: d.id, name: d.name, phone: d.phone, vehicle_type: d.vehicle_type, available_balance_rwf: account.available_balance_rwf, total_earnings_rwf: d.total_earnings_rwf, completed_deliveries: d.completed_deliveries };
      });
      return adminList(rows.sort((a, b) => b.available_balance_rwf - a.available_balance_rwf), r.query);
    }
    return adminList(state.vendors.map(vendorBalanceRow).sort((a, b) => b.available_balance_rwf - a.available_balance_rwf), r.query);
  }],
  ['PATCH', '/admin/payouts/:id', (r, p) => {
    admin(r);
    checkCode(r.body.action_code);
    const w = state.withdrawals.find((x) => x.id === p.id) || fail(404, 'Withdrawal not found.');
    if (r.body.status === 'completed' && !String(r.body.reference || '').trim()) fail(400, 'Enter the transfer reference.');
    w.status = r.body.status;
    w.reference = r.body.reference || w.reference;
    w.failure_reason = r.body.status === 'failed' ? r.body.reason || 'Payment failed' : '';
    w.processed_at = nowIso();
    const [type, id] = w.owner.split(':');
    notify(`${type}:${id}`, 'payout', w.status === 'completed' ? 'Withdrawal sent' : 'Withdrawal failed',
      `${w.amount_rwf.toLocaleString()} RWF ${w.status === 'completed' ? 'was sent' : 'could not be sent'}.`);
    return { withdrawal: payoutRow(w) };
  }],

  ['GET', '/admin/refunds', (r) => {
    admin(r);
    const status = r.query.get('status');
    const q = String(r.query.get('search') || '').toLowerCase();
    const rows = state.refunds.map((rf) => {
      const order = state.orders.find((o) => o.id === rf.order_id);
      const customer = order && findCustomer(order.customer_id);
      return { ...rf, amount_rwf: refundAmount(rf), order_number: order?.order_number, customer: { name: customer?.name, phone: customer?.phone_number } };
    }).filter((rf) => (!status || rf.status === status) && (!q || matches(rf.order_number, q) || matches(rf.customer.name, q)));
    const sum = (s) => {
      const list = state.refunds.filter((rf) => rf.status === s);
      return { count: list.length, amount_rwf: list.reduce((t, rf) => t + refundAmount(rf), 0) };
    };
    return {
      ...adminList(rows, r.query),
      summary: { pending: sum('pending'), completed: sum('completed'), failed: sum('failed') },
      payout_service: { automatic: false, label: 'Manual (demo)' },
    };
  }],
  ['PATCH', '/admin/refunds/:id', (r, p) => {
    admin(r);
    const refund = state.refunds.find((rf) => rf.id === p.id) || fail(404, 'Refund not found.');
    refund.status = r.body.status;
    refund.reference = r.body.reference || refund.reference;
    refund.failure_reason = r.body.status === 'failed' ? r.body.reason || '' : '';
    refund.completed_at = r.body.status === 'completed' ? nowIso() : null;
    return { refund };
  }],

  ['GET', '/admin/platform/wallet', (r) => {
    admin(r);
    const { ledger, ...account } = computeBooks();
    const type = r.query.get('type');
    const { page, limit, total, slice } = paginate(ledger.filter((t) => !type || t.type === type), r.query, 20);
    return { account, transactions: slice, page, limit, total };
  }],
  ['GET', '/admin/platform/transactions', (r) => {
    admin(r);
    const { ledger } = computeBooks();
    const { page, limit, total, slice } = paginate(ledger, r.query, 20);
    return { transactions: slice, page, limit, total };
  }],
  ['GET', '/admin/platform/owner', (r) => {
    admin(r);
    return ownerOverview();
  }],
  ['POST', '/admin/platform/owner/withdrawals', (r) => {
    admin(r);
    checkCode(r.body.otp_code);
    const overview = ownerOverview();
    const amount = Number(r.body.amount_rwf);
    if (!amount || amount < 1000) fail(400, 'The smallest withdrawal is 1,000 RWF.');
    if (amount > overview.withdrawable.max_now_rwf) fail(400, `You can withdraw up to ${overview.withdrawable.max_now_rwf.toLocaleString()} RWF now.`);
    const destination = state.owner.destinations.find((d) => d.id === r.body.destination_id && d.ready) || fail(400, 'Choose where to send the money.');
    const withdrawal = { id: nextId('ow'), amount_rwf: amount, status: 'processing', destination_id: destination.id, reference: '', failure_reason: '', source: r.body.source || 'manual', created_at: nowIso() };
    state.owner.withdrawals.unshift(withdrawal);
    if (withdrawal.source === 'weekly_sweep') state.owner.sweep = { last_at: nowIso(), last_amount_rwf: amount };
    return { withdrawal };
  }],
  ['POST', '/admin/platform/owner/withdrawals/:id/complete', (r, p) => {
    admin(r);
    const w = state.owner.withdrawals.find((x) => x.id === p.id) || fail(404, 'Withdrawal not found.');
    w.status = 'completed';
    w.reference = r.body.reference || w.reference;
    return { withdrawal: w };
  }],
  ['POST', '/admin/platform/owner/withdrawals/:id/cancel', (r, p) => {
    admin(r);
    const w = state.owner.withdrawals.find((x) => x.id === p.id) || fail(404, 'Withdrawal not found.');
    w.status = 'cancelled';
    w.failure_reason = r.body.reason || 'Cancelled';
    return { withdrawal: w };
  }],
  ['POST', '/admin/platform/owner/destinations', (r) => {
    admin(r);
    checkCode(r.body.otp_code);
    const { otp_code: _code, ...form } = r.body;
    const destination = { id: nextId('dst'), ...form, ready: true, activates_at: null };
    state.owner.destinations.push(destination);
    return { destination };
  }],
  ['POST', '/admin/platform/owner/destinations/:id/remove', (r, p) => {
    admin(r);
    checkCode(r.body.otp_code);
    state.owner.destinations = state.owner.destinations.filter((d) => d.id !== p.id);
    return { ok: true };
  }],
  ['POST', '/admin/platform/owner/adjustments', (r) => {
    admin(r);
    checkCode(r.body.otp_code);
    return { ok: true };
  }],
  ['POST', '/admin/platform/owner/reconciliations', (r) => {
    admin(r);
    const cash = computeBooks().cash_balance_rwf;
    const statement = Number(r.body.statement_balance_rwf) || 0;
    const check = {
      id: nextId('rec'),
      account_label: r.body.account_label,
      statement_date: r.body.statement_date,
      statement_balance_rwf: statement,
      system_cash_rwf: cash,
      difference_rwf: statement - cash,
      matches: statement === cash,
      note: r.body.note || '',
    };
    state.owner.reconciliations.unshift(check);
    return { reconciliation: check };
  }],
  ['PUT', '/admin/platform/owner/payout-settings', (r) => {
    admin(r);
    checkCode(r.body.otp_code);
    const b = r.body;
    const phone = b.method === 'mobile_money';
    state.owner.payout_settings = {
      method: b.method,
      account: { provider: phone ? b.network : b.bank_name, account_name: b.account_name, account_number: phone ? b.phone : b.account_number },
      schedule: b.schedule,
    };
    return { payout_settings: state.owner.payout_settings };
  }],

  ['GET', '/admin/users/:id', (r, p) => {
    admin(r);
    const user = adminUsers().find((u) => u.id === p.id) || fail(404, 'User not found.');
    const orders = state.orders.filter((o) => o.customer_id === p.id || o.vendor_id === p.id || o.driver_id === p.id).slice(0, 20).map(adminOrder);
    return { user, orders };
  }],
  ['POST', '/admin/users/:id/erase', (r, p) => {
    admin(r);
    const customer = findCustomer(p.id) || fail(404, 'Only customers can be erased.');
    Object.assign(customer, { name: 'Erased customer', phone_number: '', email: '', status: 'erased', profile_image_url: '' });
    return { ok: true };
  }],
  ['PATCH', '/admin/vendors/:id/nationwide', (r, p) => {
    admin(r);
    const vendor = findVendor(p.id) || fail(404, 'Vendor not found.');
    const current = state.nationwide[vendor.id] || {};
    state.nationwide[vendor.id] = { ...current, enabled: r.body.enabled ?? vendor.vendor_type === 'caterer' };
    return { vendor: adminVendor(vendor) };
  }],
];

/* -------------------------------- routing -------------------------------- */

const ROUTES = [
  ...customerRoutes,
  ...extraCustomerRoutes,
  ...vendorRoutes,
  ...extraVendorRoutes,
  ...driverRoutes,
  ...extraDriverRoutes,
  ...adminRoutes,
  ...extraAdminRoutes,
].map(([method, pattern, handler]) => {
  const keys = [];
  const regex = new RegExp(
    `^${pattern.replace(/:(\w+)/g, (_, key) => {
      keys.push(key);
      return '([^/]+)';
    })}$`,
  );
  // Fixed paths win over parameter paths (/orders/refunds before /orders/:id).
  return { method, regex, keys, handler, specificity: keys.length };
}).sort((a, b) => a.specificity - b.specificity);

/** Admin changes show on the audit page ("vendors.status" for PATCH /admin/vendors/v8/status). */
function logAdminAction(method, path) {
  if (!path.startsWith('/admin/') || path.startsWith('/admin/auth/') || path.includes('/notifications')) return;
  const parts = path.slice('/admin/'.length).split('/');
  const target = parts[1] && !['counts', 'reorder', 'invitations'].includes(parts[1]) ? parts[1] : '';
  const rest = parts.slice(target ? 2 : 1);
  const action = [parts[0], ...(rest.length ? rest : method === 'POST' ? ['create'] : [])].join('.');
  const who = adminProfile();
  state.audit.unshift({
    id: nextId('log'),
    action: method === 'DELETE' ? `${action}.delete` : action,
    admin_name: who.name,
    admin_email: who.email,
    target_type: parts[0].replace(/s$/, ''),
    target_label: target,
    ip: '127.0.0.1',
    created_at: nowIso(),
  });
}

/**
 * Answers one API request.
 * @param {{method:string, path:string, query:URLSearchParams, headers:Object, body:any}} request
 * @returns {{status:number, body:any}}
 */
export function handle(request) {
  load();
  tick();
  const method = request.method.toUpperCase();
  for (const route of ROUTES) {
    if (route.method !== method) continue;
    const match = request.path.match(route.regex);
    if (!match) continue;
    const params = Object.fromEntries(route.keys.map((key, i) => [key, decodeURIComponent(match[i + 1])]));
    try {
      const body = route.handler({ ...request, body: request.body ?? {} }, params);
      if (method !== 'GET') {
        logAdminAction(method, request.path);
        save();
      }
      return { status: 200, body };
    } catch (error) {
      if (!(error instanceof HttpError)) {
        // eslint-disable-next-line no-console
        console.error('[demo api]', method, request.path, error);
        return { status: 500, body: { error: { message: 'The demo backend hit an error. Try resetting the demo data.' } } };
      }
      return { status: error.status, body: { error: { code: error.code, message: error.message } } };
    }
  }
  return {
    status: 501,
    body: { error: { code: 'DEMO_NOT_AVAILABLE', message: 'This part of KitchenLink has no demo data yet. Connect a backend to use it.' } },
  };
}
