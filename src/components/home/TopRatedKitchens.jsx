import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Bike, Clock, MapPin, Star } from 'lucide-react';
import LazyImage from '../common/LazyImage';
import usePrefetchVendor from '../../hooks/usePrefetchVendor';
import { VendorAvatar } from './VendorCard';
import { VendorTileSkeleton } from '../common/Skeleton';
import PromoBanner from './PromoBanner';

const MAX_KITCHENS = 3;

/** The live kitchens, best rated first (more reviews first on a tie), without repeats. */
export function topRated(...lists) {
  const seen = new Map();
  lists.flat().forEach((vendor) => {
    if (vendor?.id && !seen.has(vendor.id)) seen.set(vendor.id, vendor);
  });
  return [...seen.values()]
    .sort((a, b) =>
      (Number(b.rating) || 0) - (Number(a.rating) || 0)
      || (Number(b.reviewsCount) || 0) - (Number(a.reviewsCount) || 0)
      || Number(Boolean(b.isOpen)) - Number(Boolean(a.isOpen)))
    .slice(0, MAX_KITCHENS);
}

function KitchenCard({ vendor }) {
  const prefetchProps = usePrefetchVendor(vendor.id);
  const rating = Number(vendor.rating) || 0;
  return (
    <Link
      to={`/vendor/${vendor.id}`}
      {...prefetchProps}
      aria-label={`${vendor.name}${rating ? `, rated ${rating}` : ''}${vendor.neighborhood ? `, ${vendor.neighborhood}` : ''}`}
      className="group flex flex-col bg-white rounded-3xl overflow-hidden shadow-[0_4px_18px_rgba(43,18,6,0.08)] hover:shadow-[0_16px_36px_rgba(43,18,6,0.16)] hover:-translate-y-1 transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#542813]/25"
    >
      <div className="relative">
        {/* No cover photo uploaded: the kitchen's profile picture instead. */}
        <LazyImage
          src={vendor.bannerUrl || vendor.avatarUrl}
          alt={`${vendor.name} food`}
          aspect="aspect-[16/10] lg:aspect-[5/4] xl:aspect-[4/3]"
          rounded="rounded-none"
          imgClassName="group-hover:scale-105 transition-transform duration-500 ease-out"
        />
        {!vendor.isOpen && (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 text-white text-[10px] font-black uppercase tracking-wide">
            Closed
          </span>
        )}
        {vendor.deliveryAvailable && (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/95 text-[#3d1b0c] text-[11px] font-black shadow">
            <Bike className="w-3.5 h-3.5 text-[#f28c18]" aria-hidden="true" />
            Delivery
          </span>
        )}
        {/* Logo overlapping the photo, as on a shop front. */}
        <div className="absolute -bottom-6 left-4 p-1 rounded-2xl bg-white shadow-md">
          <VendorAvatar vendor={vendor} className="w-11 h-11 rounded-xl text-base" />
        </div>
      </div>

      <div className="px-4 pt-8 pb-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-extrabold text-[15px] sm:text-base text-gray-900 group-hover:text-[#542813] transition-colors line-clamp-1">
            {vendor.name}
          </h3>
          <span className="flex-shrink-0 inline-flex items-center gap-1 text-sm font-extrabold text-gray-900" title={vendor.reviewsCount ? `${vendor.reviewsCount} reviews` : 'Rating'}>
            <Star className="w-4 h-4 fill-[#f5a524] text-[#f5a524]" aria-hidden="true" />
            {rating ? rating.toFixed(1) : 'New'}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 text-xs font-semibold text-stone-500">
          <span className="inline-flex items-center gap-1 min-w-0">
            <MapPin className="w-3.5 h-3.5 text-[#f28c18] flex-shrink-0" aria-hidden="true" />
            <span className="line-clamp-1">{vendor.neighborhood || vendor.address || 'Kigali'}</span>
          </span>
          {vendor.prepTime && (
            <span className="inline-flex items-center gap-1 flex-shrink-0" title="Estimated preparation time">
              <Clock className="w-3.5 h-3.5 text-stone-400" aria-hidden="true" />
              {vendor.prepTime}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/**
 * "Top-Rated Kitchens": the best-rated live kitchens (from the feed already
 * loaded on the homepage), next to the promotion banner.
 */
export default function TopRatedKitchens({ vendorLists = [], loading = false, offers = [], specials = [], seeAllTo = '/vendors' }) {
  const kitchens = useMemo(() => topRated(...vendorLists), [vendorLists]);

  return (
    <section aria-label="Top-rated kitchens">
      <div className="flex items-end justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Top-Rated Kitchens</h2>
          <p className="text-xs sm:text-sm text-stone-500 font-medium mt-0.5">Trusted by thousands of food lovers</p>
        </div>
        <Link to={seeAllTo} className="text-xs sm:text-sm font-black text-[#542813] hover:text-[#2b1206] whitespace-nowrap group">
          See all <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px] gap-5 lg:gap-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
          {kitchens.map((vendor) => (
            <KitchenCard key={vendor.id} vendor={vendor} />
          ))}
          {loading && kitchens.length === 0 && (
            <>
              <VendorTileSkeleton />
              <VendorTileSkeleton />
              <VendorTileSkeleton />
            </>
          )}
          {!loading && kitchens.length === 0 && (
            <p className="sm:col-span-2 md:col-span-3 rounded-3xl border border-dashed border-stone-200 p-8 text-center text-sm text-stone-500">
              No kitchens to show yet. <Link to="/vendors" className="font-bold text-[#542813] underline">Browse all kitchens</Link>
            </p>
          )}
        </div>
        <PromoBanner offers={offers} specials={specials} />
      </div>
    </section>
  );
}
