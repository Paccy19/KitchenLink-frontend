import React, { useState } from 'react';
import { CalendarClock, Plus, Users } from 'lucide-react';
import { kitchenApi } from '../../api/kitchenApi';
import { useVendor } from '../../context/VendorContext';
import { PageHeader, Card, Button, Badge, ErrorNote, Empty, Loading, Modal, Field, inputClass, useLoad, useAction, money, when } from '../../components/vendor-dashboard/ops/ui';

const TONE = { pending: 'amber', confirmed: 'blue', booked: 'blue', arrived: 'brown', seated: 'emerald', completed: 'stone', cancelled: 'red', rejected: 'red', no_show: 'amber' };
const LABEL = { pending: 'To confirm', confirmed: 'Confirmed', booked: 'Confirmed', arrived: 'Arrived', seated: 'Seated', completed: 'Finished', cancelled: 'Cancelled', rejected: 'Declined', no_show: 'No-show' };
const DEPOSIT = { required: ['Deposit due', 'amber'], paid: ['Deposit paid', 'emerald'], applied: ['Deposit on the bill', 'stone'], refunded: ['Give deposit back', 'red'], forfeited: ['Deposit kept', 'stone'] };
// Buttons for the steps the server allows next (allowed_next_statuses).
const STEP = {
  confirmed: ['confirm', 'Confirm', 'success', 'reservations.confirm'],
  rejected: ['reject', 'Decline', 'danger', 'reservations.confirm'],
  arrived: ['arrive', 'Arrived', 'soft', 'reservations.check_in'],
  seated: ['seat', 'Seat', 'success', 'reservations.manage_sessions'],
  cancelled: ['cancel', 'Cancel', 'danger', 'reservations.cancel'],
  no_show: ['no-show', 'No-show', 'secondary', 'reservations.cancel'],
};
const localInput = (d) => new Date(new Date(d).getTime() + 2 * 3600000).toISOString().slice(0, 16); // Rwanda time for <input type=datetime-local>
const fromLocal = (v) => new Date(`${v}:00+02:00`).toISOString();

/** Table bookings, which tables are free, and who is dining right now. */
export default function VendorReservationsPage() {
  const { can } = useVendor();
  const tabs = [
    ...(can('reservations.view') ? [['bookings', 'Bookings']] : []),
    ...(can('reservations.table_availability') || can('reservations.view') ? [['availability', 'Free tables']] : []),
    ...(can('reservations.active_sessions') || can('tables.sessions_view') ? [['sessions', 'Dining now']] : []),
  ];
  const [tab, setTab] = useState(tabs[0]?.[0] || 'bookings');
  return (
    <div className="space-y-5">
      <PageHeader title="Reservations" />
      <div className="flex rounded-xl bg-stone-100 p-1 w-fit">
        {tabs.map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={`px-4 py-2 rounded-lg text-xs font-bold ${tab === id ? 'bg-white shadow text-gray-900' : 'text-stone-500'}`}>{label}</button>
        ))}
      </div>
      {tab === 'bookings' && <Bookings />}
      {tab === 'availability' && <Availability />}
      {tab === 'sessions' && <Sessions />}
    </div>
  );
}

function Bookings() {
  const { can } = useVendor();
  const { data, error, loading, reload } = useLoad(() => kitchenApi.reservations(), [], { intervalMs: 20000 });
  const action = useAction();
  const [editing, setEditing] = useState(null);
  const [deposit, setDeposit] = useState(null);
  const [status, setStatus] = useState('');
  const rows = (data?.reservations || []).filter((r) => !status || r.status === status);
  const set = (r, body) => action.run(r.id, async () => { await kitchenApi.updateReservation(r.id, body); reload(); });
  const byDay = rows.reduce((map, r) => {
    const day = new Date(r.starts_at).toLocaleDateString('en-GB', { timeZone: 'Africa/Kigali', weekday: 'long', day: 'numeric', month: 'long' });
    map.set(day, [...(map.get(day) || []), r]);
    return map;
  }, new Map());
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 overflow-x-auto">
          {[['', 'All'], ['pending', 'To confirm'], ['confirmed', 'Confirmed'], ['arrived', 'Arrived'], ['seated', 'Seated']].map(([id, label]) => (
            <button key={id || 'all'} type="button" onClick={() => setStatus(id)} className={`flex-shrink-0 px-3.5 py-2 rounded-full text-xs font-bold border ${status === id ? 'bg-[#2b1206] text-white border-[#2b1206]' : 'bg-white text-stone-600 border-stone-200'}`}>
              {label}{id && data?.counts?.[id] ? ` · ${data.counts[id]}` : ''}
            </button>
          ))}
        </div>
        {can('reservations.create') && <Button onClick={() => setEditing({})}><Plus className="w-4 h-4" /> New booking</Button>}
      </div>
      <ErrorNote message={error || action.error} />
      {loading && !data ? <Loading /> : rows.length === 0 ? <Card><Empty icon={CalendarClock} title="No bookings in the next two weeks" /></Card> : (
        [...byDay.entries()].map(([day, list]) => (
          <div key={day}>
            <p className="text-xs font-black uppercase text-stone-500 mb-2">{day}</p>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {list.map((r) => (
                <Card key={r.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-black">{r.name}</p>
                      <p className="text-xs text-stone-500">{new Date(r.starts_at).toLocaleTimeString('en-GB', { timeZone: 'Africa/Kigali', hour: '2-digit', minute: '2-digit' })} · {r.duration_minutes} min · <Users className="w-3 h-3 inline" /> {r.party_size}</p>
                      <p className="text-xs text-stone-500">{r.table ? r.table.label : 'No table yet'}{r.phone ? ` · ${r.phone}` : ''}</p>
                      {r.notes && <p className="text-xs text-stone-600 mt-1">{r.notes}</p>}
                    </div>
                    <Badge tone={TONE[r.status]}>{LABEL[r.status]}</Badge>
                  </div>
                  {(r.special_requests || r.dietary_notes) && <p className="text-xs text-stone-600 mt-1">“{[r.special_requests, r.dietary_notes].filter(Boolean).join(' · ')}”</p>}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {r.source === 'online' && <Badge tone="brown">Online</Badge>}
                    {DEPOSIT[r.deposit?.status] && <Badge tone={DEPOSIT[r.deposit.status][1]}>{DEPOSIT[r.deposit.status][0]}{r.deposit.paid_rwf ? ` · ${money(r.deposit.paid_rwf)}` : r.deposit.required_rwf ? ` · ${money(r.deposit.required_rwf)}` : ''}</Badge>}
                    {r.preorder_items?.length > 0 && <Badge tone="blue">Pre-order: {r.preorder_items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}{r.preorder_sent ? ' (sent)' : ''}</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {(r.allowed_next_statuses || []).map((next) => {
                      const step = STEP[next];
                      if (!step) return null;
                      const [path, label, variant, perm] = step;
                      const allowed = can(perm) || (next === 'seated' && can('tables.seat')) || (next === 'arrived' && can('tables.seat')) || (next === 'no_show' && (can('reservations.edit') || can('reservations.check_in')));
                      if (!allowed) return null;
                      return (
                        <Button
                          key={next}
                          className="!py-1.5 !text-xs"
                          variant={variant}
                          busy={action.busy === `${r.id}${next}`}
                          onClick={() => {
                            if (next === 'seated' && !r.table) return setEditing({ ...r, seatOnly: true });
                            if (['cancelled', 'rejected'].includes(next) && !window.confirm(`${label} the booking of ${r.name}?`)) return null;
                            return action.run(`${r.id}${next}`, async () => { await kitchenApi.reservationStep(r.id, path); reload(); });
                          }}
                        >
                          {label}
                        </Button>
                      );
                    })}
                    {['pending', 'confirmed', 'arrived', 'seated'].includes(r.status) && can('reservations.deposits') && ['none', 'required', 'paid'].includes(r.deposit?.status || 'none') && (
                      <Button className="!py-1.5 !text-xs" variant="secondary" onClick={() => setDeposit(r)}>Deposit</Button>
                    )}
                    {r.status === 'seated' && (can('reservations.extend_close') || can('reservations.edit')) && (
                      <Button className="!py-1.5 !text-xs" variant="secondary" onClick={() => set(r, { duration_minutes: r.duration_minutes + 30 })}>+30 min</Button>
                    )}
                    {['pending', 'confirmed', 'booked'].includes(r.status) && can('reservations.edit') && <Button className="!py-1.5 !text-xs" variant="secondary" onClick={() => setEditing(r)}>Edit</Button>}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
      {editing && <BookingForm booking={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
      {deposit && <DepositForm booking={deposit} onClose={() => setDeposit(null)} onSaved={() => { setDeposit(null); reload(); }} />}
    </div>
  );
}

function DepositForm({ booking, onClose, onSaved }) {
  const due = Math.max(0, (booking.deposit?.required_rwf || 0) - (booking.deposit?.paid_rwf || 0));
  const [form, setForm] = useState({ amount_rwf: due || '', method: 'cash', reference: '' });
  const action = useAction();
  return (
    <Modal title={`Deposit: ${booking.name}`} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-sm text-stone-600">Counted on the table's bill when the guests are seated. If they cancel late or don't come, your rules decide whether it's kept.</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount (RWF)"><input type="number" min="1" className={inputClass} value={form.amount_rwf} onChange={(e) => setForm({ ...form, amount_rwf: e.target.value })} /></Field>
          <Field label="Paid by">
            <select className={inputClass} value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
              <option value="cash">Cash</option><option value="mobile_money">Mobile Money</option><option value="card">Card</option><option value="other">Other</option>
            </select>
          </Field>
        </div>
        <Field label="Reference (optional)"><input className={inputClass} value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} maxLength={80} /></Field>
        <ErrorNote message={action.error} />
        <Button className="w-full" busy={action.busy === 'd'} onClick={() => action.run('d', async () => { await kitchenApi.recordDeposit(booking.id, { ...form, amount_rwf: Number(form.amount_rwf) }); onSaved(); })}>Record deposit</Button>
      </div>
    </Modal>
  );
}

function BookingForm({ booking, onClose, onSaved }) {
  const { can } = useVendor();
  const isNew = !booking.id;
  const [form, setForm] = useState({
    name: booking.name || '',
    phone: booking.phone || '',
    party_size: booking.party_size || 2,
    starts_at: localInput(booking.starts_at || Date.now() + 3600000),
    duration_minutes: booking.duration_minutes || 90,
    table_id: booking.table?.id || '',
    notes: booking.notes || '',
  });
  const { data: avail } = useLoad(
    () => (can('reservations.assign_tables') ? kitchenApi.tableAvailability({ at: fromLocal(form.starts_at), party_size: form.party_size, duration_minutes: form.duration_minutes }) : Promise.resolve({ tables: [] })),
    [form.starts_at, form.party_size, form.duration_minutes],
    { intervalMs: 60000 },
  );
  const action = useAction();
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const save = () =>
    action.run('s', async () => {
      const body = { ...form, party_size: Number(form.party_size), duration_minutes: Number(form.duration_minutes), starts_at: fromLocal(form.starts_at), table_id: form.table_id || undefined };
      if (!can('reservations.assign_tables')) delete body.table_id;
      if (booking.seatOnly) await kitchenApi.reservationStep(booking.id, 'seat', { table_id: form.table_id });
      else if (isNew) await kitchenApi.createReservation(body);
      else await kitchenApi.updateReservation(booking.id, body);
      onSaved();
    });
  return (
    <Modal title={isNew ? 'New booking' : `Edit booking: ${booking.name}`} onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name"><input className={inputClass} value={form.name} onChange={set('name')} autoFocus /></Field>
          <Field label="Phone"><input className={inputClass} value={form.phone} onChange={set('phone')} /></Field>
          <Field label="Guests"><input className={inputClass} type="number" min="1" value={form.party_size} onChange={set('party_size')} /></Field>
          <Field label="Minutes"><input className={inputClass} type="number" min="15" step="15" value={form.duration_minutes} onChange={set('duration_minutes')} /></Field>
        </div>
        <Field label="Date and time"><input className={inputClass} type="datetime-local" value={form.starts_at} onChange={set('starts_at')} /></Field>
        {can('reservations.assign_tables') && (
          <Field label="Table">
            <select className={inputClass} value={form.table_id} onChange={set('table_id')}>
              <option value="">Choose later</option>
              {(avail?.tables || []).map((t) => (
                <option key={t.id} value={t.id} disabled={!t.free && t.id !== booking.table?.id}>
                  {t.label}{t.capacity ? ` (${t.capacity})` : ''}{t.booked_by ? ` · booked by ${t.booked_by}` : !t.fits ? ' · too small' : !t.is_active ? ' · off' : ''}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Guest's requests"><input className={inputClass} value={form.special_requests} onChange={set('special_requests')} placeholder="Birthday, high chair, window seat…" /></Field>
        <Field label="Notes for the team"><input className={inputClass} value={form.notes} onChange={set('notes')} /></Field>
        <ErrorNote message={action.error} />
        <Button className="w-full" busy={action.busy === 's'} onClick={save}>{booking.seatOnly ? 'Seat at this table' : 'Save booking'}</Button>
      </div>
    </Modal>
  );
}

function Availability() {
  const [at, setAt] = useState(localInput(Date.now()));
  const [party, setParty] = useState(2);
  const { data, error, loading } = useLoad(() => kitchenApi.tableAvailability({ at: fromLocal(at), party_size: party }), [at, party], { intervalMs: 30000 });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <input className="px-3 py-2 rounded-xl border border-stone-200 text-sm" type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} />
        <input className="w-24 px-3 py-2 rounded-xl border border-stone-200 text-sm" type="number" min="1" value={party} onChange={(e) => setParty(e.target.value)} aria-label="Guests" />
      </div>
      <ErrorNote message={error} />
      {loading && !data ? <Loading /> : (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {(data?.tables || []).map((t) => (
            <div key={t.id} className={`rounded-2xl border p-3 text-center ${t.free ? 'bg-emerald-50 border-emerald-200' : 'bg-stone-50 border-stone-200'}`}>
              <p className="font-black">{t.label}</p>
              <p className="text-[11px] text-stone-500">{t.capacity ? `${t.capacity} seats` : ''}</p>
              <p className="text-[11px] font-bold mt-1">{t.free ? 'Free' : t.booked_by ? `Booked: ${t.booked_by}` : !t.is_active ? 'Off' : 'Too small'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Sessions() {
  const { can } = useVendor();
  const { data, error, loading, reload } = useLoad(() => kitchenApi.diningSessions(), [], { intervalMs: 15000 });
  const action = useAction();
  const rows = data?.sessions || [];
  return (
    <div className="space-y-3">
      <ErrorNote message={error || action.error} />
      {loading && !data ? <Loading /> : rows.length === 0 ? <Card><Empty icon={Users} title="No tables in use" /></Card> : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => (
            <Card key={r.table.id}>
              <p className="font-black text-lg">{r.table.label}</p>
              <p className="text-xs text-stone-500">Since {when(r.since)} · {r.open_orders} order{r.open_orders === 1 ? '' : 's'} in progress</p>
              {r.reservation && <p className="text-xs mt-1">Booking: {r.reservation.name} ({r.reservation.party_size})</p>}
              {r.bill && <p className="text-sm font-bold mt-2">{r.bill.invoice_number}: {money(r.bill.balance_due_rwf)} due</p>}
              {r.server && <p className="text-xs text-stone-500">Server: {r.server.name}{r.guest_count ? ` · ${r.guest_count} guests` : ''}</p>}
              {(r.session_id || r.bill) && (can('tables.close_sessions') || can('reservations.manage_sessions') || can('reservations.extend_close')) && (
                <Button className="mt-3 !py-1.5 !text-xs" variant="secondary" busy={action.busy === r.table.id} onClick={() => action.run(r.table.id, async () => { if (r.session_id) await kitchenApi.closeTableSession(r.session_id); else await kitchenApi.closeInvoice(r.bill.id); reload(); })}>
                  Close the session
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
