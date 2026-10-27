import React from 'react';
import { Link } from 'react-router-dom';
import { ConciergeBell, MapPin, Star, Truck, UtensilsCrossed } from 'lucide-react';
import { VendorAvatar } from './VendorCard';
import VendorTypeBadge from '../common/VendorTypeBadge';
import usePrefetchVendor from '../../hooks/usePrefetchVendor';
import { rangeLabel } from '../../utils/distanceFeeRanges';

const rwf = (value) => `${Math.round(Number(value) || 0).toLocaleString()} RWF`;

/** One of the kitchen's event packages, priced for the customer's guests. */
function PackageOption({ vendor, pkg, pickup }) {
  const quote = pkg.quote;
  return (
    <div className="rounded-2xl border border-[#ebd7c5] overflow-hidden">
      <div className="bg-[#faf6f2] p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-black text-gray-900">{pkg.name}</p>
            {pkg.description && <p className="text-[11px] text-stone-500 mt-0.5">{pkg.description}</p>}
          </div>
          <span className="text-xs font-bold text-stone-600 whitespace-nowrap">
            {rwf(quote ? quote.price_per_plate_rwf : pkg.from_price_per_plate_rwf)}
            <span className="font-medium text-stone-400"> /plate</span>
          </span>
        </div>
        {quote ? (
          <dl className="mt-2 text-xs text-stone-600 space-y-0.5">
            <div className="flex justify-between">
              <dt>
                {quote.guests} {quote.guests === 1 ? 'plate' : 'plates'}
              </dt>
              <dd>{rwf(quote.food_total_rwf)}</dd>
            </div>
            <div className="flex justify-between">
              {pickup ? (
                <>
                  <dt>You pick it up</dt>
                  <dd>No delivery fee</dd>
                </>
              ) : (
                <>
                  <dt>{quote.distance_km != null ? `Delivery (about ${quote.distance_km} km)` : 'Delivery'}</dt>
                  <dd>{quote.delivery_fee_rwf != null ? rwf(quote.delivery_fee_rwf) : 'by distance'}</dd>
                </>
              )}
            </div>
            <div className="flex justify-between pt-1.5 mt-1 border-t border-[#ebd7c5] text-base font-black text-gray-900">
              <dt>{!pickup && quote.delivery_fee_rwf == null ? 'Total (+ delivery)' : 'Total'}</dt>
              <dd>{rwf(pickup ? quote.pickup_total_rwf : quote.total_rwf)}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-[11px] text-stone-500 mt-1">
            {pkg.min_guests}–{pkg.max_guests} guests
          </p>
        )}
      </div>

      <div className="p-3.5 space-y-2 text-xs text-stone-600">
        <div className="flex gap-2">
          <UtensilsCrossed className="w-4 h-4 text-[#8a5332] flex-shrink-0" aria-hidden="true" />
          <div>
            <p className="font-bold text-gray-800">{pkg.menu.join(' · ')}</p>
            {pkg.portion && <p className="mt-0.5">{pkg.portion}</p>}
          </div>
        </div>
        {/* Service happens at the event, so pick-up customers don't see it. */}
        {!pickup && (
          <div className="flex gap-2">
            <ConciergeBell className="w-4 h-4 text-[#8a5332] flex-shrink-0" aria-hidden="true" />
            <p>
              <span className="font-bold text-gray-800">{pkg.service_style_label}</span>
              {pkg.service_details && ` — ${pkg.service_details}`}
            </p>
          </div>
        )}
        {/* Book this package (guests and delivery / pick-up carry over). */}
        <Link
          to={`/event-order/${vendor.id}?package=${pkg.id}&guests=${quote?.guests ?? pkg.min_guests}${pickup ? '&pickup=1' : ''}`}
          className="block text-center px-4 py-2.5 rounded-xl bg-[#542813] text-white text-sm font-black hover:bg-[#2b1206] transition active:scale-[0.98]"
        >
          Place order
        </Link>
      </div>
    </div>
  );
}

/**
 * Big Event list card: a kitchen and each of its event packages that fits the
 * customer's number of guests (cheapest first) — price per plate of the range
 * that covers them, the delivery fee for their distance from the kitchen (or
 * none when they pick it up), the total, what is on the plate and the
 * service — each with its own "Place order".
 *
 * @param {{vendor:Object, pickup?:boolean}} props pickup: the customer collects the food
 */
export default function EventVendorCard({ vendor, pickup = false }) {
  const prefetchProps = usePrefetchVendor(vendor.id);
  const event = vendor.event;
  if (!event?.packages?.length) return null;
  const anyQuote = event.packages.find((pkg) => pkg.quote)?.quote;

  return (
    <article className="h-full flex flex-col bg-white rounded-3xl border border-stone-200/80 shadow-sm hover:shadow-xl hover:border-[#ebd7c5] transition-all overflow-hidden">
      <div className="p-4 flex items-start gap-3">
        <VendorAvatar vendor={vendor} className="w-11 h-11 rounded-xl text-base" />
        <div className="min-w-0 flex-1">
          <h3 className="font-extrabold text-base text-gray-900 line-clamp-1">{vendor.name}</h3>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-xs text-stone-500">
            <VendorTypeBadge type={vendor.typeCode || vendor.type} />
            <span className="inline-flex items-center gap-0.5 font-bold text-gray-800">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
              {vendor.rating}
            </span>
            <span className="inline-flex items-center gap-0.5">
              <MapPin className="w-3.5 h-3.5 text-[#8a5332]" aria-hidden="true" />
              <span className="line-clamp-1">{vendor.neighborhood}</span>
            </span>
          </div>
          {event.packages.length > 1 && (
            <p className="text-[11px] font-bold text-[#8a5332] mt-1">{event.packages.length} packages for your event</p>
          )}
        </div>
      </div>

      <div className="px-4 space-y-3 flex-1">
        {event.packages.map((pkg) => (
          <PackageOption key={pkg.id} vendor={vendor} pkg={pkg} pickup={pickup} />
        ))}
      </div>

      {/* Delivery is the same for every package. */}
      {!pickup && (
        <div className="px-4 pt-3 space-y-1.5 text-xs text-stone-600">
          <div className="flex gap-2">
            <Truck className="w-4 h-4 text-[#8a5332] flex-shrink-0" aria-hidden="true" />
            <p>
              <span className="font-bold text-gray-800">The kitchen brings the food</span>
              {event.delivery_details && ` — ${event.delivery_details}`}
            </p>
          </div>
          {/* Without the customer's location the fee can't be picked: show every range. */}
          {anyQuote?.delivery_fee_rwf == null && event.delivery_fee_ranges.length > 0 && (
            <ul className="pl-6 space-y-0.5 text-[11px] text-stone-500">
              {event.delivery_fee_ranges.map((range) => (
                <li key={range.from_km}>
                  {rangeLabel(range.from_km, range.to_km)}: <strong className="text-stone-700">{rwf(range.fee_rwf)}</strong>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Link
        to={`/vendor/${vendor.id}`}
        {...prefetchProps}
        className="mx-4 mt-3 mb-4 text-center text-xs font-bold text-stone-500 hover:text-[#542813] transition"
      >
        View kitchen
      </Link>
    </article>
  );
}
