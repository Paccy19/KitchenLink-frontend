import React, { useState } from 'react';
import { Bike, MapPin, Package, PackageCheck, Navigation, AlertTriangle, CheckCircle2, Undo2 } from 'lucide-react';
import { kitchenApi } from '../../api/kitchenApi';
import { useVendor } from '../../context/VendorContext';
import { PageHeader, Card, Button, Badge, ErrorNote, Empty, Field, Loading, Modal, Stat, inputClass, money, minutesAgo, useLoad, useAction } from '../../components/vendor-dashboard/ops/ui';

const COURIER = {
  unassigned: { label: 'No courier', tone: 'stone' },
  assigned: { label: 'Assigned', tone: 'blue' },
  acknowledged: { label: 'Accepted', tone: 'blue' },
  collected: { label: 'Collected', tone: 'amber' },
  in_transit: { label: 'On the way', tone: 'amber' },
  delivered: { label: 'Delivered', tone: 'emerald' },
  failed: { label: 'Failed', tone: 'red' },
  customer_unavailable: { label: 'Customer unavailable', tone: 'red' },
  returned: { label: 'Returned', tone: 'red' },
  cancelled: { label: 'Cancelled', tone: 'stone' },
  kitchenlink_worker: { label: 'KitchenLink worker', tone: 'brown' },
  waiting_worker: { label: 'Finding a worker', tone: 'stone' },
};
// The next step a courier can take (the server checks it again).
const NEXT = {
  assigned: [['acknowledged', 'Accept']],
  acknowledged: [['collected', 'Collected the food']],
  collected: [['in_transit', 'On my way']],
  failed: [['in_transit', 'Try again'], ['returned', 'Brought it back']],
  customer_unavailable: [['in_transit', 'Try again'], ['returned', 'Brought it back']],
};

/**
 * Deliveries. A coordinator sees every delivery order, packing and who is
 * free, and gives deliveries to the kitchen's couriers. A courier sees only
 * their own deliveries, with the steps to take and the customer's code to
 * finish (only that code completes a delivery).
 */
export default function VendorDeliveriesPage() {
  const { can } = useVendor();
  const coordinator = ['delivery.view_orders', 'delivery.assign_workers', 'delivery.create_assignments', 'delivery.change_assignments', 'delivery.track'].some((p) => can(p));
  const [mine, setMine] = useState(!coordinator);
  const { data, error, loading, reload } = useLoad(() => kitchenApi.deliveries(mine ? { mine: 'true' } : {}), [mine], { intervalMs: 8000 });
  const action = useAction();
  const [step, setStep] = useState(null); // { order, status }
  const [code, setCode] = useState(null);
  const list = data?.deliveries || [];
  const active = list.filter((d) => !['delivered', 'cancelled'].includes(d.status));
  const finished = list.filter((d) => ['delivered', 'cancelled'].includes(d.status));
  const act = (key, fn) => action.run(key, fn).then(reload);

  if (loading && !data) return <Loading />;
  return (
    <div className="space-y-5">
      <PageHeader
        title={data?.coordinator ? 'Deliveries' : 'My deliveries'}
        actions={coordinator && can('delivery.drive') ? <Button variant="soft" onClick={() => setMine(!mine)}>{mine ? 'All deliveries' : 'Only mine'}</Button> : null}
      />
      <ErrorNote message={error || action.error} />
      {data?.coordinator && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Need a courier" value={data.counts.unassigned} tone={data.counts.unassigned ? 'warn' : undefined} />
          <Stat label="To pack" value={data.counts.to_pack} />
          <Stat label="On the road" value={data.counts.on_the_road} />
          <Stat label="Problems" value={data.counts.problems} tone={data.counts.problems ? 'warn' : undefined} />
        </div>
      )}
      {!active.length ? (
        <Card><Empty icon={Bike} title="No deliveries right now" /></Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {active.map((d, i) => {
            const st = COURIER[d.courier_status] || COURIER.unassigned;
            const isMine = !data.coordinator || d.courier;
            return (
              <Card key={d.id} className="!p-5 kl-rise">
                <div className="flex items-start justify-between gap-2" style={{ animationDelay: `${i * 30}ms` }}>
                  <div>
                    <p className="font-black text-gray-900">{d.order_number}</p>
                    <p className="text-[11px] text-stone-500">{d.by === 'kitchen' ? 'Delivered by the kitchen' : 'KitchenLink delivery'} · {minutesAgo(d.created_at)}</p>
                  </div>
                  <Badge tone={st.tone}>{st.label}</Badge>
                </div>
                {d.address && (
                  <p className="text-sm text-stone-700 mt-3 flex items-start gap-1.5"><MapPin className="w-4 h-4 mt-0.5 text-[#6d391d] flex-shrink-0" /> <span>{d.address}{d.landmark ? <span className="block text-[11px] text-stone-500">{d.landmark}</span> : null}</span></p>
                )}
                <p className="text-xs text-stone-600 mt-2">{d.items.map((it) => `${it.quantity}× ${it.name}`).join(', ')}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {d.packing && <Badge tone={d.packing === 'requested' ? 'amber' : 'emerald'}>{d.packing === 'requested' ? <><Package className="w-3 h-3" /> Being packed</> : <><PackageCheck className="w-3 h-3" /> Packed</>}</Badge>}
                  {!d.ready && <Badge>Still cooking</Badge>}
                  {d.courier && data.coordinator && <Badge tone="brown"><Bike className="w-3 h-3" /> {d.courier.name}</Badge>}
                  {data.coordinator && d.total_rwf !== undefined && <Badge>{money(d.total_rwf)}</Badge>}
                </div>
                {d.last_note && <p className="text-[11px] text-stone-500 mt-2">{d.last_note}</p>}

                {data.coordinator && d.by === 'kitchen' && (can('delivery.assign_workers') || can('delivery.create_assignments') || can('delivery.change_assignments')) && (
                  <Field label="Courier">
                    <select className={`${inputClass} mt-1`} value={d.courier?.staff_id || ''} onChange={(e) => act(`c${d.id}`, () => (e.target.value ? kitchenApi.setCourier(d.id, e.target.value) : kitchenApi.cancelCourier(d.id)))}>
                      <option value="">No courier</option>
                      {(data.couriers || []).map((c) => <option key={c.id} value={c.id}>{c.name}{c.active_deliveries ? ` (${c.active_deliveries} out)` : ''}</option>)}
                    </select>
                  </Field>
                )}

                {isMine && d.by === 'kitchen' && d.courier && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {(NEXT[d.courier_status] || []).map(([to, label]) => (
                      <Button
                        key={to}
                        variant={to === 'returned' ? 'secondary' : 'primary'}
                        disabled={to === 'collected' && (d.packing === 'requested' || !d.ready)}
                        busy={action.busy === `${to}${d.id}`}
                        className="!py-2 !text-xs"
                        onClick={() => (to === 'returned' ? setStep({ order: d, status: to }) : act(`${to}${d.id}`, () => kitchenApi.courierStatus(d.id, to)))}
                      >
                        {to === 'in_transit' ? <Navigation className="w-3.5 h-3.5" /> : to === 'returned' ? <Undo2 className="w-3.5 h-3.5" /> : null} {label}
                      </Button>
                    ))}
                    {['collected', 'in_transit'].includes(d.courier_status) && (
                      <>
                        <Button variant="success" className="!py-2 !text-xs" onClick={() => setCode(d)}><CheckCircle2 className="w-3.5 h-3.5" /> Customer's code</Button>
                        <Button variant="danger" className="!py-2 !text-xs" onClick={() => setStep({ order: d, status: 'customer_unavailable' })}><AlertTriangle className="w-3.5 h-3.5" /> Problem</Button>
                      </>
                    )}
                    {d.location && (
                      <a className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold border border-stone-200 text-stone-700" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${d.location.lat},${d.location.lng}`}>
                        <Navigation className="w-3.5 h-3.5" /> Directions
                      </a>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
      {finished.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-stone-500 mb-2">Earlier today</p>
          <div className="flex flex-wrap gap-2">
            {finished.map((d) => <Badge key={d.id} tone={d.status === 'delivered' ? 'emerald' : 'stone'}>{d.order_number} · {d.status === 'delivered' ? 'delivered' : 'cancelled'}</Badge>)}
          </div>
        </div>
      )}
      {step && <ProblemModal step={step} onClose={() => setStep(null)} onDone={() => { setStep(null); reload(); }} />}
      {code && <CodeModal order={code} onClose={() => setCode(null)} onDone={() => { setCode(null); reload(); }} />}
    </div>
  );
}

function ProblemModal({ step, onClose, onDone }) {
  const [status, setStatus] = useState(step.status);
  const [note, setNote] = useState('');
  const action = useAction();
  return (
    <Modal title={`${step.order.order_number}: what happened?`} onClose={onClose}>
      <div className="space-y-3">
        {step.status !== 'returned' && (
          <div className="grid grid-cols-2 gap-2">
            {[['customer_unavailable', 'Customer unavailable'], ['failed', 'Could not deliver']].map(([id, label]) => (
              <button key={id} type="button" onClick={() => setStatus(id)} className={`rounded-2xl border px-3 py-3 text-sm font-bold ${status === id ? 'bg-[#2b1206] text-white border-[#2b1206]' : 'bg-white border-stone-200 text-stone-700'}`}>{label}</button>
            ))}
          </div>
        )}
        <textarea className={`${inputClass} min-h-[80px]`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="No answer at the gate, wrong address…" />
        <ErrorNote message={action.error} />
        <Button className="w-full" disabled={!note.trim()} busy={action.busy === 's'} onClick={() => action.run('s', async () => { await kitchenApi.courierStatus(step.order.id, status, note); onDone(); })}>Save</Button>
      </div>
    </Modal>
  );
}

function CodeModal({ order, onClose, onDone }) {
  const [value, setValue] = useState('');
  const action = useAction();
  return (
    <Modal title={`Deliver ${order.order_number}`} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-sm text-stone-600">Ask the customer for the 6-digit code they received. Only the right code completes the delivery.</p>
        <input inputMode="numeric" maxLength={6} className={`${inputClass} text-center text-2xl tracking-[0.5em] font-black`} value={value} onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))} />
        <ErrorNote message={action.error} />
        <Button variant="success" className="w-full" disabled={value.length !== 6} busy={action.busy === 'c'} onClick={() => action.run('c', async () => { await kitchenApi.confirmDeliveryCode(order.id, value); onDone(); })}>Delivered</Button>
      </div>
    </Modal>
  );
}
