import React, { useMemo, useState } from 'react';
import { Users, ArrowRightLeft, Lock, Plus, Minus, ShoppingBag, PackageCheck, Receipt, AlertTriangle } from 'lucide-react';
import { kitchenApi } from '../../../api/kitchenApi';
import { useVendor } from '../../../context/VendorContext';
import { Badge, Button, ErrorNote, Field, Loading, Modal, inputClass, money, minutesAgo, useAction, useLoad } from './ui';

export const SESSION_STATUS = {
  open: { label: 'Seated', tone: 'blue' },
  active: { label: 'Eating', tone: 'amber' },
  awaiting_payment: { label: 'Waiting to pay', tone: 'brown' },
  closing: { label: 'Closing', tone: 'stone' },
  closed: { label: 'Closed', tone: 'stone' },
};

/**
 * One table visit: guests, server, orders, the bill and what still stops it
 * from closing. Every button is checked again by the server; it only shows
 * the ones this person's role allows.
 */
export default function SessionPanel({ sessionId, servers = [], tables = [], onClose, onChanged }) {
  const { can, allowed } = useVendor();
  const { data: s, error, loading, reload } = useLoad(() => kitchenApi.tableSession(sessionId), [sessionId], { intervalMs: 8000 });
  const action = useAction();
  const [ordering, setOrdering] = useState(false);
  const [moveTo, setMoveTo] = useState('');
  const [override, setOverride] = useState(false);
  const [reason, setReason] = useState('');
  const done = async (fn, key) => {
    const ok = await action.run(key, fn);
    if (ok) {
      await reload();
      onChanged?.();
    }
    return ok;
  };
  const freeTables = tables.filter((t) => t.state === 'available');

  return (
    <Modal title={s ? `${s.table.label} · ${SESSION_STATUS[s.status]?.label || s.status}` : 'Table'} onClose={onClose} wide>
      {loading && !s ? (
        <Loading />
      ) : !s ? (
        <ErrorNote message={error} />
      ) : (
        <div className="space-y-4 kl-rise">
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge tone={SESSION_STATUS[s.status]?.tone}>{SESSION_STATUS[s.status]?.label || s.status}</Badge>
            {s.guest_count && <Badge><Users className="w-3 h-3" /> {s.guest_count}</Badge>}
            {s.customer_name && <Badge tone="brown">{s.customer_name}</Badge>}
            {s.source === 'reservation' && <Badge tone="blue">Booking</Badge>}
            <span className="text-xs text-stone-500 self-center">Seated {minutesAgo(s.started_at)}</span>
          </div>

          <div className="grid sm:grid-cols-3 gap-2">
            <Mini label="Orders" value={`${s.orders_count}${s.open_orders ? ` · ${s.open_orders} open` : ''}`} />
            <Mini label="Ready to serve" value={s.ready_items} warn={s.ready_items > 0} />
            <Mini label="Due" value={money(s.balance_due_rwf)} warn={s.balance_due_rwf > 0} />
          </div>

          {(s.orders || []).length > 0 && (
            <div className="rounded-2xl border border-stone-200 divide-y divide-stone-100">
              {s.orders.map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm">
                  <div>
                    <p className="font-bold text-gray-900">{o.order_number}</p>
                    <p className="text-[11px] text-stone-500">{minutesAgo(o.created_at)} · {money(o.total_rwf)}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 justify-end">
                    <Badge tone={o.status === 'delivered' ? 'emerald' : o.status === 'cancelled' ? 'red' : 'amber'}>{o.status === 'delivered' ? 'Served' : o.status}</Badge>
                    {o.status !== 'cancelled' && (
                      <>
                        {allowed('POST /vendor/orders/:order_id/leftovers') && <button type="button" className="text-[11px] font-bold text-[#6d391d] hover:underline" onClick={() => done(() => kitchenApi.packLeftovers(o.id), `left-${o.id}`)}>
                          <PackageCheck className="w-3 h-3 inline" /> Pack leftovers
                        </button>}
                        {o.status !== 'delivered' && allowed('POST /vendor/orders/:order_id/takeaway') && (
                          <button type="button" className="text-[11px] font-bold text-[#6d391d] hover:underline" onClick={() => done(() => kitchenApi.toTakeaway(o.id), `ta-${o.id}`)}>
                            <ShoppingBag className="w-3 h-3 inline" /> To take away
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {s.blockers?.length > 0 && (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
              <p className="font-bold flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Before this table can close</p>
              <ul className="mt-1 space-y-0.5 text-xs">{s.blockers.map((b) => <li key={b.code}>• {b.message}</li>)}</ul>
            </div>
          )}

          <ErrorNote message={action.error} />

          {s.status !== 'closed' && (
            <div className="grid sm:grid-cols-2 gap-3">
              {(can('service.assign_servers') || can('service.transfer_servers') || can('tables.seat')) && (
                <Field label="Server">
                  <select className={inputClass} value={s.server?.id || ''} onChange={(e) => done(() => kitchenApi.setSessionServer(s.id, e.target.value), 'server')}>
                    <option value="">No one yet</option>
                    {servers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </Field>
              )}
              {can('tables.transfer_sessions') && (
                <Field label="Move guests to">
                  <div className="flex gap-2">
                    <select className={inputClass} value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
                      <option value="">A free table…</option>
                      {freeTables.map((t) => <option key={t.id} value={t.id}>{t.label}{t.capacity ? ` (${t.capacity})` : ''}</option>)}
                    </select>
                    <Button variant="secondary" disabled={!moveTo} busy={action.busy === 'move'} onClick={async () => (await done(() => kitchenApi.moveGuests(s.id, moveTo), 'move')) && setMoveTo('')}>
                      <ArrowRightLeft className="w-4 h-4" />
                    </Button>
                  </div>
                </Field>
              )}
            </div>
          )}

          {s.status !== 'closed' && (
            <div className="flex flex-wrap gap-2 pt-1">
              {can('service.order_for_guests') && (
                <Button onClick={() => setOrdering(true)}>
                  <Plus className="w-4 h-4" /> Take an order
                </Button>
              )}
              {(can('tables.close_sessions') || can('reservations.manage_sessions')) && (
                <Button
                  variant={s.can_close ? 'success' : 'secondary'}
                  busy={action.busy === 'close'}
                  disabled={!s.can_close && !(override && reason.trim())}
                  onClick={() => done(() => kitchenApi.closeTableSession(s.id, override ? { override: true, reason } : {}), 'close')}
                >
                  <Lock className="w-4 h-4" /> {override ? 'Close anyway' : 'Close table'}
                </Button>
              )}
              {s.invoice && can('invoices.view') && (
                <a href="/vendor-dashboard/invoices" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold bg-white border border-stone-200 text-stone-700 hover:bg-[#faf6f2]">
                  <Receipt className="w-4 h-4" /> {s.invoice.invoice_number}
                </a>
              )}
            </div>
          )}
          {s.status !== 'closed' && !s.can_close && can('tables.session_override') && (
            <div className="rounded-2xl border border-stone-200 p-3 space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-stone-700">
                <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} /> Close with things still open (manager)
              </label>
              {override && <input className={inputClass} placeholder="Why? (kept on the record)" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} />}
            </div>
          )}
          {s.status === 'closed' && s.close_exceptions?.length > 0 && <p className="text-xs text-stone-500">Closed by {s.closed_by} with: {s.close_exceptions.join(' ')}</p>}
        </div>
      )}
      {ordering && s && <TakeOrder session={s} onClose={() => setOrdering(false)} onPlaced={() => { setOrdering(false); reload(); onChanged?.(); }} />}
    </Modal>
  );
}

function Mini({ label, value, warn }) {
  return (
    <div className={`rounded-2xl border px-3 py-2.5 ${warn ? 'bg-amber-50 border-amber-200' : 'bg-[#fdfaf6] border-stone-200/80'}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">{label}</p>
      <p className="font-black text-gray-900">{value}</p>
    </div>
  );
}

/** A server takes the guests' order. Prices shown are the menu's; the server works out the bill. */
function TakeOrder({ session, onClose, onPlaced }) {
  const { data, error, loading } = useLoad(() => kitchenApi.tableSessionMenu(session.id), [session.id], { intervalMs: 60000 });
  const [lines, setLines] = useState({});
  const [search, setSearch] = useState('');
  const action = useAction();
  const items = useMemo(() => (data?.menu || []).flatMap((g) => g.items.map((i) => ({ ...i, category: g.category }))), [data]);
  const shown = items.filter((i) => !search || i.name.toLowerCase().includes(search.toLowerCase()));
  const chosen = Object.entries(lines).filter(([, l]) => l.quantity > 0);
  const total = chosen.reduce((sum, [key, l]) => sum + (items.find((i) => i.id === key.split('|')[0])?.price_rwf || 0) * l.quantity, 0);
  const bump = (item, takeaway, delta) => {
    const key = `${item.id}|${takeaway ? 't' : 'd'}`;
    setLines((prev) => {
      const q = Math.max(0, Math.min(50, (prev[key]?.quantity || 0) + delta));
      return { ...prev, [key]: { quantity: q, takeaway } };
    });
  };
  const place = () =>
    action.run('place', async () => {
      await kitchenApi.orderForTable(session.id, { items: chosen.map(([key, l]) => ({ menu_item_id: key.split('|')[0], quantity: l.quantity, takeaway: l.takeaway })) });
      onPlaced();
    });

  return (
    <Modal title={`Order for ${session.table.label}`} onClose={onClose} wide>
      {loading && !data ? (
        <Loading />
      ) : (
        <div className="space-y-3">
          <ErrorNote message={error || action.error} />
          <input className={inputClass} placeholder="Find a dish…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="max-h-[48vh] overflow-y-auto divide-y divide-stone-100 rounded-2xl border border-stone-200">
            {shown.map((item) => {
              const dine = lines[`${item.id}|d`]?.quantity || 0;
              const away = lines[`${item.id}|t`]?.quantity || 0;
              return (
                <div key={item.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-gray-900 truncate">{item.name}</p>
                    <p className="text-[11px] text-stone-500">{money(item.price_rwf)}{item.is_available === false ? ' · unavailable' : ''}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Stepper label="Here" value={dine} onMinus={() => bump(item, false, -1)} onPlus={() => bump(item, false, 1)} disabled={item.is_available === false} />
                    <Stepper label="Away" value={away} onMinus={() => bump(item, true, -1)} onPlus={() => bump(item, true, 1)} disabled={item.is_available === false} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-stone-600">About <b className="text-gray-900">{money(total)}</b> <span className="text-[11px]">(the bill shows the final amount)</span></p>
            <Button disabled={!chosen.length} busy={action.busy === 'place'} onClick={place}>Send to the kitchen</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Stepper({ label, value, onMinus, onPlus, disabled }) {
  return (
    <div className="text-center">
      <p className="text-[9px] font-bold uppercase text-stone-400">{label}</p>
      <div className="flex items-center gap-1">
        <button type="button" aria-label={`Less ${label}`} disabled={!value} onClick={onMinus} className="w-7 h-7 rounded-full border border-stone-200 flex items-center justify-center disabled:opacity-30"><Minus className="w-3 h-3" /></button>
        <span className="w-5 text-center text-sm font-black">{value}</span>
        <button type="button" aria-label={`More ${label}`} disabled={disabled} onClick={onPlus} className="w-7 h-7 rounded-full bg-[#2b1206] text-white flex items-center justify-center disabled:opacity-30"><Plus className="w-3 h-3" /></button>
      </div>
    </div>
  );
}

