import React from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { Bike, Clock, Globe2, MapPin, Navigation, Star } from 'lucide-react';
import FadeImage from '../common/FadeImage';
import LazyImage from '../common/LazyImage';
import usePrefetchVendor from '../../hooks/usePrefetchVendor';
import VendorTypeBadge from '../common/VendorTypeBadge';
import { formatRwf } from '../../api/normalize';
import { useLocation } from '../../context/LocationContext';

/** Vendor's uploaded profile picture / logo, falling back to their initial. */
export function VendorAvatar({ vendor, className = 'w-9 h-9 rounded-xl text-sm' }) {
  return (
    <FadeImage
      src={vendor.avatarUrl}
      alt={`${vendor.name} logo`}
      className={clsx('flex-shrink-0 object-cover border border-stone-200 bg-stone-100', className)}
      fallback={
        <span
          aria-hidden="true"
          className={clsx(
            'flex-shrink-0 flex items-center justify-center font-black bg-[#f5ebe1] text-[#542813] border border-[#ebd7c5]',
            className,
          )}
        >
          {(vendor.name || 'K').slice(0, 1).toUpperCase()}
        </span>
      }
    />
  );
}

/**
 * Kitchen card used across the feed, nearby list and search results.
 * Shows banner, name, vendor type, rating, distance, prep time and the
 * delivery-available badge.
 *
 * @param {{vendor:Object, variant?:'grid'|'tile', showDescription?:boolean}} props
 */
export default function VendorCard({ vendor, variant = 'grid', showDescription = true }) {
  const isTile = variant === 'tile';
  // Distances are only meaningful from the customer's measured GPS position,
  // not from the city-centre fallback or a picked neighbourhood.
  const { isGps } = useLocation();
  const showDistance = isGps && vendor.hasDistance;
  const prefetchProps = usePrefetchVendor(vendor.id);

  return (
    <Link
      to={`/vendor/${vendor.id}`}
      {...prefetchProps}
      aria-label={`${vendor.name}, ${vendor.type}, rated ${vendor.rating}${showDistance ? `, ${vendor.distanceKm} kilometres away` : ''}`}
      className={clsx(
        'group block bg-white overflow-hidden border border-stone-200/80 shadow-sm hover:shadow-2xl hover:border-[#ebd7c5] hover:-translate-y-1.5 transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#542813]/25 rounded-3xl',
        isTile ? 'min-w-[268px] max-w-[268px] snap-start' : 'h-full',
      )}
    >
      {/* Banner — fixed aspect avoids layout shift */}
      <div className="relative overflow-hidden">
        {/* No banner uploaded: show the vendor's profile picture here instead. */}
        <LazyImage
          src={vendor.bannerUrl || vendor.avatarUrl}
          alt={`${vendor.name} banner`}
          aspect={isTile ? 'aspect-[16/9]' : 'aspect-[16/10]'}
          rounded="rounded-none"
          imgClassName="group-hover:scale-108 transition-transform duration-500 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/20 pointer-events-none" />

        <VendorTypeBadge type={vendor.typeCode || vendor.type} className="absolute top-3 left-3 shadow-md" />

        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
          <span className="text-xs font-extrabold text-gray-900">{vendor.rating}</span>
          {vendor.reviewsCount > 0 && (
            <span className="text-[10px] text-stone-500 font-medium">({vendor.reviewsCount})</span>
          )}
        </div>

        {vendor.nationwide ? (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-700/95 text-white text-[11px] font-black shadow-md backdrop-blur-sm">
            <Globe2 className="w-3.5 h-3.5" aria-hidden="true" />
            Events nationwide
          </span>
        ) : vendor.deliveryAvailable && (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-forest-600/95 text-white text-[11px] font-black shadow-md backdrop-blur-sm">
            <Bike className="w-3.5 h-3.5" aria-hidden="true" />
            Delivery available
          </span>
        )}

        {vendor.isNearby && (
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400 text-[#3d1b0c] text-[11px] font-black shadow-md">
            <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
            Near you
          </span>
        )}
      </div>

      <div className={clsx('p-4', isTile && 'p-4')}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <VendorAvatar vendor={vendor} />
            <h3 className="font-extrabold text-base sm:text-lg text-gray-900 group-hover:text-[#542813] transition-colors line-clamp-1">
              {vendor.name}
            </h3>
          </div>
          {!vendor.isOpen && (
            <span className="flex-shrink-0 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">
              Closed
            </span>
          )}
        </div>

        <p className="text-xs text-stone-500 font-medium flex items-center gap-1 mt-0.5">
          <MapPin className="w-3.5 h-3.5 text-[#8a5332] flex-shrink-0" aria-hidden="true" />
          <span className="line-clamp-1">{vendor.neighborhood}</span>
        </p>

        {showDescription && vendor.description && !isTile && (
          <p className="text-xs text-stone-500 mt-2 line-clamp-2 leading-relaxed">
            {vendor.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-3 pt-3 border-t border-stone-100 text-xs font-semibold text-stone-600">
          {showDistance && (
            <span className="inline-flex items-center gap-1" title="Distance from you">
              <MapPin className="w-3.5 h-3.5 text-[#8a5332]" aria-hidden="true" />
              {vendor.distanceKm} km
            </span>
          )}
          <span className="inline-flex items-center gap-1" title="Estimated preparation time">
            <Clock className="w-3.5 h-3.5 text-stone-400" aria-hidden="true" />
            {vendor.prepTime}
          </span>
          {vendor.deliveryFee > 0 && (
            <span className="inline-flex items-center gap-1 text-stone-800 ml-auto font-bold">
              <Bike className="w-3.5 h-3.5 text-[#8a5332]" aria-hidden="true" />
              {formatRwf(vendor.deliveryFee)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
