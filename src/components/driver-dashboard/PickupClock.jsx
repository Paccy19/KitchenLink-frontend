import React, { useEffect, useState } from 'react';
import { AlertTriangle, ChefHat, Timer } from 'lucide-react';

const clock = (ms) => {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};
const timeOf = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/**
 * Where the assigned driver stands on collecting the food: wait near the
 * kitchen while it cooks, then a countdown to collect it before a late-pickup
 * charge applies.
 */
export default function PickupClock({ delivery }) {
  const waiting = delivery.status === 'assigned_to_driver';
  const counting = waiting && delivery.kitchenReady && delivery.pickupDueAt && !delivery.latePickup;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!counting) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [counting]);

  if (delivery.latePickup) {
    const minutes = delivery.latePickup.minutesLate;
    return (
      <div className="rounded-3xl bg-red-50 border border-red-200 p-5 flex items-start gap-3">
        <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-black text-red-800">Late pickup</p>
          <p className="text-xs font-medium text-red-700 mt-0.5">
            {waiting
              ? `The food has been ready for over ${delivery.pickupGraceMinutes} minutes. A late-pickup charge will apply. Collect it now.`
              : `Collected${minutes ? ` ${minutes} minute${minutes === 1 ? '' : 's'}` : ''} late. A late-pickup charge applies to this delivery.`}
          </p>
        </div>
      </div>
    );
  }

  if (!waiting) return null;

  if (!delivery.kitchenReady) {
    return (
      <div className="rounded-3xl bg-amber-50 border border-amber-200 p-5 flex items-start gap-3">
        <ChefHat className="w-6 h-6 text-amber-700 flex-shrink-0" />
        <div>
          <p className="text-sm font-black text-amber-900">The kitchen is preparing this order</p>
          <p className="text-xs font-medium text-amber-800 mt-0.5">
            Head to the kitchen now and wait nearby
            {delivery.expectedReadyAt ? ` — it should be ready around ${timeOf(delivery.expectedReadyAt)}` : ''}.
            Once it's ready you have {delivery.pickupGraceMinutes} minutes to collect it, or a late-pickup charge
            applies.
          </p>
        </div>
      </div>
    );
  }

  const left = new Date(delivery.pickupDueAt).getTime() - now;
  const urgent = left <= 5 * 60 * 1000;
  return (
    <div
      className={`rounded-3xl border p-5 flex items-center gap-4 ${
        urgent ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'
      }`}
    >
      <Timer className={`w-7 h-7 flex-shrink-0 ${urgent ? 'text-red-600' : 'text-emerald-700'}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-black ${urgent ? 'text-red-800' : 'text-emerald-900'}`}>
          The food is ready — collect it now
        </p>
        <p className={`text-xs font-medium mt-0.5 ${urgent ? 'text-red-700' : 'text-emerald-800'}`}>
          Pick it up by {timeOf(delivery.pickupDueAt)} to avoid a late-pickup charge.
        </p>
      </div>
      <span
        className={`font-mono text-2xl font-black tabular-nums ${urgent ? 'text-red-700' : 'text-emerald-800'}`}
        aria-label="Time left to collect"
      >
        {clock(left)}
      </span>
    </div>
  );
}
