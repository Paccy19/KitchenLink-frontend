/**
 * Demo answers for the kitchen operations endpoints (departments, staff and
 * roles, tables and QR ordering, preparation tickets, the server board,
 * invoices, stock, reports). Simplified: the demo kitchen account is the
 * owner, so it can do everything; table orders are split into tickets.
 *
 * @module demo/kitchenOps
 */

const GROUPS = [
  ['orders', 'Orders', [['orders.view', 'View orders'], ['orders.accept', 'Accept or reject orders'], ['orders.update_status', 'Update order status'], ['orders.cancel', 'Cancel orders'], ['orders.history', 'View order history'], ['orders.handover', 'Confirm pickup codes']]],
  ['departments', 'Services & Departments', [['departments.view', 'View departments'], ['departments.create', 'Create departments'], ['departments.edit', 'Edit departments', true], ['departments.delete', 'Delete departments'], ['departments.manage_staff', 'Manage department employees', true], ['departments.configure_workflow', 'Configure preparation workflows', true]]],
  ['kitchen', 'Kitchen Operations', [['kitchen.view_queue', 'View preparation queues', true], ['kitchen.accept_tasks', 'Accept preparation tasks', true], ['kitchen.start_preparation', 'Start preparation', true], ['kitchen.mark_ready', 'Mark items as ready', true], ['kitchen.view_history', 'View preparation history', true]]],
  ['service', 'Service & Collection', [['service.view_ready', 'View ready items'], ['service.collect', 'Collect prepared items'], ['service.serve', 'Mark items as served'], ['service.delivery_handover', 'View delivery handover details']]],
  ['staff', 'Staff Management', [['staff.view', 'View employees'], ['staff.create', 'Create employee accounts'], ['staff.edit', 'Edit employee accounts'], ['staff.assign_roles', 'Assign roles'], ['staff.manage_permissions', 'Create and edit roles'], ['staff.deactivate', 'Deactivate accounts']]],
  ['tables', 'Tables & QR Codes', [['tables.view', 'View tables'], ['tables.create', 'Create tables'], ['tables.edit', 'Edit tables'], ['tables.delete', 'Delete tables'], ['tables.qr', 'Generate QR codes'], ['tables.assign', 'Manage table sessions']]],
  ['invoices', 'Invoices & Payments', [['invoices.view', 'View invoices'], ['invoices.generate', 'Generate invoices'], ['invoices.edit', 'Edit invoices'], ['invoices.process_payment', 'Process payments'], ['invoices.payment_history', 'View payment history'], ['invoices.refund', 'Manage refunds']]],
  ['inventory', 'Inventory', [['inventory.view', 'View stock', true], ['inventory.add', 'Add stock', true], ['inventory.update', 'Update stock', true], ['inventory.remove', 'Remove stock', true], ['inventory.suppliers', 'Manage suppliers']]],
  ['menu', 'Menu & Products', [['menu.view', 'View products', true], ['menu.create', 'Create products', true], ['menu.edit', 'Edit products', true], ['menu.delete', 'Delete products', true], ['menu.prices', 'Manage prices', true], ['menu.availability', 'Manage availability', true], ['menu.categories', 'Manage categories']]],
  ['reports', 'Reports', [['reports.sales', 'View sales reports'], ['reports.departments', 'View department reports', true], ['reports.staff', 'View employee performance'], ['reports.activity', 'View the activity log']]],
];
const CATEGORIES = [
  { id: 'restaurant', label: 'Restaurant / Food', prefix: 'F' },
  { id: 'coffee', label: 'Coffee / Barista', prefix: 'C' },
  { id: 'bakery', label: 'Bakery', prefix: 'B' },
  { id: 'bar', label: 'Bar / Beverages', prefix: 'D' },
  { id: 'desserts', label: 'Desserts', prefix: 'S' },
  { id: 'juice_bar', label: 'Juice & Smoothies', prefix: 'J' },
  { id: 'custom', label: 'Custom service', prefix: 'X' },
];
const TIMINGS = [
  { id: 'on_order', label: 'When placing the order', gate: 'preparation' },
  { id: 'before_preparation', label: 'Before preparation', gate: 'preparation' },
  { id: 'after_preparation', label: 'After preparation', gate: 'collection' },
  { id: 'before_collection', label: 'Before collection', gate: 'collection' },
  { id: 'after_service', label: 'After receiving the food', gate: 'none' },
  { id: 'end_of_session', label: 'At the end of the table session', gate: 'none' },
];
const STAGE_LABEL = { pending: 'Pending', accepted: 'Accepted', preparing: 'Preparing', ready: 'Ready', cancelled: 'Cancelled' };
const SERVICE_LABEL = { pending: 'Being prepared', waiting_collection: 'Waiting for collection', collected: 'Collected', served: 'Served', cancelled: 'Cancelled' };
const catalogue = () => ({
  groups: GROUPS.map(([id, label, perms]) => ({ id, label, permissions: perms.map(([key, l, scoped]) => ({ key, label: l, scoped: Boolean(scoped), admin_only: false })) })),
  department_categories: CATEGORIES,
  payment_timings: TIMINGS,
  default_roles: [],
});

const makePassword = () => Array.from({ length: 10 }, () => 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 55)]).join('');

export function kitchenOpsRoutes({ getState, me, fail, nextId, nowIso, findVendor, publicVendorDetail, signInStaff }) {
  const ops = (vendorId) => {
    const state = getState();
    state.kitchenOps = state.kitchenOps || {};
    if (!state.kitchenOps[vendorId]) {
      state.kitchenOps[vendorId] = {
        departments: [],
        roles: GROUPS.length
          ? [
              { id: nextId('role'), name: 'Chef', description: 'Prepares food tickets.', permissions: ['orders.view', 'kitchen.view_queue', 'kitchen.accept_tasks', 'kitchen.start_preparation', 'kitchen.mark_ready'], department_ids: [] },
              { id: nextId('role'), name: 'Server / Waiter', description: 'Collects and serves.', permissions: ['service.view_ready', 'service.collect', 'service.serve', 'tables.view', 'invoices.view'], department_ids: [] },
              { id: nextId('role'), name: 'Cashier', description: 'Takes payments.', permissions: ['invoices.view', 'invoices.generate', 'invoices.process_payment', 'invoices.payment_history'], department_ids: [] },
            ]
          : [],
        staff: [],
        tables: [],
        orders: [],
        invoices: [],
        inventory: [],
        movements: [],
        suppliers: [],
        activity: [],
        menuPhotos: [],
        operations: { payment_timing: 'after_service', table_ordering_enabled: true, allow_partial_service: true, inventory_auto_deduct: false },
      };
    }
    return state.kitchenOps[vendorId];
  };
  const mine = (r) => ops(me.vendor(r).id);
  const log = (o, summary, action) => o.activity.unshift({ id: nextId('act'), actor: { type: 'owner', id: null, name: 'Kitchen owner' }, action, summary, created_at: nowIso() });
  const find = (list, id, what) => list.find((x) => x.id === id) || fail(404, `${what} not found.`);
  const stages = (d) => ['pending', ...(d?.workflow?.use_accept === false ? [] : ['accepted']), ...(d?.workflow?.use_preparing === false ? [] : ['preparing']), 'ready'];
  const labels = (d) => ({ ...STAGE_LABEL, ...(d?.workflow?.labels || {}) });
  const deptView = (o, d) => ({
    ...d,
    category_label: d.category === 'custom' ? d.custom_category || 'Custom service' : CATEGORIES.find((c) => c.id === d.category)?.label || d.category,
    workflow: { use_accept: d.workflow?.use_accept !== false, use_preparing: d.workflow?.use_preparing !== false, labels: labels(d), stages: stages(d).map((id) => ({ id, label: labels(d)[id] })) },
    staff_count: o.staff.filter((s) => s.department_ids.includes(d.id)).length,
    product_count: (getState().menuItems || []).filter((m) => m.department_id === d.id).length,
    open_tickets: o.orders.flatMap((x) => x.tickets).filter((t) => t.department_id === d.id && t.status !== 'ready').length,
  });
  const tableView = (o, t) => {
    const open = o.orders.filter((x) => x.table_id === t.id && x.status !== 'delivered');
    const bill = o.invoices.find((i) => i.table?.id === t.id && i.is_open);
    return {
      ...t,
      menu_url: `${window.location.origin}/menu/${t.token}`,
      active_orders: open.length,
      ready_items: open.flatMap((x) => x.items).filter((i) => i.service_status === 'waiting_collection').length,
      open_invoice: bill ? { id: bill.id, invoice_number: bill.invoice_number, total_rwf: bill.total_rwf, balance_due_rwf: bill.total_rwf - bill.amount_paid_rwf, status: bill.status } : null,
      occupied: open.length > 0 || Boolean(bill),
    };
  };
  const invoiceView = (inv) => {
    const live = inv.lines.filter((l) => !l.voided);
    const deps = new Map();
    for (const l of live) {
      const e = deps.get(l.department_name) || { department_id: l.department_id, department_name: l.department_name, subtotal_rwf: 0, items: 0 };
      e.subtotal_rwf += l.subtotal_rwf;
      e.items += l.quantity;
      deps.set(l.department_name, e);
    }
    return {
      ...inv,
      balance_due_rwf: Math.max(0, inv.total_rwf - inv.amount_paid_rwf),
      refundable_rwf: Math.max(0, inv.amount_paid_rwf - inv.refunded_rwf),
      accepts_payments: ['unpaid', 'partially_paid'].includes(inv.status),
      line_count: live.length,
      departments: [...deps.values()],
    };
  };
  const recalc = (inv) => {
    inv.subtotal_rwf = inv.lines.filter((l) => !l.voided).reduce((s, l) => s + l.subtotal_rwf, 0);
    inv.total_rwf = Math.max(0, inv.subtotal_rwf - (inv.discount_rwf || 0));
    inv.status = inv.amount_paid_rwf > 0 && inv.refunded_rwf >= inv.amount_paid_rwf ? 'refunded' : inv.total_rwf > 0 && inv.amount_paid_rwf >= inv.total_rwf ? 'paid' : inv.amount_paid_rwf > 0 ? 'partially_paid' : 'unpaid';
    if (inv.status === 'paid') {
      inv.is_open = false;
      inv.paid_at = inv.paid_at || nowIso();
    }
  };
  const ticketsOf = (o, order) =>
    order.tickets.map((t) => {
      const d = o.departments.find((x) => x.id === t.department_id);
      return {
        ...t,
        status_label: labels(d)[t.status],
        items: order.items.filter((i) => i.ticket_id === t.id).map((i) => ({ ...i, service_status_label: SERVICE_LABEL[i.service_status], options: i.options || [] })),
      };
    });
  const syncOrder = (order) => {
    const live = order.tickets.filter((t) => t.status !== 'cancelled');
    if (live.every((t) => t.status === 'ready')) order.status = order.status === 'delivered' ? 'delivered' : 'ready';
    else if (live.some((t) => ['preparing', 'ready'].includes(t.status))) order.status = 'preparing';
    else if (live.some((t) => t.status === 'accepted')) order.status = 'confirmed';
    if (order.items.every((i) => ['served', 'cancelled'].includes(i.service_status))) order.status = 'delivered';
  };
  const tableByToken = (token) => {
    const state = getState();
    for (const [vendorId, o] of Object.entries(state.kitchenOps || {})) {
      const table = o.tables.find((t) => t.token === token);
      if (table) return { vendorId, o, table };
    }
    return fail(404, 'This QR code is not linked to a table any more. Ask a member of staff for help.');
  };
  const guestView = (o, order) => {
    const inv = o.invoices.find((i) => i.id === order.invoice_id);
    return {
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      status_label: { placed: 'Order placed', confirmed: 'Confirmed by kitchen', preparing: 'Preparing your food', ready: 'Ready to be served', delivered: 'Served' }[order.status],
      table_label: order.table_label,
      total_rwf: order.total_rwf,
      departments: ticketsOf(o, order).map((t) => ({ id: t.id, code: t.code, department_id: t.department_id, department_name: t.department_name, status: t.status, status_label: t.status_label, items: t.items })),
      bill: inv ? invoiceView(inv) : null,
    };
  };
  const range = (period, date) => {
    const d = new Date(`${date || new Date().toISOString().slice(0, 10)}T00:00:00`);
    const start = new Date(d);
    const end = new Date(d);
    if (period === 'weekly') {
      start.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      end.setTime(start.getTime() + 7 * 86400000);
    } else if (period === 'monthly') {
      start.setDate(1);
      end.setMonth(start.getMonth() + 1, 1);
    } else if (period === 'yearly') {
      start.setMonth(0, 1);
      end.setFullYear(start.getFullYear() + 1, 0, 1);
    } else end.setDate(d.getDate() + 1);
    return { start, end };
  };
  const report = (o, period = 'daily', date) => {
    const { start, end } = range(period, date);
    const orders = o.orders.filter((x) => new Date(x.created_at) >= start && new Date(x.created_at) < end);
    const sales = orders.reduce((s, x) => s + x.total_rwf, 0);
    const deps = new Map();
    const products = new Map();
    for (const x of orders) {
      for (const i of x.items) {
        const d = deps.get(i.department_name) || { department_id: i.department_id, name: i.department_name, sales_rwf: 0, items_sold: 0, orders: 0, tickets: 0, avg_prep_minutes: null };
        d.sales_rwf += i.subtotal_rwf;
        d.items_sold += i.quantity;
        deps.set(i.department_name, d);
        const p = products.get(i.name) || { name: i.name, department: i.department_name, quantity: 0, sales_rwf: 0 };
        p.quantity += i.quantity;
        p.sales_rwf += i.subtotal_rwf;
        products.set(i.name, p);
      }
    }
    const top = [...products.values()].sort((a, b) => b.quantity - a.quantity);
    const departments = [...deps.values()].sort((a, b) => b.sales_rwf - a.sales_rwf);
    const highlights = orders.length
      ? [`You sold RWF ${sales.toLocaleString('en-US')} across ${orders.length} order${orders.length === 1 ? '' : 's'}.`, ...(top[0] ? [`Best seller: ${top[0].name} (${top[0].quantity} sold).`] : [])]
      : ['No orders in this period.'];
    const label = period === 'yearly' ? String(start.getFullYear()) : period === 'monthly' ? start.toLocaleString('en-GB', { month: 'long', year: 'numeric' }) : period === 'weekly' ? `Week of ${start.toDateString()}` : start.toDateString();
    return {
      period: { type: period, label, start, end },
      live: end > new Date(),
      highlights,
      summary: { orders_placed: orders.length, orders_completed: orders.filter((x) => x.status === 'delivered').length, orders_cancelled: 0, cancelled_value_rwf: 0, sales_rwf: sales, average_order_rwf: orders.length ? Math.round(sales / orders.length) : 0, items_sold: top.reduce((s, p) => s + p.quantity, 0), avg_prep_minutes: null, busiest_hour: null },
      sales: { gross_rwf: sales, commission_rwf: 0 },
      by_fulfillment: orders.length ? { dine_in: { orders: orders.length, sales_rwf: sales } } : {},
      series: [],
      departments,
      top_products: top.slice(0, 10),
      not_sold: [],
      tables: [],
      payments: { invoices_created: o.invoices.length, collected_in_person_rwf: o.invoices.reduce((s, i) => s + i.amount_paid_rwf, 0), collected_by_method: [], paid_online_rwf: 0, outstanding_rwf: o.invoices.reduce((s, i) => s + Math.max(0, i.total_rwf - i.amount_paid_rwf), 0), unpaid_invoices: [], refunded_in_person_rwf: 0, refunded_online_rwf: 0 },
      staff: [],
      inventory: { movements: o.movements.length, most_used: [], low_stock: o.inventory.filter((i) => i.low_stock_threshold > 0 && i.quantity <= i.low_stock_threshold), stock_value_rwf: 0 },
      definitions: { sales: 'Demo data: dine-in orders placed from table QR codes in this browser.' },
    };
  };
  const workspace = (r) => {
    const o = mine(r);
    return {
      actor: { type: 'owner', id: me.vendor(r).id, name: 'Kitchen owner' },
      is_owner: true,
      is_admin: true,
      department_ids: [],
      managed_department_ids: [],
      permissions: {},
      departments: o.departments.map((d) => ({ id: d.id, name: d.name, is_active: d.is_active, category: d.category, code_prefix: d.code_prefix })),
      counts: {
        queue: o.orders.flatMap((x) => x.tickets).filter((t) => t.status !== 'ready').length,
        ready_orders: o.orders.filter((x) => x.items.some((i) => i.service_status === 'waiting_collection')).length,
        open_invoices: o.invoices.filter((i) => ['unpaid', 'partially_paid'].includes(i.status)).length,
        tables: o.tables.length,
        staff: o.staff.length,
      },
      settings: { ...o.operations, payment_timings: TIMINGS },
    };
  };

  return [
    ['GET', '/vendor/workspace', workspace],
    ['GET', '/vendor/permissions', () => catalogue()],
    ['GET', '/vendor/operations', (r) => ({ ...mine(r).operations, payment_timings: TIMINGS })],
    ['PUT', '/vendor/operations', (r) => {
      const o = mine(r);
      Object.assign(o.operations, r.body);
      return { ...o.operations, payment_timings: TIMINGS };
    }],
    ['GET', '/vendor/activity', (r) => ({ items: mine(r).activity.slice(0, 100), meta: { page: 1, limit: 100, total: mine(r).activity.length } })],

    ['GET', '/vendor/departments', (r) => ({ departments: mine(r).departments.map((d) => deptView(mine(r), d)), categories: CATEGORIES })],
    ['GET', '/vendor/departments/:id', (r, p) => {
      const o = mine(r);
      const d = find(o.departments, p.id, 'Department');
      return { ...deptView(o, d), staff: o.staff.filter((s) => s.department_ids.includes(d.id)).map((s) => ({ id: s.id, name: s.name })) };
    }],
    ['POST', '/vendor/departments', (r) => {
      const o = mine(r);
      if (!r.body.name) fail(400, 'Give the department a name.');
      const d = { id: nextId('dep'), name: r.body.name, category: r.body.category || 'custom', custom_category: r.body.custom_category || '', description: r.body.description || '', code_prefix: r.body.code_prefix || CATEGORIES.find((c) => c.id === r.body.category)?.prefix || 'X', is_active: r.body.is_active !== false, workflow: r.body.workflow || {}, stations: r.body.stations || [], manager_staff_ids: r.body.manager_staff_ids || [], image_url: null };
      o.departments.push(d);
      log(o, `Created the ${d.name} department`, 'department.created');
      return deptView(o, d);
    }],
    ['PATCH', '/vendor/departments/:id', (r, p) => {
      const o = mine(r);
      const d = find(o.departments, p.id, 'Department');
      Object.assign(d, r.body);
      return deptView(o, d);
    }],
    ['DELETE', '/vendor/departments/:id', (r, p) => {
      const o = mine(r);
      o.departments = o.departments.filter((d) => d.id !== p.id);
      (getState().menuItems || []).forEach((m) => { if (m.department_id === p.id) m.department_id = null; });
      return { deleted: true, id: p.id };
    }],
    ['PUT', '/vendor/departments/:id/staff', (r, p) => {
      const o = mine(r);
      o.staff.forEach((s) => {
        s.department_ids = s.department_ids.filter((x) => x !== p.id);
        if ((r.body.staff_ids || []).includes(s.id)) s.department_ids.push(p.id);
      });
      return deptView(o, find(o.departments, p.id, 'Department'));
    }],

    ['GET', '/vendor/roles', (r) => {
      const o = mine(r);
      return { roles: o.roles.map((x) => ({ ...x, staff_count: o.staff.filter((s) => s.role_ids.includes(x.id)).length })), catalogue: catalogue() };
    }],
    ['POST', '/vendor/roles', (r) => {
      const o = mine(r);
      if (!r.body.name) fail(400, 'Give the role a name.');
      const role = { id: nextId('role'), name: r.body.name, description: r.body.description || '', permissions: r.body.permissions || [], department_ids: r.body.department_ids || [] };
      o.roles.push(role);
      log(o, `Created the role ${role.name}`, 'role.created');
      return role;
    }],
    ['PATCH', '/vendor/roles/:id', (r, p) => Object.assign(find(mine(r).roles, p.id, 'Role'), r.body)],
    ['DELETE', '/vendor/roles/:id', (r, p) => {
      const o = mine(r);
      if (o.staff.some((s) => s.role_ids.includes(p.id))) fail(409, 'Some employees have this role. Give them another role first.');
      o.roles = o.roles.filter((x) => x.id !== p.id);
      return { deleted: true, id: p.id };
    }],

    ['GET', '/vendor/staff', (r) => {
      const o = mine(r);
      return {
        staff: o.staff.map((s) => ({
          ...s,
          roles: o.roles.filter((x) => s.role_ids.includes(x.id)).map((x) => ({ id: x.id, name: x.name })),
          departments: o.departments.filter((d) => s.department_ids.includes(d.id)).map((d) => ({ id: d.id, name: d.name })),
        })),
      };
    }],
    ['POST', '/vendor/staff', (r) => {
      const o = mine(r);
      if (!r.body.name || (!r.body.username && !r.body.phone && !r.body.email)) fail(400, 'Give the employee a username and password, or a phone number or email.');
      const username = r.body.username ? String(r.body.username).toLowerCase() : null;
      const password = r.body.password || (username ? makePassword() : null);
      const s = { id: nextId('staff'), name: r.body.name, username, phone: r.body.phone || null, email: r.body.email || null, job_title: r.body.job_title || '', role_ids: r.body.role_ids || [], department_ids: r.body.department_ids || [], is_admin: Boolean(r.body.is_admin), is_active: true, has_password: Boolean(password), last_login_at: null };
      o.staff.push(s);
      o.passwords = { ...(o.passwords || {}), ...(username ? { [username]: password } : {}) };
      log(o, `Added ${s.name} to the team`, 'staff.created');
      return { ...s, ...(username ? { credentials: { username, password, generated: !r.body.password } } : {}) };
    }],
    ['PATCH', '/vendor/staff/:id', (r, p) => {
      const o = mine(r);
      const s = find(o.staff, p.id, 'Employee');
      const { password, generate_password: generate, ...rest } = r.body;
      Object.assign(s, rest);
      if (s.username) s.username = String(s.username).toLowerCase();
      const next = password || (generate || (s.username && !s.has_password) ? makePassword() : null);
      if (next && s.username) {
        o.passwords = { ...(o.passwords || {}), [s.username]: next };
        s.has_password = true;
        return { ...s, credentials: { username: s.username, password: next, generated: !password } };
      }
      return s;
    }],
    ['PATCH', '/vendor/staff/:id/status', (r, p) => Object.assign(find(mine(r).staff, p.id, 'Employee'), { is_active: Boolean(r.body.is_active) })],
    ['DELETE', '/vendor/staff/:id', (r, p) => {
      const o = mine(r);
      o.staff = o.staff.filter((s) => s.id !== p.id);
      return { deleted: true, id: p.id };
    }],

    ['GET', '/vendor/tables', (r) => ({ tables: mine(r).tables.map((t) => tableView(mine(r), t)) })],
    ['GET', '/vendor/tables/:id', (r, p) => tableView(mine(r), find(mine(r).tables, p.id, 'Table'))],
    ['POST', '/vendor/tables', (r) => {
      const o = mine(r);
      if (!r.body.label) fail(400, 'Give the table a name.');
      if (o.tables.some((t) => t.label.toLowerCase() === String(r.body.label).toLowerCase())) fail(409, `There is already a table called "${r.body.label}".`);
      const t = { id: nextId('table'), label: r.body.label, area: r.body.area || '', capacity: r.body.capacity || null, is_active: true, token: `demo${Math.random().toString(36).slice(2, 14)}${Date.now().toString(36)}` };
      o.tables.push(t);
      log(o, `Added table ${t.label}`, 'table.created');
      return tableView(o, t);
    }],
    ['POST', '/vendor/tables/batch', (r) => {
      const o = mine(r);
      const created = [];
      const skipped = [];
      for (let n = Number(r.body.from || 1); n <= Number(r.body.to); n += 1) {
        const label = `${r.body.prefix ?? 'Table '}${n}`.trim();
        if (o.tables.some((t) => t.label.toLowerCase() === label.toLowerCase())) skipped.push(label);
        else {
          const t = { id: nextId('table'), label, area: r.body.area || '', capacity: r.body.capacity || null, is_active: true, token: `demo${Math.random().toString(36).slice(2, 14)}${n}` };
          o.tables.push(t);
          created.push(tableView(o, t));
        }
      }
      return { created, skipped };
    }],
    ['PATCH', '/vendor/tables/:id', (r, p) => tableView(mine(r), Object.assign(find(mine(r).tables, p.id, 'Table'), r.body))],
    ['POST', '/vendor/tables/:id/qr/rotate', (r, p) => tableView(mine(r), Object.assign(find(mine(r).tables, p.id, 'Table'), { token: `demo${Math.random().toString(36).slice(2, 16)}` }))],
    ['DELETE', '/vendor/tables/:id', (r, p) => {
      const o = mine(r);
      o.tables = o.tables.filter((t) => t.id !== p.id);
      return { deleted: true, id: p.id };
    }],

    ['GET', '/vendor/kitchen/queue', (r) => {
      const o = mine(r);
      const history = r.query?.get?.('status') === 'history';
      const dep = r.query?.get?.('department_id') || '';
      const tickets = o.orders.flatMap((order) =>
        ticketsOf(o, order)
          .filter((t) => (history ? t.status === 'ready' : t.status !== 'ready' || t.items.some((i) => i.service_status === 'waiting_collection')))
          .filter((t) => !dep || (dep === 'main' ? !t.department_id : t.department_id === dep))
          .map((t) => {
            const d = o.departments.find((x) => x.id === t.department_id);
            const list = stages(d);
            const next = t.status === 'ready' ? [] : list.slice(list.indexOf(t.status) + 1);
            const gate = TIMINGS.find((x) => x.id === o.operations.payment_timing)?.gate;
            return {
              ...t,
              allowed_next_statuses: next.map((id) => ({ id, label: labels(d)[id] })),
              payment_hold: gate === 'preparation' && order.payment_status !== 'paid',
              order: { id: order.id, order_number: order.order_number, fulfillment: 'dine_in', fulfillment_label: 'Dine-in', table_label: order.table_label, guest_name: order.guest_name, order_type: 'immediate', placed_at: order.created_at, payment_status: order.payment_status },
            };
          }),
      );
      return { tickets, meta: { page: 1, limit: 100, total: tickets.length } };
    }],
    ['PATCH', '/vendor/kitchen/orders/:orderId/tickets/:ticketId', (r, p) => {
      const o = mine(r);
      const order = find(o.orders, p.orderId, 'Order');
      const t = find(order.tickets, p.ticketId, 'Ticket');
      t.status = r.body.status;
      if (t.status === 'ready') order.items.filter((i) => i.ticket_id === t.id && i.service_status === 'pending').forEach((i) => { i.service_status = 'waiting_collection'; });
      syncOrder(order);
      log(o, `${t.code} → ${t.status}`, `ticket.${t.status}`);
      return { ticket: t, order_status: order.status };
    }],

    ['GET', '/vendor/service/board', (r) => {
      const o = mine(r);
      const onlyReady = r.query?.get?.('only') === 'ready';
      const orders = o.orders
        .filter((x) => x.status !== 'delivered')
        .filter((x) => !onlyReady || x.items.some((i) => i.service_status === 'waiting_collection'))
        .map((order) => {
          const inv = o.invoices.find((i) => i.id === order.invoice_id);
          const live = order.items.filter((i) => i.service_status !== 'cancelled');
          return {
            id: order.id,
            order_number: order.order_number,
            status: order.status,
            fulfillment: 'dine_in',
            destination: { kind: 'table', label: order.table_label },
            guest_name: order.guest_name,
            placed_at: order.created_at,
            payment_hold: false,
            departments: ticketsOf(o, order),
            counts: { total: live.length, waiting: live.filter((i) => i.service_status === 'waiting_collection').length, collected: live.filter((i) => i.service_status === 'collected').length, served: live.filter((i) => i.service_status === 'served').length, preparing: live.filter((i) => i.service_status === 'pending').length },
            items: order.items.map((i) => ({ ...i, service_status_label: SERVICE_LABEL[i.service_status] })),
            invoice: inv ? { id: inv.id, invoice_number: inv.invoice_number, status: inv.status, total_rwf: inv.total_rwf, balance_due_rwf: inv.total_rwf - inv.amount_paid_rwf } : null,
            delivery: null,
          };
        });
      return { orders, summary: { waiting_items: orders.reduce((s, x) => s + x.counts.waiting, 0), collected_items: orders.reduce((s, x) => s + x.counts.collected, 0), tables: new Set(orders.map((x) => x.destination.label)).size } };
    }],
    ['POST', '/vendor/service/orders/:id/collect', (r, p) => {
      const order = find(mine(r).orders, p.id, 'Order');
      order.items.filter((i) => i.service_status === 'waiting_collection').forEach((i) => { i.service_status = 'collected'; });
      return { id: order.id };
    }],
    ['POST', '/vendor/service/orders/:id/serve', (r, p) => {
      const order = find(mine(r).orders, p.id, 'Order');
      const ids = r.body.item_ids;
      order.items.filter((i) => ['waiting_collection', 'collected'].includes(i.service_status) && (!ids || ids.includes(i.id))).forEach((i) => { i.service_status = 'served'; });
      syncOrder(order);
      return { id: order.id, status: order.status };
    }],

    ['GET', '/vendor/invoices', (r) => {
      const o = mine(r);
      const status = r.query?.get?.('status') || '';
      const list = o.invoices.filter((i) => !status || (status === 'open' ? ['unpaid', 'partially_paid'].includes(i.status) : i.status === status)).map(invoiceView).reverse();
      const open = o.invoices.filter((i) => ['unpaid', 'partially_paid'].includes(i.status));
      return { invoices: list, summary: { open_count: open.length, open_balance_rwf: open.reduce((s, i) => s + i.total_rwf - i.amount_paid_rwf, 0) }, meta: { page: 1, limit: 50, total: list.length } };
    }],
    ['GET', '/vendor/invoices/:id', (r, p) => ({ ...invoiceView(find(mine(r).invoices, p.id, 'Invoice')), kitchen: { name: me.vendor(r).name } })],
    ['POST', '/vendor/invoices/:id/payments', (r, p) => {
      const inv = find(mine(r).invoices, p.id, 'Invoice');
      const amount = Number(r.body.amount_rwf);
      if (!amount || amount > inv.total_rwf - inv.amount_paid_rwf) fail(400, 'That is more than what is still due.');
      inv.amount_paid_rwf += amount;
      inv.payments.push({ id: nextId('pay'), amount_rwf: amount, method: r.body.method, method_label: r.body.method, reference: r.body.reference || '', received_by: 'Kitchen owner', channel: 'in_person', at: nowIso() });
      recalc(inv);
      if (inv.status === 'paid') mine(r).orders.filter((x) => inv.order_ids.includes(x.id)).forEach((x) => { x.payment_status = 'paid'; });
      return invoiceView(inv);
    }],
    ['POST', '/vendor/invoices/:id/refunds', (r, p) => {
      const inv = find(mine(r).invoices, p.id, 'Invoice');
      const amount = Number(r.body.amount_rwf);
      inv.refunded_rwf += amount;
      inv.refunds.push({ id: nextId('ref'), amount_rwf: amount, method_label: r.body.method, reason: r.body.reason, at: nowIso() });
      recalc(inv);
      return invoiceView(inv);
    }],
    ['PATCH', '/vendor/invoices/:id', (r, p) => {
      const inv = find(mine(r).invoices, p.id, 'Invoice');
      Object.assign(inv, r.body);
      recalc(inv);
      return invoiceView(inv);
    }],
    ['POST', '/vendor/invoices/:id/close', (r, p) => invoiceView(Object.assign(find(mine(r).invoices, p.id, 'Invoice'), { is_open: false, closed_at: nowIso() }))],

    ['GET', '/vendor/inventory', (r) => {
      const items = mine(r).inventory.map((i) => ({ ...i, is_low: i.low_stock_threshold > 0 && i.quantity <= i.low_stock_threshold, is_out: i.quantity <= 0, stock_value_rwf: Math.round(i.quantity * (i.cost_per_unit_rwf || 0)), department_name: mine(r).departments.find((d) => d.id === i.department_id)?.name || 'Whole kitchen' }));
      return { items, summary: { count: items.length, low: items.filter((i) => i.is_low && !i.is_out).length, out: items.filter((i) => i.is_out).length, stock_value_rwf: items.reduce((s, i) => s + i.stock_value_rwf, 0) } };
    }],
    ['POST', '/vendor/inventory', (r) => {
      const item = { id: nextId('stock'), name: r.body.name, unit: r.body.unit || 'pcs', quantity: Number(r.body.quantity || 0), low_stock_threshold: Number(r.body.low_stock_threshold || 0), cost_per_unit_rwf: Number(r.body.cost_per_unit_rwf || 0), department_id: r.body.department_id || null, supplier_id: r.body.supplier_id || null };
      mine(r).inventory.push(item);
      return item;
    }],
    ['GET', '/vendor/inventory/movements', (r) => ({ movements: mine(r).movements.slice(0, 100), meta: { page: 1, limit: 100, total: mine(r).movements.length } })],
    ['PATCH', '/vendor/inventory/:id', (r, p) => Object.assign(find(mine(r).inventory, p.id, 'Stock item'), r.body)],
    ['DELETE', '/vendor/inventory/:id', (r, p) => {
      mine(r).inventory = mine(r).inventory.filter((i) => i.id !== p.id);
      return { deleted: true, id: p.id };
    }],
    ['POST', '/vendor/inventory/:id/adjust', (r, p) => {
      const o = mine(r);
      const item = find(o.inventory, p.id, 'Stock item');
      let delta = Number(r.body.delta);
      if (['usage', 'waste'].includes(r.body.reason)) delta = -Math.abs(delta);
      item.quantity = Math.round((item.quantity + delta) * 1000) / 1000;
      o.movements.unshift({ id: nextId('mv'), item_id: item.id, item_name: item.name, unit: item.unit, delta, quantity_after: item.quantity, reason: r.body.reason, note: r.body.note || '', by: 'Kitchen owner', at: nowIso() });
      return item;
    }],
    ['GET', '/vendor/suppliers', (r) => ({ suppliers: mine(r).suppliers })],
    ['POST', '/vendor/suppliers', (r) => {
      const s = { id: nextId('sup'), ...r.body };
      mine(r).suppliers.push(s);
      return s;
    }],
    ['PATCH', '/vendor/suppliers/:id', (r, p) => Object.assign(find(mine(r).suppliers, p.id, 'Supplier'), r.body)],
    ['DELETE', '/vendor/suppliers/:id', (r, p) => {
      mine(r).suppliers = mine(r).suppliers.filter((s) => s.id !== p.id);
      return { deleted: true, id: p.id };
    }],
    ['GET', '/vendor/menu/photos', (r) => ({ photos: mine(r).menuPhotos || [], max: 12 })],
    ['POST', '/vendor/menu/photos', (r) => {
      const o = mine(r);
      o.menuPhotos = o.menuPhotos || [];
      if (o.menuPhotos.length >= 12) fail(409, 'You can add up to 12 menu photos. Remove one first.');
      const image = r.body?.get ? r.body.get('image') : null;
      o.menuPhotos.push({ id: nextId('mp'), url: image && typeof image === 'object' ? URL.createObjectURL(image) : '', caption: '' });
      return { photos: o.menuPhotos, max: 12 };
    }],
    ['PATCH', '/vendor/menu/photos/:id', (r, p) => {
      Object.assign(find(mine(r).menuPhotos || [], p.id, 'Menu photo'), { caption: r.body.caption || '' });
      return { photos: mine(r).menuPhotos, max: 12 };
    }],
    ['DELETE', '/vendor/menu/photos/:id', (r, p) => {
      const o = mine(r);
      o.menuPhotos = (o.menuPhotos || []).filter((x) => x.id !== p.id);
      return { photos: o.menuPhotos, max: 12 };
    }],
    // The demo kitchen's employees sign in to the demo kitchen account.
    ['POST', '/vendor/auth/staff-login', (r) => {
      const state = getState();
      const login = String(r.body.username || '').toLowerCase();
      for (const [vendorId, o] of Object.entries(state.kitchenOps || {})) {
        const staff = o.staff.find((x) => x.username === login && x.is_active !== false);
        if (staff && o.passwords?.[login] === r.body.password) return signInStaff(vendorId, staff);
      }
      return fail(401, 'Wrong username or password.', 'INVALID_CREDENTIALS');
    }],
    // Newer kitchen tools: empty in the demo; changes need a real backend.
    ...[
      ['/vendor/inbox', () => ({ items: [], unread_count: 0, meta: { page: 1, limit: 30, total: 0 } })],
      ['/vendor/inbox/preferences', () => ({ muted: [], alert_types: [] })],
      ['/vendor/customers', () => ({ customers: [], meta: { page: 1, limit: 30, total: 0 } })],
      ['/vendor/feedback', () => ({ feedback: [], average_rating: null, count: 0 })],
      ['/vendor/reservations', () => ({ reservations: [] })],
      ['/vendor/reservations/availability', (r) => ({ at: new Date(), tables: mine(r).tables.map((t) => ({ id: t.id, label: t.label, capacity: t.capacity, is_active: t.is_active !== false, fits: true, free: t.is_active !== false, booked_by: null })) })],
      ['/vendor/sessions', () => ({ sessions: [] })],
      ['/vendor/promotions', () => ({ promotions: [] })],
      ['/vendor/cashier/sessions', () => ({ sessions: [], mine: null })],
      ['/vendor/cashier/report', () => ({ cashiers: [], sessions: [] })],
      ['/vendor/finance/expenses', () => ({ expenses: [], by_category: [], total_rwf: 0, categories: ['Rent', 'Salaries', 'Utilities', 'Other'], meta: { page: 1, limit: 50, total: 0 } })],
      ['/vendor/finance/profit-loss', () => ({ period: { type: 'monthly', label: 'This month' }, revenue: { food_rwf: 0, own_delivery_fees_rwf: 0, total_rwf: 0 }, costs: { commission_rwf: 0, refunds_rwf: 0, expenses_rwf: 0, expenses_by_category: [] }, profit_rwf: 0, margin_percent: null, note: 'Demo data.' })],
      ['/vendor/finance/transactions', () => ({ transactions: [], totals: { in_rwf: 0, out_rwf: 0 } })],
      ['/vendor/purchase-orders', () => ({ purchase_orders: [] })],
      ['/vendor/shifts', () => ({ shifts: [] })],
      ['/vendor/attendance', () => ({ entries: [], totals: [] })],
      ['/vendor/attendance/me', () => ({ clocked_in: false, entry: null, next_shift: null })],
      ['/vendor/service/requests', () => ({ requests: [] })],
      ['/vendor/orders/:id/history', () => ({ timeline: [] })],
      ['/tables/:token/requests', () => ({ requests: [] })],
    ].map(([path, handler]) => ['GET', path, handler]),
    ...[
      ['POST', '/vendor/inbox'], ['POST', '/vendor/inbox/read-all'], ['POST', '/vendor/inbox/:id/read'], ['PUT', '/vendor/inbox/preferences'],
      ['POST', '/vendor/customers'], ['POST', '/vendor/customers/notify'], ['PATCH', '/vendor/customers/:id'], ['POST', '/vendor/customers/:id/points'],
      ['POST', '/vendor/feedback/:id/reply'], ['POST', '/vendor/reservations'], ['PATCH', '/vendor/reservations/:id'],
      ['POST', '/vendor/promotions'], ['PATCH', '/vendor/promotions/:id'], ['DELETE', '/vendor/promotions/:id'],
      ['POST', '/vendor/cashier/sessions'], ['POST', '/vendor/cashier/sessions/:id/close'],
      ['POST', '/vendor/finance/expenses'], ['PATCH', '/vendor/finance/expenses/:id'], ['DELETE', '/vendor/finance/expenses/:id'],
      ['POST', '/vendor/purchase-orders'], ['PATCH', '/vendor/purchase-orders/:id'], ['POST', '/vendor/purchase-orders/:id/receive'],
      ['PATCH', '/vendor/inventory/categories'], ['POST', '/vendor/inventory/:id/transfer'],
      ['POST', '/vendor/shifts'], ['PATCH', '/vendor/shifts/:id'], ['DELETE', '/vendor/shifts/:id'], ['PATCH', '/vendor/attendance/:id'],
      ['POST', '/vendor/attendance/clock-in'], ['POST', '/vendor/attendance/clock-out'],
      ['POST', '/vendor/staff/:id/invite'], ['POST', '/vendor/staff/:id/sign-out'],
      ['PATCH', '/vendor/orders/:id/priority'], ['PATCH', '/vendor/orders/:id/assign'], ['POST', '/vendor/orders/:id/items'],
      ['PATCH', '/vendor/orders/:id/items/:itemId'], ['DELETE', '/vendor/orders/:id/items/:itemId'], ['PATCH', '/vendor/orders/:id/items/:itemId/department'],
      ['POST', '/vendor/orders/:id/reopen'], ['PUT', '/vendor/orders/:id/table'], ['POST', '/vendor/orders/:id/claim'],
      ['PUT', '/vendor/orders/:id/courier'], ['DELETE', '/vendor/orders/:id/courier'], ['PATCH', '/vendor/orders/:id/courier/status'],
      ['PATCH', '/vendor/kitchen/orders/:o/tickets/:t/pause'], ['POST', '/vendor/kitchen/orders/:o/tickets/:t/cancel'], ['PATCH', '/vendor/kitchen/orders/:o/tickets/:t/assign'],
      ['POST', '/vendor/tables/:id/merge'], ['POST', '/vendor/invoices/:id/split'], ['POST', '/vendor/invoices/:id/cancel'],
      ['POST', '/vendor/invoices/:id/apply-code'], ['PUT', '/vendor/invoices/:id/customer'], ['POST', '/vendor/invoices/:id/redeem-points'],
      ['PATCH', '/vendor/service/requests/:id'], ['POST', '/tables/:token/requests'], ['POST', '/tables/:token/orders/:id/feedback'],
      ['PATCH', '/vendor/menu/categories/:id'], ['DELETE', '/vendor/menu/categories/:id'],
    ].map(([method, path]) => [method, path, () => fail(400, 'This works with the real KitchenLink backend; demo mode only shows the screen.', 'DEMO_READ_ONLY')]),
    ['PUT', '/vendor/menu/:id/recipe', (r, p) => ({ menu_item_id: p.id, recipe: r.body.recipe || [] })],

    ['GET', '/vendor/reports', (r) => report(mine(r), r.query?.get?.('period') || 'daily', r.query?.get?.('date'))],
    ['GET', '/vendor/reports/today', (r) => report(mine(r), 'daily')],
    ['GET', '/vendor/reports/history', (r) => ({ period: r.query?.get?.('period') || 'monthly', reports: [] })],

    // Public: what a table's QR code opens.
    ['GET', '/tables/:token', (r, p) => {
      const { vendorId, o, table } = tableByToken(p.token);
      if (!findVendor(vendorId)) fail(404, 'This kitchen is not taking orders on KitchenLink right now.');
      const kitchen = publicVendorDetail(vendorId);
      const timing = TIMINGS.find((t) => t.id === o.operations.payment_timing);
      return {
        table: { label: table.label, area: table.area },
        kitchen,
        departments: o.departments.filter((d) => d.is_active !== false).map((d) => ({ id: d.id, name: d.name, category: d.category })),
        ordering: { can_order: table.is_active !== false && o.operations.table_ordering_enabled !== false, reason: table.is_active === false ? 'This table is not taking orders right now.' : null, payment_timing: timing.id, payment_timing_label: timing.label, pay_before_preparation: timing.gate === 'preparation' },
      };
    }],
    ['POST', '/tables/:token/orders', (r, p) => {
      const { o, table } = tableByToken(p.token);
      if (table.is_active === false) fail(409, 'This table is not taking orders right now.');
      const menu = getState().menuItems || [];
      const number = `OFK-DEMO-${Math.random().toString(16).slice(2, 8).toUpperCase()}`;
      const tickets = new Map();
      const items = (r.body.items || []).map((line) => {
        const dish = menu.find((m) => m.id === line.menu_item_id) || fail(409, 'Some items are no longer available.');
        const dep = o.departments.find((d) => d.id === dish.department_id && d.is_active !== false);
        const key = dep?.id || 'main';
        if (!tickets.has(key)) tickets.set(key, { id: nextId('tk'), department_id: dep?.id || null, department_name: dep?.name || 'Kitchen', code: `${dep?.code_prefix || 'K'}${number.slice(-6)}`, status: 'pending' });
        const qty = Number(line.quantity || 1);
        return { id: nextId('it'), name: dish.name, quantity: qty, subtotal_rwf: dish.price_rwf * qty, department_id: dep?.id || null, department_name: dep?.name || 'Kitchen', ticket_id: tickets.get(key).id, service_status: 'pending', note: line.note || '' };
      });
      if (!items.length) fail(400, 'Add something to your order first.');
      const order = { id: nextId('to'), order_number: number, table_id: table.id, table_label: table.label, guest_name: r.body.guest_name || '', items, tickets: [...tickets.values()], status: 'placed', payment_status: 'pending', total_rwf: items.reduce((s, i) => s + i.subtotal_rwf, 0), created_at: nowIso() };
      o.orders.push(order);
      let inv = o.invoices.find((i) => i.table?.id === table.id && i.is_open && ['unpaid', 'partially_paid'].includes(i.status));
      if (!inv) {
        inv = { id: nextId('inv'), invoice_number: `INV-${String(o.invoices.length + 1).padStart(5, '0')}`, kind: 'table', table: { id: table.id, label: table.label }, is_open: true, order_ids: [], lines: [], payments: [], refunds: [], amount_paid_rwf: 0, refunded_rwf: 0, discount_rwf: 0, delivery_fee_rwf: 0, created_at: nowIso() };
        o.invoices.push(inv);
      }
      inv.order_ids.push(order.id);
      items.forEach((i) => inv.lines.push({ id: nextId('ln'), order_id: order.id, order_number: number, name: i.name, department_id: i.department_id, department_name: i.department_name, quantity: i.quantity, unit_price_rwf: i.subtotal_rwf / i.quantity, subtotal_rwf: i.subtotal_rwf, voided: false }));
      recalc(inv);
      order.invoice_id = inv.id;
      const key = `demo-${order.id}`;
      order.guest_key = key;
      return { order: guestView(o, order), guest_key: key };
    }],
    ['GET', '/tables/:token/orders/:id', (r, p) => {
      const { o } = tableByToken(p.token);
      const order = o.orders.find((x) => x.id === p.id);
      const key = r.headers?.['X-Guest-Key'] || r.headers?.['x-guest-key'];
      if (!order || order.guest_key !== key) fail(404, 'Order not found.');
      return { order: guestView(o, order) };
    }],
  ];
}
