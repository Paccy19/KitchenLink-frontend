import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ConciergeBell, UtensilsCrossed, ShoppingBag, Bike, Lock, Receipt, CheckCircle2 } from 'lucide-react';
import { kitchenApi } from '../../api/kitchenApi';
import { useVendor } from '../../context/VendorContext';
import { PageHeader, Card, Button, Badge, ErrorNote, Empty, Loading, useLoad, useAction, money, minutesAgo } from '../../components/vendor-dashboard/ops/ui';

const KIND_ICON = { table: UtensilsCrossed, takeaway: ShoppingBag, delivery: Bike };
const ITEM_TONE = { pending: 'stone', waiting_collection: 'amber', collected: 'blue', served: 'emerald', handed_over: 'emerald', cancelled: 'red' };
const FILTERS = [
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
  const { can } = useVendor();
  const [filter, setFilter] = useState('ready');
  const query = filter === 'ready' ? { only: 'ready' } : filter ? { fulfillment: filter } : {};
  const { data, error, loading } = useLoad(() => kitchenApi.serviceBoard(query), [filter], { intervalMs: 8000 });
  const action = useAction();
  const orders = data?.orders || [];

  return (
    <div className="space-y-5">
      <PageHeader title="Service & pickup" subtitle="Ready items, where they go, and what's still being prepared." />
      <div className="grid grid-cols-3 gap-3">
        <SummaryTile label="Items waiting" value={data?.summary?.waiting_items ?? 0} tone="amber" />
        <SummaryTile label="Collected" value={data?.summary?.collected_items ?? 0} />
        <SummaryTile label="Tables served" value={data?.summary?.tables ?? 0} />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.filter((f) => f.id !== 'delivery' || can('service.delivery_handover')).map((f) => (
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
            <ServiceCard key={order.id} order={order} action={action} can={can} />
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

function ServiceCard({ order, action, can }) {
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
        <Badge tone={order.counts.preparing ? 'stone' : 'emerald'}>{order.counts.preparing ? `${order.counts.preparing} preparing` : 'All prepared'}</Badge>
      </div>

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
        {waiting.length > 0 && can('service.collect') && !dineIn && (
          <Button className="flex-1 !py-2 !text-xs" busy={action.busy === `c:${order.id}`} onClick={() => collect()}>
            Collect {waiting.length} item{waiting.length === 1 ? '' : 's'}
          </Button>
        )}
        {dineIn && (waiting.length > 0 || collected.length > 0) && can('service.serve') && (
          <>
            {waiting.length > 0 && can('service.collect') && (
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
