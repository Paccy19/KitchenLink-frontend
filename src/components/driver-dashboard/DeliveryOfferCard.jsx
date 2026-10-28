import React from 'react';
import { Bike, Navigation, MapPin, Store, Coins, Phone, ArrowRight, Timer } from 'lucide-react';

/**
 * A single available delivery offer with large Accept / Reject actions.
 *
 * @param {{delivery: object, busy?: boolean, onAccept: (id) => void, onReject: (id) => void}} props
 */
export default function DeliveryOfferCard({ delivery, busy = false, onAccept, onReject }) {
  const heading = delivery.vendor?.name || 'Food order ready for pickup';

  return (
    <div className="min-w-0 rounded-3xl bg-white border border-stone-200/80 shadow-sm p-4 sm:p-5 hover:shadow-md transition flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#3b5327] to-[#1c2b12] flex items-center justify-center flex-shrink-0">
          <Bike className="w-6 h-6 text-[#eef5e5]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-extrabold text-gray-900 truncate">{heading}</p>
          <p className="text-[11px] font-bold text-[#4a6a34]">Order {delivery.orderNumber}</p>
          <span
            className={`mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${
              delivery.kitchenReady ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}
          >
            {delivery.kitchenReady ? 'Ready for pickup' : 'Kitchen preparing'}
          </span>
        </div>
        <span className="flex-shrink-0 text-right">
          <span className="block text-sm font-black text-emerald-600">
            {delivery.promisedEarnings.toLocaleString()} RWF
          </span>
          <span className="text-[10px] font-bold text-stone-400 uppercase">earn</span>
        </span>
      </div>

      <div className="space-y-2.5 text-sm">
        <div className="flex items-start gap-2.5">
          <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
            <Store className="w-3.5 h-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-bold text-gray-800">{delivery.pickup?.address || 'Vendor pickup'}</p>
            <p className="text-stone-400 text-xs truncate">{delivery.vendor?.neighborhood || ''}</p>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-3.5 h-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-bold text-gray-800">{delivery.dropoff?.address || 'Customer'}</p>
            <p className="text-stone-400 text-xs truncate">{delivery.dropoff?.neighborhood || ''}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-bold text-stone-500 border-t border-stone-100 pt-3">
        {delivery.distanceFromDriverKm != null && (
          <span className="inline-flex items-center gap-1" title="From you to the kitchen">
            <Store className="w-3.5 h-3.5 text-[#3b5327]" />
            {Number(delivery.distanceFromDriverKm).toFixed(1)} km to kitchen
          </span>
        )}
        <span className="inline-flex items-center gap-1" title="Kitchen to customer">
          <Navigation className="w-3.5 h-3.5 text-[#3b5327]" />
          {delivery.routeDistanceKm ? `${delivery.routeDistanceKm.toFixed(1)} km trip` : '—'}
        </span>
        <span className="inline-flex items-center gap-1">
          <Coins className="w-3.5 h-3.5 text-[#3b5327]" />
          {delivery.deliveryFee.toLocaleString()} RWF fee
        </span>
        {delivery.items.length > 0 && (
          <span className="ml-auto inline-flex items-center gap-1 text-stone-400">
            {delivery.items.length} item{delivery.items.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* The admin's pickup rules, so the worker knows before accepting. */}
      {delivery.pickupRules && (
        <p className="flex items-start gap-2 rounded-2xl bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] font-semibold text-amber-900">
          <Timer className="w-4 h-4 flex-shrink-0" />
          <span>
            Collect within {delivery.pickupRules.chargeAfterMinutes} min of the food being ready
            {delivery.pickupRules.reassignAfterMinutes
              ? `; after ${delivery.pickupRules.reassignAfterMinutes} min the order goes to another delivery worker`
              : ''}
            .
          </span>
        </p>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          disabled={busy}
          onClick={() => onAccept(delivery.id)}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl bg-gradient-to-r from-[#1c2b12] via-[#3b5327] to-[#12200b] text-white text-sm font-bold transition active:scale-95 disabled:opacity-60"
        >
          <ArrowRight className="w-4 h-4" />
          Accept
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onReject(delivery.id)}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl bg-stone-100 text-stone-600 text-sm font-bold hover:bg-stone-200 transition active:scale-95 disabled:opacity-60"
        >
          <Phone className="w-4 h-4" />
          Decline
        </button>
      </div>
    </div>
  );
}