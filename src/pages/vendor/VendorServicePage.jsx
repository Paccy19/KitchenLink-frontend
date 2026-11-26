import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ConciergeBell, UtensilsCrossed, ShoppingBag, Bike, Lock, Receipt, CheckCircle2, Hand, BellRing } from 'lucide-react';
import { kitchenApi } from '../../api/kitchenApi';
import { useVendor } from '../../context/VendorContext';
import { PageHeader, Card, Button, Badge, ErrorNote, Empty, Loading, useLoad, useAction, money, minutesAgo } from '../../components/vendor-dashboard/ops/ui';

const KIND_ICON = { table: UtensilsCrossed, takeaway: ShoppingBag, delivery: Bike };
const ITEM_TONE = { pending: 'stone', waiting_collection: 'amber', collected: 'blue', served: 'emerald', handed_over: 'emerald', cancelled: 'red' };
const FILTERS = [
  { id: 'mine', label: 'My orders' },
  { id: '', label: 'Everything' },
  { id: 'ready', label: 'Ready to collect' },
  { id: 'dine_in', label: 'Tables' },
  { id: 'pickup', label: 'Takeaway' },
  { id: 'delivery', label: 'Delivery' },
];

/**
 * The server board: every order on the floor in one place, with what each
 * department has finished, where it goes (table, takeaway counter, delivery)
 * and buttons to collect and serve — partly, when the kitchen allows it.
 */
export default function VendorServicePage() {
  const { can, allowed, workspace } = useVendor();
  const [filter, setFilter] = useState(can('service.view_ready') ? 'ready' : 'mine');
  const query = filter === 'ready' ? { only: 'ready' } : filter === 'mine' ? { mine: 'true' } : filter ? { fulfillment: filter } : {};
  const { data, error, loading } = useLoad(() => kitchenApi.serviceBoard(query), [filter], { intervalMs: 8000 });
  const action = useAction();
  const orders = data?.orders || [];

  return (
    <div className="space-y-5">
      <PageHeader title="Service & pickup" />
      <div className="grid grid-cols-3 gap-3">
        <SummaryTile label="Items waiting" value={data?.summary?.waiting_items ?? 0} tone="amber" />
        <SummaryTile label="Collected" value={data?.summary?.collected_items ?? 0} />
        <SummaryTile label="Tables served" value={data?.summary?.tables ?? 0} />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.filter((f) => (f.id !== 'delivery' || can('delivery.view_orders')) && (f.id !== 'mine' || (can('service.view_assigned') && workspace?.actor?.type === 'staff'))).map((f) => (
          <button
            key={f.id || 'all'}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`flex-shrink-0 px-3.5 py-2 rounded-full text-xs font-bold border ${filter === f.id ? 'bg-[#2b1206] text-white border-[#2b1206]' : 'bg-white text-stone-600 border-stone-200'}`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {can('service.customer_requests') && <GuestRequests />}
      <ErrorNote message={error || action.error} />
      {loading && !data ? (
        <Loading />
      ) : orders.length === 0 ? (
        <Card>
          <Empty icon={ConciergeBell} title="Nothing waiting">Ready items appear here as soon as a department finishes them.</Empty>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {orders.map((order) => (
            <ServiceCard key={order.id} order={order} action={action} can={can} allowed={allowed} me={workspace?.actor?.id} />
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryTile({ label, value, tone }) {
  return (
    <div className={`rounded-2xl border p-3 text-center ${tone === 'amber' && value ? 'bg-amber-50 border-amber-200' : 'bg-white border-stone-200/80'}`}>
      <p className="text-2xl font-black text-gray-900">{value}</p>
      <p className="text-[11px] font-bold text-stone-500">{label}</p>
    </div>
  );
}

/** Guests asking from their table: the waiter, the bill … */
function GuestRequests() {
  const { data, reload } = useLoad(() => kitchenApi.serviceRequests(), [], { intervalMs: 8000 });
  const action = useAction();
  const rows = data?.requests || [];
  if (!rows.length) return null;
  const set = (r, status) => action.run(r.id, async () => { await kitchenApi.updateServiceRequest(r.id, status); reload(); });
  return (
    <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 space-y-2">
      <p className="text-xs font-black uppercase text-amber-800 flex items-center gap-1.5"><BellRing className="w-4 h-4" /> Guests asking</p>
      {rows.map((r) => (
        <div key={r.id} className="flex items-center gap-2 text-sm bg-white rounded-xl px-3 py-2">
          <span className="font-black">{r.table.label}</span>
          <span className="flex-1">{r.kind_label}{r.note ? ` · ${r.note}` : ''} <span className="text-[11px] text-stone-400">{minutesAgo(r.created_at)}</span></span>
          {r.status === 'open' && <Button variant="secondary" className="!py-1 !px-2.5 !text-xs" busy={action.busy === r.id} onClick={() => set(r, 'acknowledged')}>On my way</Button>}
          <Button variant="success" className="!py-1 !px-2.5 !text-xs" busy={action.busy === r.id} onClick={() => set(r, 'done')}>Done</Button>
        </div>
      ))}
    </div>
  );
}

function ServiceCard({ order, action, can, allowed, me }) {
  const Icon = KIND_ICON[order.destination.kind] || UtensilsCrossed;
  const waiting = order.items.filter((i) => i.service_status === 'waiting_collection');
  const collected = order.items.filter((i) => i.service_status === 'collected');
  const dineIn = order.fulfillment === 'dine_in';
  const collect = (ids) => action.run(`c:${order.id}`, () => kitchenApi.collectItems(order.id, ids));
  const serve = (ids) => action.run(`s:${order.id}`, () => kitchenApi.serveItems(order.id, ids));

  return (
    <div className="rounded-2xl bg-white border border-stone-200/80 shadow-sm p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#2b1206] text-white flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="font-black text-gray-900 truncate">{order.destination.label}</p>
            <p className="text-[11px] text-stone-500 font-semibold">
              {order.order_number} · {minutesAgo(order.placed_at)}
              {order.guest_name ? ` · ${order.guest_name}` : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge tone={order.counts.preparing ? 'stone' : 'emerald'}>{order.counts.preparing ? `${order.counts.preparing} preparing` : 'All prepared'}</Badge>
          {order.priority !== 'normal' && <Badge tone={order.priority === 'urgent' ? 'red' : 'amber'}>{order.priority}</Badge>}
        </div>
      </div>
      {(order.assigned_staff || order.collector || order.kitchen_courier) && (
        <p className="text-[11px] text-stone-500">
          {[order.assigned_staff && `Looked after by ${order.assigned_staff.name}`, order.collector && `Collecting: ${order.collector.name}`, order.kitchen_courier && `Courier: ${order.kitchen_courier.name} (${order.kitchen_courier.status.replace(/_/g, ' ')})`].filter(Boolean).join(' · ')}
        </p>
      )}

      {/* Which departments are done. */}
      <div className="flex flex-wrap gap-1.5">
        {order.departments.map((d) => (
          <Badge key={d.id} tone={d.status === 'ready' ? 'emerald' : d.status === 'cancelled' ? 'red' : 'amber'}>
            {d.department_name}: {d.status_label}
          </Badge>
        ))}
      </div>

      <ul className="divide-y divide-stone-100">
        {order.items.map((item) => (
          <li key={item.id} className="py-1.5 flex items-center justify-between gap-2 text-sm">
            <span className="min-w-0">
              <span className="font-black">{item.quantity}×</span> {item.name}
              <span className="block text-[11px] text-stone-400">{item.department_name}{item.note ? ` · ${item.note}` : ''}</span>
            </span>
            <Badge tone={ITEM_TONE[item.service_status]}>{item.service_status_label}</Badge>
          </li>
        ))}
      </ul>

      {order.delivery && (
        <p className="text-[11px] text-stone-600 bg-stone-50 rounded-lg px-2 py-1.5">
          Deliver to {order.delivery.address}{order.delivery.neighborhood ? `, ${order.delivery.neighborhood}` : ''}. {order.delivery.driver_assigned ? 'A delivery worker is assigned.' : 'Waiting for a delivery worker.'}
        </p>
      )}
      {order.payment_hold && (
        <p className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
          <Lock className="w-3.5 h-3.5" /> The bill must be paid before the food leaves the counter.
        </p>
      )}
      {order.invoice && (
        <Link to={`/vendor-dashboard/invoices?invoice=${order.invoice.id}`} className="flex items-center justify-between text-xs font-bold text-[#6d391d] bg-[#faf6f2] border border-[#ebd7c5] rounded-xl px-3 py-2">
          <span className="inline-flex items-center gap-1.5"><Receipt className="w-4 h-4" /> {order.invoice.invoice_number}</span>
          <span>{order.invoice.balance_due_rwf > 0 ? `${money(order.invoice.balance_due_rwf)} due` : 'Paid'}</span>
        </Link>
      )}

      <div className="flex flex-wrap gap-2">
        {can('service.accept_collection') && !order.collector && (waiting.length > 0) && (
          <Button variant="secondary" className="!py-2 !text-xs" busy={action.busy === `cl:${order.id}`} onClick={() => action.run(`cl:${order.id}`, () => kitchenApi.claimOrder(order.id))}><Hand className="w-4 h-4" /> I'll take it</Button>
        )}
        {order.kitchen_courier && order.kitchen_courier.staff_id === me && order.kitchen_courier.status === 'assigned' && (
          <Button variant="secondary" className="!py-2 !text-xs" busy={action.busy === `ow:${order.id}`} onClick={() => action.run(`ow:${order.id}`, () => kitchenApi.courierOnTheWay(order.id))}><Bike className="w-4 h-4" /> On the way</Button>
        )}
        {waiting.length > 0 && allowed('POST /vendor/service/orders/:order_id/collect') && !dineIn && (
          <Button className="flex-1 !py-2 !text-xs" busy={action.busy === `c:${order.id}`} onClick={() => collect()}>
            Collect {waiting.length} item{waiting.length === 1 ? '' : 's'}
          </Button>
        )}
        {dineIn && (waiting.length > 0 || collected.length > 0) && allowed('POST /vendor/service/orders/:order_id/serve') && (
          <>
            {waiting.length > 0 && allowed('POST /vendor/service/orders/:order_id/collect') && (
              <Button variant="secondary" className="flex-1 !py-2 !text-xs" busy={action.busy === `c:${order.id}`} onClick={() => collect()}>
                Collect
              </Button>
            )}
            <Button variant="success" className="flex-1 !py-2 !text-xs" busy={action.busy === `s:${order.id}`} onClick={() => serve()}>
              <CheckCircle2 className="w-4 h-4" /> Served at table
            </Button>
          </>
        )}
      </div>
      {order.fulfillment === 'pickup' && collected.length > 0 && (
        <p className="text-[11px] text-stone-500">Complete it in Orders with the customer's pickup code when they collect.</p>
      )}
    </div>
  );
}
