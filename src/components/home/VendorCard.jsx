import React from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { Bike, Clock, MapPin, Star } from 'lucide-react';
import LazyImage from '../common/LazyImage';
import { formatRwf } from '../../api/normalize';

const TYPE_STYLES = {
  'Home Cook': 'bg-amber-500 text-white',
  Restaurant: 'bg-blue-600 text-white',
  'Café': 'bg-emerald-600 text-white',
  Bakery: 'bg-pink-600 text-white',
  'Food Truck': 'bg-purple-600 text-white',
  'Professional Chef': 'bg-rose-600 text-white',
  Caterer: 'bg-indigo-600 text-white',
  'Juice Bar': 'bg-teal-600 text-white',
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
        'group block bg-white overflow-hidden border border-gray-100/90 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-500/30 rounded-3xl',
        isTile ? 'min-w-[262px] max-w-[262px] snap-start' : 'h-full',
      )}
    >
      {/* Banner — fixed aspect avoids layout shift */}
      <div className="relative">
        <LazyImage
          src={vendor.bannerUrl}
          alt={`${vendor.name} banner`}
          aspect={isTile ? 'aspect-[16/9]' : 'aspect-[16/10]'}
          rounded="rounded-none"
          imgClassName="group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-black/20 pointer-events-none" />

        <span
          className={clsx(
            'absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-black shadow-md',
            TYPE_STYLES[vendor.type] ?? 'bg-gray-800 text-white',
          )}
        >
          {vendor.type}
        </span>

        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
          <span className="text-xs font-extrabold text-gray-900">{vendor.rating}</span>
          {vendor.reviewsCount > 0 && (
            <span className="text-[10px] text-gray-500 font-medium">({vendor.reviewsCount})</span>
          )}
        </div>

        {vendor.deliveryAvailable && (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-forest-600 text-white text-[11px] font-black shadow-md">
            <Bike className="w-3 h-3" aria-hidden="true" />
            Delivery available
          </span>
        )}
      </div>

      <div className={clsx('p-4', isTile && 'p-4')}>
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-extrabold text-base sm:text-lg text-gray-900 group-hover:text-orange-600 transition-colors line-clamp-1">
            {vendor.name}
          </h3>
          {!vendor.isOpen && (
            <span className="flex-shrink-0 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
              Closed
            </span>
          )}
        </div>

        <p className="text-xs text-gray-500 font-medium flex items-center gap-1 mt-0.5">
          <MapPin className="w-3 h-3 text-orange-500 flex-shrink-0" aria-hidden="true" />
          <span className="line-clamp-1">{vendor.neighborhood}</span>
        </p>

        {showDescription && vendor.description && !isTile && (
          <p className="text-xs text-gray-500 mt-2 line-clamp-2 leading-relaxed">
            {vendor.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-3 pt-3 border-t border-gray-100 text-xs font-semibold text-gray-600">
          <span className="inline-flex items-center gap-1" title="Distance from you">
            <MapPin className="w-3.5 h-3.5 text-orange-500" aria-hidden="true" />
            {vendor.distanceKm} km
          </span>
          <span className="inline-flex items-center gap-1" title="Estimated preparation time">
            <Clock className="w-3.5 h-3.5 text-gray-400" aria-hidden="true" />
            {vendor.prepTime}
          </span>
          {vendor.deliveryFee > 0 && (
            <span className="inline-flex items-center gap-1 text-gray-700 ml-auto">
              <Bike className="w-3.5 h-3.5 text-orange-500" aria-hidden="true" />
              {formatRwf(vendor.deliveryFee)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
