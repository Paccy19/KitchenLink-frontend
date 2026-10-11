import React from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { Bike, Clock, MapPin, Star } from 'lucide-react';
import LazyImage from '../common/LazyImage';
import { formatRwf } from '../../api/normalize';

const TYPE_STYLES = {
  'Home Cook': 'bg-[#3d1b0c] text-white',
  Restaurant: 'bg-stone-800 text-white',
  'Café': 'bg-[#542813] text-white',
  Bakery: 'bg-amber-900 text-white',
  'Food Truck': 'bg-stone-700 text-white',
  'Professional Chef': 'bg-[#2b1206] text-white',
  Caterer: 'bg-[#6d391d] text-white',
  'Juice Bar': 'bg-emerald-800 text-white',
};

/**
 * Kitchen card used across the feed, nearby list and search results.
 * Shows banner, name, vendor type, rating, distance, prep time and the
 * delivery-available badge.
 *
 * @param {{vendor:Object, variant?:'grid'|'tile', showDescription?:boolean}} props
 */
export default function VendorCard({ vendor, variant = 'grid', showDescription = true }) {
  const isTile = variant === 'tile';

  return (
    <Link
      to={`/vendor/${vendor.id}`}
      aria-label={`${vendor.name}, ${vendor.type}, rated ${vendor.rating}, ${vendor.distanceKm} kilometres away`}
      className={clsx(
        'group block bg-white overflow-hidden border border-stone-200/80 shadow-sm hover:shadow-2xl hover:border-[#ebd7c5] hover:-translate-y-1.5 transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#542813]/25 rounded-3xl',
        isTile ? 'min-w-[268px] max-w-[268px] snap-start' : 'h-full',
      )}
    >
      {/* Banner — fixed aspect avoids layout shift */}
      <div className="relative overflow-hidden">
        <LazyImage
          src={vendor.bannerUrl}
          alt={`${vendor.name} banner`}
          aspect={isTile ? 'aspect-[16/9]' : 'aspect-[16/10]'}
          rounded="rounded-none"
          imgClassName="group-hover:scale-108 transition-transform duration-500 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/20 pointer-events-none" />

        <span
          className={clsx(
            'absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-black shadow-md backdrop-blur-sm',
            TYPE_STYLES[vendor.type] ?? 'bg-stone-800 text-white',
          )}
        >
          {vendor.type}
        </span>

        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
          <span className="text-xs font-extrabold text-gray-900">{vendor.rating}</span>
          {vendor.reviewsCount > 0 && (
            <span className="text-[10px] text-stone-500 font-medium">({vendor.reviewsCount})</span>
          )}
        </div>

        {vendor.deliveryAvailable && (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-forest-600/95 text-white text-[11px] font-black shadow-md backdrop-blur-sm">
            <Bike className="w-3.5 h-3.5" aria-hidden="true" />
            Delivery available
          </span>
        )}
      </div>

      <div className={clsx('p-4', isTile && 'p-4')}>
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-extrabold text-base sm:text-lg text-gray-900 group-hover:text-[#542813] transition-colors line-clamp-1">
            {vendor.name}
          </h3>
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
          <span className="inline-flex items-center gap-1" title="Distance from you">
            <MapPin className="w-3.5 h-3.5 text-[#8a5332]" aria-hidden="true" />
            {vendor.distanceKm} km
          </span>
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
