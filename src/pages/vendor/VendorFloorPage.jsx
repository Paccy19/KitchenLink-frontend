import React, { useState } from 'react';
import { LayoutGrid, Users, Clock, UserPlus, CalendarCheck, Bell, Wallet } from 'lucide-react';
import { kitchenApi } from '../../api/kitchenApi';
import { useVendor } from '../../context/VendorContext';
import SessionPanel, { SESSION_STATUS } from '../../components/vendor-dashboard/ops/SessionPanel';
import { PageHeader, Card, Button, Badge, ErrorNote, Empty, Field, Loading, Modal, inputClass, money, when, useLoad, useAction } from '../../components/vendor-dashboard/ops/ui';

const STATE = {
  available: { label: 'Free', ring: 'border-emerald-200 bg-emerald-50/60', dot: 'bg-emerald-500' },
  occupied: { label: 'Occupied', ring: 'border-amber-300 bg-amber-50/70', dot: 'bg-amber-500' },
  reserved: { label: 'Reserved soon', ring: 'border-sky-200 bg-sky-50/70', dot: 'bg-sky-500' },
  unavailable: { label: 'Off', ring: 'border-stone-200 bg-stone-100/70 opacity-60', dot: 'bg-stone-400' },
};

/**
 * The host's floor: every table and what is happening at it, the waiting
 * list and today's bookings. Tap a free table to seat guests, an occupied
 * one to see the visit (server, orders, bill, closing).
 */
export default function VendorFloorPage() {
  const { can } = useVendor();
  const { data, error, loading, reload } = useLoad(() => kitchenApi.floor(), [], { intervalMs: 10000 });
  const [open, setOpen] = useState(null); // { kind: 'seat', table, waiting?, reservation? } | { kind: 'session', id }
  const [adding, setAdding] = useState(false);
  const [area, setArea] = useState('');
  const action = useAction();
  const tables = data?.tables || [];
  const areas = [...new Set(tables.map((t) => t.area).filter(Boolean))];
  const shown = tables.filter((t) => !area || t.area === area);

  if (loading && !data) return <Loading />;
  return (
    <div className="space-y-5">
      <PageHeader
        title="Floor"
        actions={can('tables.waitlist') || can('tables.seat') ? <Button variant="soft" onClick={() => setAdding(true)}><UserPlus className="w-4 h-4" /> Waiting list</Button> : null}
      />
      <ErrorNote message={error || action.error} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(STATE).map(([key, s]) => (
          <div key={key} className="rounded-2xl bg-white border border-stone-200/80 px-4 py-3 flex items-center gap-3">
            <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
            <div>
              <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wide">{s.label}</p>
              <p className="text-xl font-black text-gray-900">{data?.counts?.[key] ?? 0}</p>
            </div>
          </div>
        ))}
      </div>

      {areas.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {['', ...areas].map((a) => (
            <button key={a || 'all'} type="button" onClick={() => setArea(a)} className={`px-3.5 py-2 rounded-full text-xs font-bold border ${area === a ? 'bg-[#2b1206] text-white border-[#2b1206]' : 'bg-white text-stone-600 border-stone-200'}`}>
              {a || 'All areas'}
            </button>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
        <div className="min-w-0">
          {!shown.length ? (
            <Card><Empty icon={LayoutGrid} title="No tables yet">Add tables in Tables & QR first.</Empty></Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {shown.map((t, i) => {
                const st = STATE[t.state];
                const sn = t.session;
                return (
                  <button
                    key={t.id}
                    type="button"
                    style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}
                    disabled={t.state === 'unavailable'}
                    onClick={() => (sn ? setOpen({ kind: 'session', id: sn.id }) : can('tables.seat') && setOpen({ kind: 'seat', table: t }))}
                    className={`kl-rise text-left rounded-3xl border-2 p-4 min-h-[128px] transition hover:-translate-y-0.5 hover:shadow-md ${st.ring}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-display text-2xl text-gray-900 leading-none">{t.label}</p>
                      <span className={`w-2.5 h-2.5 rounded-full mt-1 ${st.dot}`} />
                    </div>
                    <p className="text-[11px] text-stone-500 mt-1">{t.capacity ? `${t.capacity} seats` : 'Any size'}{t.area ? ` · ${t.area}` : ''}</p>
                    {sn ? (
                      <div className="mt-2 space-y-1">
                        <div className="flex flex-wrap gap-1">
                          <Badge tone={SESSION_STATUS[sn.status]?.tone}>{SESSION_STATUS[sn.status]?.label}</Badge>
                          {sn.ready_items > 0 && <Badge tone="amber"><Bell className="w-3 h-3" /> {sn.ready_items}</Badge>}
                          {sn.open_requests > 0 && <Badge tone="red">Calling</Badge>}
                        </div>
                        <p className="text-[11px] text-stone-600 flex items-center gap-1"><Users className="w-3 h-3" /> {sn.guest_count || '?'} · {sn.server?.name || 'no server'} · {sn.minutes} min</p>
                        {sn.balance_due_rwf > 0 && <p className="text-[11px] font-bold text-[#6d391d] flex items-center gap-1"><Wallet className="w-3 h-3" /> {money(sn.balance_due_rwf)}</p>}
                      </div>
                    ) : t.next_reservation ? (
                      <p className="mt-2 text-[11px] font-semibold text-sky-700 flex items-center gap-1"><CalendarCheck className="w-3 h-3" /> {t.next_reservation.name} · {when(t.next_reservation.starts_at)}</p>
                    ) : (
                      <p className="mt-2 text-[11px] font-semibold text-emerald-700">{t.state === 'available' && can('tables.seat') ? 'Tap to seat' : ''}</p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {(data?.waitlist || []).length > 0 && (
            <Card className="!p-4">
              <p className="font-black text-gray-900 mb-2 flex items-center gap-2"><Clock className="w-4 h-4" /> Waiting ({data.waitlist.length})</p>
              <div className="space-y-2">
                {data.waitlist.map((w) => (
                  <div key={w.id} className="rounded-2xl border border-stone-200 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-sm">{w.name} <span className="text-stone-500 font-semibold">· {w.party_size}</span></p>
                      <span className="text-[11px] text-stone-500">{w.waiting_minutes} min{w.quoted_minutes ? ` / ${w.quoted_minutes}` : ''}</span>
                    </div>
                    {w.notes && <p className="text-[11px] text-stone-500">{w.notes}</p>}
                    <div className="flex gap-2 mt-2">
                      {can('tables.seat') && <Button className="!py-1.5 !px-3 !text-xs" onClick={() => setOpen({ kind: 'seat', waiting: w })}>Seat</Button>}
                      <Button variant="secondary" className="!py-1.5 !px-3 !text-xs" busy={action.busy === w.id} onClick={() => action.run(w.id, () => kitchenApi.updateWaitlist(w.id, { status: 'left' })).then(reload)}>Left</Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
          {(data?.arrivals || []).length > 0 && (
            <Card className="!p-4">
              <p className="font-black text-gray-900 mb-2 flex items-center gap-2"><CalendarCheck className="w-4 h-4" /> Bookings today</p>
              <div className="space-y-2">
                {data.arrivals.map((r) => (
                  <div key={r.id} className="rounded-2xl border border-stone-200 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-sm">{r.name} <span className="text-stone-500 font-semibold">· {r.party_size}</span></p>
                      <Badge tone={r.status === 'arrived' ? 'amber' : r.status === 'pending' ? 'stone' : 'blue'}>{r.status === 'arrived' ? 'Here' : r.status}</Badge>
                    </div>
                    <p className="text-[11px] text-stone-500">{when(r.starts_at)}{r.table ? ` · ${r.table.label}` : ''}{r.has_preorder ? ' · pre-order' : ''}{r.deposit_status === 'paid' ? ' · deposit paid' : ''}</p>
                    {r.special_requests && <p className="text-[11px] text-stone-600 mt-0.5">“{r.special_requests}”</p>}
                    <div className="flex gap-2 mt-2">
                      {r.status === 'confirmed' && can('reservations.check_in') && (
                        <Button variant="soft" className="!py-1.5 !px-3 !text-xs" busy={action.busy === `a${r.id}`} onClick={() => action.run(`a${r.id}`, () => kitchenApi.reservationStep(r.id, 'arrive')).then(reload)}>Arrived</Button>
                      )}
                      {['confirmed', 'arrived'].includes(r.status) && (can('tables.seat') || can('reservations.manage_sessions')) && (
                        <Button className="!py-1.5 !px-3 !text-xs" onClick={() => setOpen({ kind: 'seat', reservation: r })}>Seat</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {open?.kind === 'seat' && <SeatGuests target={open} tables={tables} servers={data?.servers || []} onClose={() => setOpen(null)} onDone={() => { setOpen(null); reload(); }} />}
      {open?.kind === 'session' && <SessionPanel sessionId={open.id} servers={data?.servers || []} tables={tables} onClose={() => setOpen(null)} onChanged={reload} />}
      {adding && <AddWaiting onClose={() => setAdding(false)} onDone={() => { setAdding(false); reload(); }} />}
    </div>
  );
}

function SeatGuests({ target, tables, servers, onClose, onDone }) {
  const { can } = useVendor();
  const party = target.reservation?.party_size || target.waiting?.party_size || 2;
  const [form, setForm] = useState({
    table_id: target.table?.id || target.reservation?.table?.id || '',
    guest_count: party,
    customer_name: target.waiting?.name || target.reservation?.name || '',
    server_id: '',
  });
  const [confirm, setConfirm] = useState(null); // server asked to confirm (too small / reserved)
  const action = useAction();
  const free = tables.filter((t) => t.state === 'available' || t.state === 'reserved' || t.id === form.table_id);
  const submit = () =>
    action.run('seat', async () => {
      try {
        if (target.reservation) await kitchenApi.reservationStep(target.reservation.id, 'seat', { table_id: form.table_id, server_id: form.server_id || undefined, guest_count: Number(form.guest_count), allow_over_capacity: confirm === 'TABLE_TOO_SMALL' || undefined });
        else
          await kitchenApi.seatGuests({
            ...form,
            guest_count: Number(form.guest_count),
            server_id: form.server_id || undefined,
            waitlist_id: target.waiting?.id,
            allow_over_capacity: confirm === 'TABLE_TOO_SMALL' || undefined,
            ignore_reservation: confirm === 'TABLE_RESERVED' || undefined,
          });
        onDone();
      } catch (err) {
        if (['TABLE_TOO_SMALL', 'TABLE_RESERVED'].includes(err.code)) setConfirm(err.code);
        throw err;
      }
    });
  return (
    <Modal title={target.reservation ? `Seat ${target.reservation.name}` : target.waiting ? `Seat ${target.waiting.name}` : `Seat guests at ${target.table.label}`} onClose={onClose}>
      <div className="space-y-3">
        {!target.table && (
          <Field label="Table">
            <select className={inputClass} value={form.table_id} onChange={(e) => { setConfirm(null); setForm({ ...form, table_id: e.target.value }); }}>
              <option value="">Pick a table…</option>
              {free.map((t) => <option key={t.id} value={t.id}>{t.label}{t.capacity ? ` · ${t.capacity} seats` : ''}{t.state === 'reserved' ? ' · reserved soon' : ''}</option>)}
            </select>
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Guests"><input type="number" min={1} max={200} className={inputClass} value={form.guest_count} onChange={(e) => { setConfirm(null); setForm({ ...form, guest_count: e.target.value }); }} /></Field>
          {!target.reservation && <Field label="Name (optional)"><input className={inputClass} value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} maxLength={80} /></Field>}
        </div>
        {(can('service.assign_servers') || can('tables.seat')) && servers.length > 0 && (
          <Field label="Server">
            <select className={inputClass} value={form.server_id} onChange={(e) => setForm({ ...form, server_id: e.target.value })}>
              <option value="">The table's usual server</option>
              {servers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
        )}
        <ErrorNote message={action.error} />
        <Button className="w-full" disabled={!form.table_id} busy={action.busy === 'seat'} onClick={submit}>
          {confirm ? 'Seat them anyway' : 'Seat'}
        </Button>
      </div>
    </Modal>
  );
}

function AddWaiting({ onClose, onDone }) {
  const [form, setForm] = useState({ name: '', party_size: 2, phone: '', quoted_minutes: '', notes: '' });
  const action = useAction();
  return (
    <Modal title="Add to the waiting list" onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name"><input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={80} /></Field>
          <Field label="Guests"><input type="number" min={1} className={inputClass} value={form.party_size} onChange={(e) => setForm({ ...form, party_size: e.target.value })} /></Field>
          <Field label="Phone (optional)"><input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={20} /></Field>
          <Field label="Quoted wait (min)"><input type="number" min={0} className={inputClass} value={form.quoted_minutes} onChange={(e) => setForm({ ...form, quoted_minutes: e.target.value })} /></Field>
        </div>
        <Field label="Notes"><input className={inputClass} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={200} placeholder="High chair, terrace…" /></Field>
        <ErrorNote message={action.error} />
        <Button className="w-full" busy={action.busy === 'add'} onClick={() => action.run('add', async () => { await kitchenApi.addToWaitlist({ ...form, party_size: Number(form.party_size) }); onDone(); })}>Add</Button>
      </div>
    </Modal>
  );
}
