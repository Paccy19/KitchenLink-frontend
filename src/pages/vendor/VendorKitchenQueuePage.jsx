import React, { useMemo, useState } from 'react';
import { ChefHat, Clock, Lock, UtensilsCrossed, Bike, ShoppingBag } from 'lucide-react';
import { kitchenApi } from '../../api/kitchenApi';
import { useVendor } from '../../context/VendorContext';
import { PageHeader, Card, Button, Badge, ErrorNote, Empty, Loading, DepartmentTabs, useLoad, useAction, minutesAgo, when } from '../../components/vendor-dashboard/ops/ui';

const STAGE_TONE = { pending: 'amber', accepted: 'blue', preparing: 'brown', ready: 'emerald', cancelled: 'red' };
const FULFILMENT_ICON = { dine_in: UtensilsCrossed, pickup: ShoppingBag, delivery: Bike, vendor_delivery: Bike };

/**
 * The preparation queue: each department sees only its own tickets (the
 * server filters them by the person's departments) and moves them through
 * its own stages. The order's overall status follows from all its tickets.
 */
export default function VendorKitchenQueuePage() {
  const { workspace } = useVendor();
  const [department, setDepartment] = useState('');
  const [view, setView] = useState('live');
  const { data, error, loading } = useLoad(
    () => kitchenApi.queue({ department_id: department || undefined, status: view === 'history' ? 'history' : undefined }),
    [department, view],
    { intervalMs: 8000 },
  );
  const action = useAction();
  const tickets = data?.tickets || [];
  const columns = useMemo(() => {
    const groups = { pending: [], accepted: [], preparing: [], ready: [] };
    for (const ticket of tickets) (groups[ticket.status] || (groups[ticket.status] = [])).push(ticket);
    return groups;
  }, [tickets]);

  const visibleDepartments = (workspace?.departments || []).filter(
    (d) => workspace?.is_admin || workspace?.permissions?.['kitchen.view_queue'] === 'all' || (workspace?.permissions?.['kitchen.view_queue'] || []).includes(d.id),
  );

  const move = (ticket, status) => action.run(`${ticket.id}:${status}`, () => kitchenApi.advanceTicket(ticket.order.id, ticket.id, status));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Preparation"
        subtitle="Tickets for your departments. Each department prepares only its own items."
        actions={
          <div className="flex rounded-xl bg-stone-100 p-1">
            {['live', 'history'].map((v) => (
              <button key={v} type="button" onClick={() => setView(v)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${view === v ? 'bg-white shadow text-gray-900' : 'text-stone-500'}`}>
                {v === 'live' ? 'Live queue' : 'History'}
              </button>
            ))}
          </div>
        }
      />
      <DepartmentTabs departments={visibleDepartments} value={department} onChange={setDepartment} includeNone={workspace?.is_admin} />
      <ErrorNote message={error || action.error} />
      {loading && !data ? (
        <Loading />
      ) : tickets.length === 0 ? (
        <Card>
          <Empty icon={ChefHat} title={view === 'history' ? 'No finished tickets yet' : 'Nothing to prepare'}>
            New orders appear here on their own.
          </Empty>
        </Card>
      ) : view === 'history' ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-4">
          {['pending', 'accepted', 'preparing', 'ready'].map((stage) => (
            <div key={stage} className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-black uppercase tracking-wide text-stone-500">{stage === 'pending' ? 'New' : stage}</h3>
                <Badge tone={STAGE_TONE[stage]}>{columns[stage]?.length || 0}</Badge>
              </div>
              {(columns[stage] || []).map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} busy={action.busy} onMove={move} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TicketCard({ ticket, onMove, busy }) {
  const Icon = FULFILMENT_ICON[ticket.order.fulfillment] || UtensilsCrossed;
  const where = ticket.order.table_label || ticket.order.fulfillment_label;
  return (
    <div className="rounded-2xl bg-white border border-stone-200/80 shadow-sm p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-black text-gray-900">{ticket.code}</p>
          <p className="text-[11px] text-stone-500 font-semibold truncate">{ticket.department_name} · {ticket.order.order_number}</p>
        </div>
        <Badge tone={STAGE_TONE[ticket.status]}>{ticket.status_label}</Badge>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-stone-600">
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#faf6f2] text-[#6d391d]">
          <Icon className="w-3.5 h-3.5" /> {where}
        </span>
        {ticket.order.guest_name && <span>{ticket.order.guest_name}</span>}
        <span className="inline-flex items-center gap-1 text-stone-400">
          <Clock className="w-3.5 h-3.5" /> {ticket.order.order_type !== 'immediate' && ticket.order.scheduled_for ? `for ${when(ticket.order.scheduled_for)}` : minutesAgo(ticket.order.placed_at)}
        </span>
      </div>
      <ul className="space-y-1.5">
        {ticket.items.map((item) => (
          <li key={item.id} className="text-sm">
            <span className="font-black text-gray-900">{item.quantity}×</span> <span className="font-semibold text-gray-800">{item.name}</span>
            {item.options.length > 0 && <p className="text-[11px] text-stone-500 ml-5">{item.options.join(', ')}</p>}
            {item.note && <p className="text-[11px] text-amber-700 font-semibold ml-5">Note: {item.note}</p>}
          </li>
        ))}
      </ul>
      {ticket.payment_hold && (
        <p className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
          <Lock className="w-3.5 h-3.5" /> Waiting for payment before preparation
        </p>
      )}
      {onMove && ticket.allowed_next_statuses.length > 0 && !ticket.payment_hold && (
        <div className="flex flex-wrap gap-2">
          {ticket.allowed_next_statuses.map((next, index) => (
            <Button
              key={next.id}
              variant={index === 0 ? (next.id === 'ready' ? 'success' : 'primary') : 'secondary'}
              className="flex-1 !py-2 !text-xs"
              busy={busy === `${ticket.id}:${next.id}`}
              onClick={() => onMove(ticket, next.id)}
            >
              {next.id === 'ready' ? `Mark ${next.label.toLowerCase()}` : next.label}
            </Button>
          ))}
        </div>
      )}
      {ticket.assigned_staff_name && <p className="text-[11px] text-stone-400">By {ticket.assigned_staff_name}</p>}
    </div>
  );
}
