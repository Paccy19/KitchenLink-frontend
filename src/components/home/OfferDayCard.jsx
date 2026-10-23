import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Gift } from 'lucide-react';
import LazyImage from '../common/LazyImage';
import VendorTypeBadge from '../common/VendorTypeBadge';
import { formatOfferDay, offerCountdown } from '../../utils/offerDays';

/**
 * A kitchen's "Offer Day" announcement: the deal it gives clients on a chosen
 * day. Shown next to Tomorrow's Specials; tapping opens the kitchen.
 *
 * @param {{offer:{title:string, details:string, offerDate:string, vendor:Object}}} props
 */
export default function OfferDayCard({ offer }) {
  const { vendor } = offer;
  if (!vendor?.id) return null;

  return (
    <Link
      to={`/vendor/${vendor.id}`}
      aria-label={`${vendor.name} offer on ${formatOfferDay(offer.offerDate, { long: true })}: ${offer.title}`}
      className="group min-w-[300px] max-w-[300px] snap-start bg-white rounded-3xl border border-amber-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col"
    >
      <div className="relative overflow-hidden">
        <LazyImage
          src={vendor.bannerUrl || vendor.avatarUrl}
          alt={`${vendor.name} offer`}
          aspect="aspect-[16/9]"
          rounded="rounded-none"
          imgClassName="group-hover:scale-108 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
        <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400 text-[#3d1b0c] text-[11px] font-black shadow-md">
          <Gift className="w-3.5 h-3.5" aria-hidden="true" />
          Offer Day
        </span>
        <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-white/95 text-[#3d1b0c] text-[11px] font-black shadow-md">
          {offerCountdown(offer.offerDate)}
        </span>
        <div className="absolute bottom-3 left-3 right-3">
          <p className="text-white font-extrabold text-sm line-clamp-1">{vendor.name}</p>
          <VendorTypeBadge type={vendor.typeCode || vendor.type} size="xs" className="mt-1" />
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <p className="text-[11px] font-black uppercase tracking-wide text-amber-800 flex items-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5" aria-hidden="true" />
          {formatOfferDay(offer.offerDate, { long: true })}
        </p>
        <p className="mt-1.5 text-sm font-extrabold text-gray-900 leading-snug line-clamp-2">{offer.title}</p>
        {offer.details && (
          <p className="mt-1 text-xs text-stone-500 leading-relaxed line-clamp-3">{offer.details}</p>
        )}
        <span className="mt-auto pt-4 text-xs font-black text-[#542813] group-hover:underline">
          View kitchen →
        </span>
      </div>
    </Link>
  );
}
