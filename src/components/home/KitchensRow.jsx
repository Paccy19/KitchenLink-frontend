import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { LayoutGrid, Star } from 'lucide-react';
import HomeCardRow, { RowCardIcon, RowCardImage, rowCardClass } from './HomeCardRow';
import usePrefetchVendor from '../../hooks/usePrefetchVendor';
import { vendorTypeLabel } from '../../data/vendorTypes';
import { CategoryBarSkeleton } from '../common/Skeleton';

/** Open kitchens first, then the best rated; the server's (distance) order breaks ties. */
const byOpenThenRating = (a, b) =>
  Number(b.vendor.isOpen) - Number(a.vendor.isOpen) ||
  (b.vendor.rating || 0) - (a.vendor.rating || 0) ||
  a.order - b.order;

function KitchenTile({ vendor }) {
  const prefetchProps = usePrefetchVendor(vendor.id);
  const type = vendorTypeLabel(vendor.typeCode || vendor.type);
  const rating = vendor.rating > 0 ? vendor.rating.toFixed(1) : null;

  return (
    <Link
      to={`/vendor/${vendor.id}`}
      {...prefetchProps}
      aria-label={`${vendor.name}, ${type}${rating ? `, rated ${rating}` : ''}, ${vendor.isOpen ? 'open' : 'closed'}`}
      className={rowCardClass(false)}
    >
      <RowCardImage src={vendor.bannerUrl || vendor.avatarUrl}>
        <span
          className={`absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full text-white text-[10px] font-black shadow-md backdrop-blur-sm ${
            vendor.isOpen ? 'bg-forest-600/95' : 'bg-stone-600/90'
          }`}
        >
          {vendor.isOpen ? 'Open' : 'Closed'}
        </span>
      </RowCardImage>
      <span className="block px-2 pt-2.5 text-xs sm:text-[13px] font-bold leading-tight text-center line-clamp-2">
        {vendor.name}
      </span>
      <span className="mt-auto flex items-center justify-center gap-1 px-2 pt-1 pb-2.5 text-[10px] sm:text-[11px] font-medium text-stone-500 whitespace-nowrap overflow-hidden">
        <span className="min-w-0 truncate">{type}</span>
        {rating && (
          <>
            <span aria-hidden="true">·</span>
            <Star className="w-3 h-3 flex-shrink-0 fill-amber-400 text-amber-400" aria-hidden="true" />
            {rating}
          </>
        )}
      </span>
    </Link>
  );
}

/**
 * "Kitchens Near You" on the homepage, in the category row's cards: an "All
 * kitchens" tile (to the kitchens list), then one tile per kitchen, open
 * ones first, then by rating.
 *
 * @param {{ vendors:Array<Object>, loading?:boolean, allTo?:string }} props
 */
export default function KitchensRow({ vendors = [], loading = false, allTo = '/vendors' }) {
  const sorted = useMemo(
    () =>
      vendors
        .filter((vendor) => vendor?.id)
        .map((vendor, order) => ({ vendor, order }))
        .sort(byOpenThenRating)
        .map(({ vendor }) => vendor),
    [vendors],
  );

  if (loading && sorted.length === 0) return <CategoryBarSkeleton />;

  return (
    <HomeCardRow
      ariaLabel="Kitchens near you"
      title="Kitchens Near You"
      subtitle="Home cooks, restaurants and bakeries open around you"
      scrollLabel="kitchens"
    >
      <Link to={allTo} aria-label="Browse all kitchens" className={rowCardClass(true)}>
        <RowCardIcon icon={LayoutGrid} active />
        <span className="block px-2 py-2.5 text-xs sm:text-[13px] font-bold leading-tight text-center line-clamp-2">
          All kitchens
        </span>
      </Link>
      {sorted.map((vendor) => (
        <KitchenTile key={vendor.id} vendor={vendor} />
      ))}
    </HomeCardRow>
  );
}
