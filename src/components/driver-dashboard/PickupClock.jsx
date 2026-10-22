import React, { useEffect, useState } from 'react';
import { AlertTriangle, ChefHat, Timer } from 'lucide-react';

const clock = (ms) => {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};
const timeOf = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/**
 * Where the assigned delivery worker stands on collecting the food, using
 * the timing rules the admin set: wait near the kitchen while it cooks, then
 * a countdown to the late-pickup charge, then to the moment the order is
 * given to another worker (if the admin turned that on).
 */
export default function PickupClock({ delivery }) {
  const waiting = delivery.status === 'assigned_to_driver';
  const ticking = waiting && delivery.kitchenReady && delivery.pickupDueAt;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!ticking) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [ticking]);

  const rules = delivery.pickupRules;

  // Collected late: just the record.
  if (!waiting) {
    if (!delivery.latePickup) return null;
    const minutes = delivery.latePickup.minutesLate;
    return (
      <div className="rounded-3xl bg-red-50 border border-red-200 p-5 flex items-start gap-3">
        <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-black text-red-800">Late pickup</p>
          <p className="text-xs font-medium text-red-700 mt-0.5">
            Collected{minutes ? ` ${minutes} minute${minutes === 1 ? '' : 's'}` : ''} late. A late-pickup charge applies to this delivery.
          </p>
        </div>
      </div>
    );
  }

  if (!delivery.kitchenReady) {
    return (
      <div className="rounded-3xl bg-amber-50 border border-amber-200 p-5 flex items-start gap-3">
        <ChefHat className="w-6 h-6 text-amber-700 flex-shrink-0" />
        <div>
          <p className="text-sm font-black text-amber-900">The kitchen is preparing this order</p>
          <p className="text-xs font-medium text-amber-800 mt-0.5">
            Head to the kitchen now and wait nearby
            {delivery.expectedReadyAt ? ` — it should be ready around ${timeOf(delivery.expectedReadyAt)}` : ''}.
            {rules && (
              <>
                {' '}Once it's ready you have {rules.chargeAfterMinutes} minutes to collect it, or a late-pickup charge applies
                {rules.reassignAfterMinutes ? `; after ${rules.reassignAfterMinutes} minutes the order goes to another delivery worker` : ''}.
              </>
            )}
          </p>
        </div>
      </div>
    );
  }

  const dueLeft = new Date(delivery.pickupDueAt).getTime() - now;
  const reassignLeft = delivery.pickupReassignAt ? new Date(delivery.pickupReassignAt).getTime() - now : null;
  const late = Boolean(delivery.latePickup) || dueLeft <= 0;

  if (late) {
    return (
      <div className="rounded-3xl bg-red-50 border border-red-200 p-5 flex items-center gap-4">
        <AlertTriangle className="w-7 h-7 text-red-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-red-800">Late — collect it now</p>
          <p className="text-xs font-medium text-red-700 mt-0.5">
            A late-pickup charge applies.
            {reassignLeft != null
              ? ` If you don't collect it by ${timeOf(delivery.pickupReassignAt)}, the order will be given to another delivery worker.`
              : ''}
          </p>
        </div>
        {reassignLeft != null && (
          <span className="flex-shrink-0 text-right">
            <span className="block font-mono text-2xl font-black tabular-nums text-red-700">{clock(reassignLeft)}</span>
            <span className="text-[10px] font-bold uppercase text-red-600">until reassigned</span>
          </span>
        )}
      </div>
    );
  }

  const urgent = dueLeft <= 5 * 60 * 1000;
  return (
    <div className={`rounded-3xl border p-5 flex items-center gap-4 ${urgent ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
      <Timer className={`w-7 h-7 flex-shrink-0 ${urgent ? 'text-red-600' : 'text-emerald-700'}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-black ${urgent ? 'text-red-800' : 'text-emerald-900'}`}>The food is ready — collect it now</p>
        <p className={`text-xs font-medium mt-0.5 ${urgent ? 'text-red-700' : 'text-emerald-800'}`}>
          Pick it up by {timeOf(delivery.pickupDueAt)} to avoid a late-pickup charge
          {delivery.pickupReassignAt ? `; at ${timeOf(delivery.pickupReassignAt)} it goes to another delivery worker` : ''}.
        </p>
      </div>
      <span className="flex-shrink-0 text-right">
        <span className={`block font-mono text-2xl font-black tabular-nums ${urgent ? 'text-red-700' : 'text-emerald-800'}`}>{clock(dueLeft)}</span>
        <span className={`text-[10px] font-bold uppercase ${urgent ? 'text-red-600' : 'text-emerald-700'}`}>to collect</span>
      </span>
    </div>
  );
}
