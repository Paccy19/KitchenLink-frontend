import React, { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, MapPin, Phone } from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import { Badge, Button, ErrorNote, Field, LoadingBlock, Modal, Select, Textarea, formatDate, formatRelative, toTitle } from './ui';

/**
 * Support hands an order to another delivery worker — typically because the
 * assigned one is late to collect it. Step 1: workers near the kitchen,
 * nearest first, with a Call button. Step 2: after phoning one who agreed,
 * confirm the call and assign. The late worker, the kitchen and the customer
 * are notified by the server.
 */
export default function AssignNearbyDriverModal({ orderId, open, onClose, onDone }) {
  const [includeOffline, setIncludeOffline] = useState(false);
  const [chosen, setChosen] = useState(null);
  const [contacted, setContacted] = useState(false);
  const [reason, setReason] = useState('other');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const query = useQuery({
    queryKey: ['admin', 'nearby-drivers', orderId, includeOffline],
    queryFn: () => adminApi.nearbyDrivers(orderId, { include_offline: includeOffline ? 'true' : '' }),
    enabled: open && Boolean(orderId),
    refetchInterval: open && !chosen ? 20000 : false,
  });
  const data = query.data;

  useEffect(() => {
    if (!open) {
      setChosen(null);
      setContacted(false);
      setNote('');
      setError('');
      setIncludeOffline(false);
    }
  }, [open]);
  useEffect(() => {
    if (data) setReason(data.late ? 'late_pickup' : 'other');
  }, [data?.late]); // eslint-disable-line react-hooks/exhaustive-deps

  const mutation = useMutation({
    mutationFn: () =>
      adminApi.reassignDriver(orderId, { driver_id: chosen.id, reason, contacted: true, note: note.trim() || undefined }),
    onSuccess: () => {
      onDone?.(chosen);
      onClose();
    },
  });

  const assign = () => {
    if (!contacted) {
      setError(`Call ${chosen.name} first and tick the box once they agree to take the order.`);
      return;
    }
    setError('');
    mutation.mutate();
  };

  return (
    <Modal
      open={open}
      title={data ? `Find a delivery worker · ${data.order_number}` : 'Find a delivery worker'}
      onClose={onClose}
      width="max-w-2xl"
      footer={
        chosen ? (
          <>
            <Button variant="secondary" onClick={() => setChosen(null)}>
              <ArrowLeft className="w-4 h-4" /> Back to list
            </Button>
            <Button onClick={assign} disabled={mutation.isPending}>
              {mutation.isPending ? 'Assigning…' : `Assign to ${chosen.name}`}
            </Button>
          </>
        ) : null
      }
    >
      {query.isLoading ? (
        <LoadingBlock />
      ) : query.error ? (
        <ErrorNote error={query.error} />
      ) : !data ? null : data.collected ? (
        <p className="text-sm text-stone-600">This order has already been collected, so it can no longer be reassigned.</p>
      ) : chosen ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-stone-200 p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-black text-gray-900">{chosen.name}</p>
              <p className="text-xs text-stone-500">
                {[toTitle(chosen.vehicle_type || ''), chosen.plate_number].filter(Boolean).join(' · ')}
                {chosen.distance_km != null ? ` · ${chosen.distance_km} km from the kitchen` : ''}
              </p>
            </div>
            {chosen.phone && (
              <a
                href={`tel:${chosen.phone}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700"
              >
                <Phone className="w-4 h-4" /> Call {chosen.phone}
              </a>
            )}
          </div>

          <label className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={contacted}
              onChange={(event) => {
                setContacted(event.target.checked);
                setError('');
              }}
              className="mt-0.5 w-4 h-4 accent-emerald-700"
            />
            <span className="text-sm text-amber-900">
              I called <strong>{chosen.name}</strong> and they agreed to go to the kitchen and collect this order now,
              without delay.
            </span>
          </label>

          <Field label="Reason">
            <Select value={reason} onChange={(event) => setReason(event.target.value)}>
              <option value="late_pickup">The current delivery worker is late to collect it</option>
              <option value="other">Other (no worker yet, worker unreachable…)</option>
            </Select>
          </Field>
          <Field label="Note for the order history (optional)">
            <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="e.g. Sam not answering, Nadia 5 minutes away" />
          </Field>

          <p className="text-xs text-stone-500">
            {data.current_driver
              ? `${data.current_driver.name} will be told the order was given to someone else${reason === 'late_pickup' ? ' because they were late; their late-pickup charge stays on record' : ''}. `
              : ''}
            The kitchen and the customer are told who is coming. {chosen.name} gets the order with a fresh{' '}
            pickup time — if they are late too, it is flagged the same way.
          </p>
          {error && <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}
          {mutation.isError && <ErrorNote error={mutation.error} />}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl bg-stone-50 border border-stone-100 p-3 text-sm space-y-1">
            <p className="flex items-center gap-1.5 font-bold text-gray-900">
              <MapPin className="w-4 h-4 text-[#8a5332]" /> {data.kitchen.name || 'Kitchen'}
              {data.kitchen_ready ? <Badge tone="green">Food ready</Badge> : <Badge tone="amber">Kitchen preparing</Badge>}
            </p>
            {data.current_driver ? (
              <p className="text-stone-600 flex flex-wrap items-center gap-2">
                Current worker: <strong>{data.current_driver.name}</strong>
                {data.current_driver.phone && (
                  <a href={`tel:${data.current_driver.phone}`} className="text-xs font-bold text-sky-700 hover:underline">
                    Call {data.current_driver.phone}
                  </a>
                )}
                {data.late && (
                  <Badge tone="red">
                    <AlertTriangle className="w-3 h-3" /> Late{data.pickup_due_at ? ` · was due ${formatDate(data.pickup_due_at)}` : ''}
                  </Badge>
                )}
              </p>
            ) : (
              <p className="text-stone-600">No delivery worker yet.</p>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-stone-500">
              Nearest first. Call one, and once they agree, choose them. Within {data.radius_km} km is the normal delivery
              range.
            </p>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 whitespace-nowrap">
              <input type="checkbox" checked={includeOffline} onChange={(event) => setIncludeOffline(event.target.checked)} />
              Include offline
            </label>
          </div>

          {data.drivers.length === 0 ? (
            <p className="text-sm text-stone-500 py-6 text-center">
              No {includeOffline ? '' : 'online '}delivery workers found. {includeOffline ? '' : 'Try including offline workers.'}
            </p>
          ) : (
            <ul className="divide-y divide-stone-100 rounded-2xl border border-stone-200">
              {data.drivers.map((driver) => (
                <li key={driver.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-900 flex flex-wrap items-center gap-1.5">
                      {driver.name}
                      {!driver.is_online && <Badge tone="slate">Offline</Badge>}
                      {driver.has_capacity ? (
                        driver.active_deliveries > 0 ? (
                          <Badge tone="amber">{driver.active_deliveries} active</Badge>
                        ) : (
                          <Badge tone="green">Free</Badge>
                        )
                      ) : (
                        <Badge tone="red">Full</Badge>
                      )}
                    </p>
                    <p className="text-xs text-stone-500">
                      {driver.location_known ? (
                        <>
                          <strong className={driver.within_radius ? 'text-emerald-700' : 'text-stone-700'}>{driver.distance_km} km</strong>{' '}
                          from the kitchen · location {formatRelative(driver.location_updated_at)}
                          {!driver.location_fresh ? ' (old)' : ''}
                        </>
                      ) : (
                        'Location never shared'
                      )}
                      {driver.vehicle_type ? ` · ${toTitle(driver.vehicle_type)}` : ''}
                    </p>
                  </div>
                  {driver.phone && (
                    <a
                      href={`tel:${driver.phone}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-bold hover:bg-emerald-100"
                    >
                      <Phone className="w-3.5 h-3.5" /> {driver.phone}
                    </a>
                  )}
                  <Button size="sm" onClick={() => setChosen(driver)} disabled={!driver.has_capacity}>
                    Choose
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
}
