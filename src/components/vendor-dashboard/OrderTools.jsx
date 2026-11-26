import React, { useState } from 'react';
import { Minus, Plus, Trash2, History, RotateCcw } from 'lucide-react';
import { vendorRequest } from '../../api/vendorApi';
import { kitchenApi } from '../../api/kitchenApi';
import { useVendor } from '../../context/VendorContext';
import { ErrorNote, useLoad, useAction, money, when } from './ops/ui';

const select = 'px-2 py-1.5 rounded-lg border border-stone-200 text-xs bg-white';

/**
 * Kitchen tools on one order: priority, who looks after it, its table, the
 * kitchen's courier, editing items (bills paid in person, before payment),
 * moving items between departments, reopening, and the full history.
 * Each control shows only with its permission; the server checks again.
 */
export default function OrderTools({ orderId }) {
  const { can, menuItems, workspace } = useVendor();
  const { data: order, reload } = useLoad(() => vendorRequest(`/vendor/orders/${encodeURIComponent(orderId)}`), [orderId], { intervalMs: 15000 });
  const needStaff = can('staff.view') && (can('orders.assign_employees') || can('service.assign_servers') || can('delivery.assign_workers') || can('delivery.create_assignments'));
  const { data: staffData } = useLoad(() => (needStaff ? kitchenApi.staff({ status: 'active' }) : Promise.resolve({ staff: [] })), [needStaff], { intervalMs: 120000 });
  const needTables = can('tables.view') && (can('tables.assign_orders') || can('tables.transfer_orders'));
  const { data: tableData } = useLoad(() => (needTables ? kitchenApi.tables() : Promise.resolve({ tables: [] })), [needTables], { intervalMs: 120000 });
  const action = useAction();
  const [adding, setAdding] = useState({ menu_item_id: '', quantity: 1 });
  const [history, setHistory] = useState(null);
  if (!order) return null;
  const open = !['completed', 'cancelled'].includes(order.status);
  const editable = open && order.payment_method === 'in_person' && order.payment_status !== 'paid';
  const run = (key, fn) => action.run(key, async () => { await fn(); reload(); });
  const staff = staffData?.staff || [];
  const departments = workspace?.departments || [];
  const live = (order.items || []).filter((i) => i.service_status !== 'cancelled');

  return (
    <div className="mx-5 sm:mx-6 mb-4 rounded-2xl border border-stone-200 p-3 space-y-3 text-sm">
      <p className="text-[11px] font-black uppercase text-stone-400">Kitchen tools</p>
      <ErrorNote message={action.error} />
      <div className="flex flex-wrap gap-3 items-center">
        {open && can('orders.priorities') && (
          <label className="flex items-center gap-1.5 text-xs font-bold">Priority
            <select className={select} defaultValue={order.priority || 'normal'} onChange={(e) => run('p', () => kitchenApi.orderPriority(order.id, e.target.value))}>
              <option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
            </select>
          </label>
        )}
        {open && staff.length > 0 && (can('orders.assign_employees') || can('service.assign_servers')) && (
          <label className="flex items-center gap-1.5 text-xs font-bold">Looked after by
            <select className={select} defaultValue={order.assigned_staff?.id || ''} onChange={(e) => run('a', () => kitchenApi.assignOrder(order.id, e.target.value))}>
              <option value="">Nobody</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
        )}
        {open && (tableData?.tables || []).length > 0 && (order.table ? can('tables.transfer_orders') : can('tables.assign_orders')) && (
          <label className="flex items-center gap-1.5 text-xs font-bold">{order.table ? 'Move to table' : 'Serve at table'}
            <select className={select} value="" onChange={(e) => e.target.value && run('t', () => kitchenApi.setOrderTable(order.id, e.target.value))}>
              <option value="">{order.table ? order.table.label : 'Choose…'}</option>
              {tableData.tables.filter((t) => t.is_active && t.id !== order.table?.id).map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </label>
        )}
        {open && order.fulfillment === 'vendor_delivery' && staff.length > 0 && (can('delivery.assign_workers') || can('delivery.create_assignments') || can('delivery.change_assignments')) && (
          <label className="flex items-center gap-1.5 text-xs font-bold">Courier
            <select className={select} defaultValue="" onChange={(e) => run('c', () => (e.target.value === '__none' ? kitchenApi.cancelCourier(order.id) : kitchenApi.setCourier(order.id, e.target.value)))}>
              <option value="">Choose…</option>
              {can('delivery.cancel_assignments') && <option value="__none">No courier</option>}
              {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
        )}
      </div>

      {open && (editable || can('orders.assign_departments')) && (
        <ul className="divide-y divide-stone-100">
          {live.map((item) => (
            <li key={item.id} className="py-1.5 flex flex-wrap items-center gap-2">
              <span className="flex-1 min-w-[8rem]">{item.name} <span className="text-stone-400 text-xs">{item.department_name || ''}</span></span>
              {editable && (can('orders.quantities') || can('orders.edit')) && item.service_status === 'pending' && (
                <span className="inline-flex items-center gap-1">
                  <button type="button" aria-label="One less" disabled={item.quantity <= 1} className="w-7 h-7 rounded-full border border-stone-200 flex items-center justify-center disabled:opacity-40" onClick={() => run(`q${item.id}`, () => kitchenApi.setOrderItemQuantity(order.id, item.id, item.quantity - 1))}><Minus className="w-3.5 h-3.5" /></button>
                  <b className="w-5 text-center">{item.quantity}</b>
                  <button type="button" aria-label="One more" className="w-7 h-7 rounded-full border border-stone-200 flex items-center justify-center" onClick={() => run(`q${item.id}`, () => kitchenApi.setOrderItemQuantity(order.id, item.id, item.quantity + 1))}><Plus className="w-3.5 h-3.5" /></button>
                </span>
              )}
              {can('orders.assign_departments') && departments.length > 0 && item.service_status === 'pending' && (
                <select className={select} value={item.department_id || ''} onChange={(e) => run(`d${item.id}`, () => kitchenApi.moveOrderItem(order.id, item.id, e.target.value))}>
                  <option value="">Kitchen</option>{departments.filter((d) => d.is_active).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              )}
              {editable && (can('orders.remove_items') || can('orders.edit')) && live.length > 1 && (
                <button type="button" aria-label={`Remove ${item.name}`} className="text-red-600" onClick={() => window.confirm(`Remove ${item.name}?`) && run(`r${item.id}`, () => kitchenApi.removeOrderItem(order.id, item.id))}><Trash2 className="w-4 h-4" /></button>
              )}
            </li>
          ))}
        </ul>
      )}
      {editable && (can('orders.add_items') || can('orders.edit')) && (
        <div className="flex flex-wrap gap-2 items-center">
          <select className={select} value={adding.menu_item_id} onChange={(e) => setAdding({ ...adding, menu_item_id: e.target.value })}>
            <option value="">Add a dish…</option>
            {menuItems.filter((m) => m.isAvailable).map((m) => <option key={m.id} value={m.id}>{m.name} · {money(m.price)}</option>)}
          </select>
          <input className={`${select} w-16`} type="number" min="1" max="50" value={adding.quantity} onChange={(e) => setAdding({ ...adding, quantity: e.target.value })} />
          <button type="button" disabled={!adding.menu_item_id} className="px-3 py-1.5 rounded-lg bg-[#2b1206] text-white text-xs font-bold disabled:opacity-50" onClick={() => run('add', async () => { await kitchenApi.addOrderItem(order.id, { menu_item_id: adding.menu_item_id, quantity: Number(adding.quantity) }); setAdding({ menu_item_id: '', quantity: 1 }); })}>Add</button>
        </div>
      )}
      {!editable && open && order.payment_method !== 'in_person' && (can('orders.add_items') || can('orders.edit')) && (
        <p className="text-[11px] text-stone-400">Paid in the app: items can't change (cancel the order to refund it).</p>
      )}
      <div className="flex flex-wrap gap-3">
        {(can('orders.reopen') || can('kitchen.completed')) && ['completed', 'cancelled'].includes(order.status) && (
          <button type="button" className="text-xs font-bold text-[#6d391d] inline-flex items-center gap-1" onClick={() => { const reason = window.prompt('Why reopen it?', ''); if (reason !== null) run('re', () => kitchenApi.reopenOrder(order.id, reason || 'Reopened')); }}><RotateCcw className="w-3.5 h-3.5" /> Reopen</button>
        )}
        {(can('audit.order_history') || can('orders.details') || can('orders.view')) && (
          <button type="button" className="text-xs font-bold text-stone-600 inline-flex items-center gap-1" onClick={() => action.run('h', async () => setHistory(history ? null : await kitchenApi.orderHistory(order.id)))}><History className="w-3.5 h-3.5" /> {history ? 'Hide history' : 'Full history'}</button>
        )}
      </div>
      {history && (
        <ol className="text-xs text-stone-600 space-y-1 max-h-48 overflow-y-auto border-l border-stone-200 pl-3">
          {history.timeline.map((e, i) => <li key={i}><span className="text-stone-400">{when(e.at)}</span> {e.text}{e.by ? ` · ${e.by}` : ''}</li>)}
        </ol>
      )}
    </div>
  );
}
