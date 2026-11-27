import React, { useMemo, useState } from 'react';
import { ChefHat, Clock, Lock, UtensilsCrossed, Bike, ShoppingBag, Pause, Play, XCircle, UserPlus, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { kitchenApi } from '../../api/kitchenApi';
import { useVendor } from '../../context/VendorContext';
import { PageHeader, Card, Button, Badge, ErrorNote, Empty, Loading, DepartmentTabs, Modal, inputClass, useLoad, useAction, minutesAgo, when } from '../../components/vendor-dashboard/ops/ui';

const STAGE_TONE = { pending: 'amber', accepted: 'blue', preparing: 'brown', ready: 'emerald', cancelled: 'red' };
const FULFILMENT_ICON = { dine_in: UtensilsCrossed, pickup: ShoppingBag, delivery: Bike, vendor_delivery: Bike };

/**
 * The preparation queue: each department sees only its own tickets (the
 * server filters them by the person's departments) and moves them through
 * its own stages. The order's overall status follows from all its tickets.
 */
export default function VendorKitchenQueuePage() {
  const { workspace, can } = useVendor();
  const { data: staffData } = useLoad(() => (can('kitchen.assign_tasks') && can('staff.view') ? kitchenApi.staff({ status: 'active' }) : Promise.resolve({ staff: [] })), [], { intervalMs: 120000 });
  const [department, setDepartment] = useState('');
  const [view, setView] = useState('live');
  const { data, error, loading } = useLoad(
    () => kitchenApi.queue({ department_id: department || undefined, status: view === 'history' ? 'history' : undefined }),
    [department, view],
    { intervalMs: 8000 },
  );
  const action = useAction();
  const [flagging, setFlagging] = useState(null); // { ticket, kind }
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
  const tools = {
    pause: (ticket) => {
      const reason = ticket.paused ? '' : window.prompt('Why is it paused? (optional)', '') ?? null;
      if (reason === null) return;
      action.run(`${ticket.id}:pause`, () => kitchenApi.pauseTicket(ticket.order.id, ticket.id, !ticket.paused, reason));
    },
    cancel: (ticket) => {
      const reason = window.prompt(`Cancel the ${ticket.department_name} part of ${ticket.order.order_number}? Say why:`, '');
      if (reason) action.run(`${ticket.id}:cancel`, () => kitchenApi.cancelTicket(ticket.order.id, ticket.id, reason));
    },
    assign: (ticket, staffId) => action.run(`${ticket.id}:assign`, () => kitchenApi.assignTicket(ticket.order.id, ticket.id, staffId)),
    // A problem: late or a dish we can't make (the customer is told), or we need help (the floor).
    flag: (ticket, kind) => setFlagging({ ticket, kind }),
    resolve: (ticket, index) => action.run(`${ticket.id}:resolve`, () => kitchenApi.resolveTicketFlag(ticket.order.id, ticket.id, index)),
    staff: staffData?.staff || [],
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Preparation"
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
                <TicketCard key={ticket.id} ticket={ticket} busy={action.busy} onMove={move} tools={tools} can={can} />
              ))}
            </div>
          ))}
        </div>
      )}
      {flagging && (
        <FlagDialog
          {...flagging}
          onClose={() => setFlagging(null)}
          onSend={(body) => action.run(`${flagging.ticket.id}:flag`, async () => {
            await kitchenApi.flagTicket(flagging.ticket.order.id, flagging.ticket.id, body);
            setFlagging(null);
          })}
          busy={action.busy === `${flagging.ticket.id}:flag`}
          error={action.error}
        />
      )}
    </div>
  );
}

const FLAG_TITLES = { delayed: 'Running late', unavailable: "Can't make a dish", assistance: 'Need help' };

/** Running late (how long), a dish we can't make (which), or help: the customer hears the first two. */
function FlagDialog({ ticket, kind, onClose, onSend, busy, error }) {
  const pending = (ticket.items || []).filter((i) => i.service_status === 'pending');
  const [minutes, setMinutes] = useState(10);
  const [items, setItems] = useState(pending.length === 1 ? [pending[0].id] : []);
  const [note, setNote] = useState('');
  const toggle = (id) => setItems((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  const send = () =>
    onSend({
      kind,
      note: note.trim(),
      ...(kind === 'delayed' ? { minutes } : {}),
      ...(kind === 'unavailable' ? { item_ids: items } : {}),
    });
  return (
    <Modal title={`${FLAG_TITLES[kind]}: ${ticket.order.table_label || ticket.order.order_number}`} onClose={onClose}>
      <div className="space-y-4">
        {kind === 'delayed' && (
          <div>
            <p className="text-xs font-bold text-stone-500 mb-2">About how many more minutes?</p>
            <div className="flex flex-wrap gap-2">
              {[5, 10, 15, 20, 30, 45].map((m) => (
                <button key={m} type="button" onClick={() => setMinutes(m)} className={`px-3 py-2 rounded-full text-sm font-bold border ${minutes === m ? 'bg-[#2b1206] text-white border-[#2b1206]' : 'bg-white border-stone-200 text-stone-700'}`}>{m} min</button>
              ))}
            </div>
          </div>
        )}
        {kind === 'unavailable' && (
          <div>
            <p className="text-xs font-bold text-stone-500 mb-2">Which dish can't you make?</p>
            <div className="space-y-1.5">
              {pending.map((i) => (
                <label key={i.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={items.includes(i.id)} onChange={() => toggle(i.id)} className="accent-[#2b1206]" />
                  {i.quantity}× {i.name}
                </label>
              ))}
              {!pending.length && <p className="text-sm text-stone-500">Every dish on this ticket is already made.</p>}
            </div>
          </div>
        )}
        <textarea className={`${inputClass} min-h-[70px]`} maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder={kind === 'assistance' ? 'What do you need?' : 'A word for the customer (optional): "Fresh batch coming", "We have chocolate cake instead"'} />
        <p className="text-[11px] text-stone-500">
          {kind === 'assistance' ? 'The server and the floor are alerted.' : kind === 'delayed' ? 'The customer sees how long, and the server is alerted.' : 'The customer chooses: continue without it, choose something else, or cancel. You and the server see the answer.'}
        </p>
        <ErrorNote message={error} />
        <Button className="w-full" busy={busy} disabled={kind === 'unavailable' && !items.length} onClick={send}>Send</Button>
      </div>
    </Modal>
  );
}

function TicketCard({ ticket, onMove, busy, tools, can = () => false }) {
  const Icon = FULFILMENT_ICON[ticket.order.fulfillment] || UtensilsCrossed;
  const where = ticket.order.table_label || ticket.order.fulfillment_label;
  return (
    <div className="rounded-2xl bg-white border border-stone-200/80 shadow-sm p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-black text-gray-900">{ticket.code}</p>
          <p className="text-[11px] text-stone-500 font-semibold truncate">{ticket.department_name} · {ticket.order.order_number}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge tone={STAGE_TONE[ticket.status]}>{ticket.status_label}</Badge>
          {ticket.order.priority && ticket.order.priority !== 'normal' && <Badge tone={ticket.order.priority === 'urgent' ? 'red' : 'amber'}>{ticket.order.priority}</Badge>}
        </div>
      </div>
      {(ticket.flags || []).filter((f) => !f.resolved_at).map((f) => (
        <p key={f.index} className="flex items-center justify-between gap-2 text-[11px] font-bold text-red-800 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5">
          <span className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> {{ delayed: 'Running late', unavailable: "Can't make an item", assistance: 'Needs help' }[f.kind]}{f.note ? `: ${f.note}` : ''}</span>
          {tools && <button type="button" aria-label="Sorted out" className="text-red-700" onClick={() => tools.resolve(ticket, f.index)}><CheckCircle2 className="w-4 h-4" /></button>}
        </p>
      ))}
      {ticket.items.some((i) => i.takeaway) && (
        <p className="flex items-center gap-1.5 text-[11px] font-bold text-[#6d391d] bg-[#faf6f2] border border-[#ebd7c5] rounded-lg px-2 py-1.5">
          <ShoppingBag className="w-3.5 h-3.5" /> To take away: {ticket.items.filter((i) => i.takeaway).map((i) => i.name).join(', ')}
        </p>
      )}
      {ticket.paused && (
        <p className="flex items-center gap-1.5 text-[11px] font-bold text-sky-800 bg-sky-50 border border-sky-200 rounded-lg px-2 py-1.5">
          <Pause className="w-3.5 h-3.5" /> Paused{ticket.pause_reason ? `: ${ticket.pause_reason}` : ''}
        </p>
      )}
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
      {onMove && ticket.allowed_next_statuses.length > 0 && !ticket.payment_hold && !ticket.paused && (
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
      {tools && ticket.status !== 'ready' && (
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-stone-100">
          {can('kitchen.pause', ticket.department_id) && (
            <button type="button" className="text-[11px] font-bold text-stone-600 inline-flex items-center gap-1" onClick={() => tools.pause(ticket)}>
              {ticket.paused ? <><Play className="w-3.5 h-3.5" /> Resume</> : <><Pause className="w-3.5 h-3.5" /> Pause</>}
            </button>
          )}
          {can('kitchen.flag_issues', ticket.department_id) && (
            <select aria-label="Report a problem" className="bg-transparent text-[11px] font-bold text-red-700" value="" onChange={(e) => e.target.value && tools.flag(ticket, e.target.value)}>
              <option value="">Problem…</option>
              <option value="delayed">Running late</option>
              <option value="unavailable">Can't make an item</option>
              <option value="assistance">Need help</option>
            </select>
          )}
          {can('kitchen.cancel_tasks', ticket.department_id) && (
            <button type="button" className="text-[11px] font-bold text-red-600 inline-flex items-center gap-1" onClick={() => tools.cancel(ticket)}><XCircle className="w-3.5 h-3.5" /> Cancel part</button>
          )}
          {can('kitchen.assign_tasks', ticket.department_id) && tools.staff.length > 0 && (
            <label className="text-[11px] font-bold text-stone-600 inline-flex items-center gap-1">
              <UserPlus className="w-3.5 h-3.5" />
              <select className="bg-transparent text-[11px]" value={ticket.assigned_staff_id || ''} onChange={(e) => tools.assign(ticket, e.target.value)}>
                <option value="">Give to…</option>
                {tools.staff.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </label>
          )}
        </div>
      )}
    </div>
  );
}
