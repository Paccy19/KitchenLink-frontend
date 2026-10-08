import React, { useEffect, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChefHat, Loader2, MapPin, SlidersHorizontal } from 'lucide-react';
import VendorCard from '../components/home/VendorCard';
import CategoryBar from '../components/home/CategoryBar';
import EmptyState, { ErrorState } from '../components/common/EmptyState';
import { VendorCardSkeleton } from '../components/common/Skeleton';
import useNearbyVendors, { DEFAULT_RADIUS_KM, SORT_OPTIONS } from '../hooks/useNearbyVendors';
import useCategories from '../hooks/useCategories';
import { useLocation } from '../context/LocationContext';

const RADIUS_OPTIONS = [3, 5, 7, 10, 15];

function Chip({ active, onClick, children, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border active:scale-95 ${
        active
          ? 'bg-gradient-to-r from-[#2b1206] to-[#4e2410] text-white border-[#2b1206] shadow-md shadow-[#2b1206]/20'
          : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300 hover:text-stone-900 hover:bg-stone-50'
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Nearby vendors list: `GET /home/vendors/nearby` with configurable radius,
 * category filter, sorting and infinite scroll.
 */
export default function VendorsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentLocation } = useLocation();

  const categoryId = searchParams.get('category');
  const sort = ['distance', 'rating'].includes(searchParams.get('sort'))
    ? searchParams.get('sort')
    : 'distance';
  const radius = RADIUS_OPTIONS.includes(Number(searchParams.get('radius')))
    ? Number(searchParams.get('radius'))
    : DEFAULT_RADIUS_KM;

  const categories = useCategories();
  const query = useNearbyVendors({ radius, categoryId, sort, perPage: 6 });
  const sentinelRef = useRef(null);

  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value === null || value === undefined || value === '') next.delete(key);
    else next.set(key, String(value));
    setSearchParams(next);
  };

  // Infinite scroll — observe a sentinel under the grid.
  const { hasNextPage, fetchNextPage, isFetchingNextPage } = query;
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasNextPage) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: '300px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, fetchNextPage, isFetchingNextPage]);

  const activeCategory = useMemo(
    () => categories.data?.find((category) => category.id === categoryId) ?? null,
    [categories.data, categoryId],
  );

  const vendors = query.data?.vendors ?? [];
  const total = query.data?.total ?? 0;
  const firstLoad = query.isPending;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-20 animate-fade-in">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-xs font-bold text-stone-500 hover:text-[#542813] transition mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to home</span>
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            {activeCategory ? activeCategory.name : 'Kitchens Near You'}
          </h1>
          <p className="text-xs text-stone-500 mt-1 flex items-center gap-1.5 flex-wrap">
            <MapPin className="w-3.5 h-3.5 text-[#8a5332]" aria-hidden="true" />
            Within {radius} km of {currentLocation}
            {!firstLoad && !query.isError && (
              <span className="bg-[#f5ebe1] text-[#3d1b0c] border border-[#ebd7c5] px-2.5 py-0.5 rounded-full font-extrabold text-[11px]">
                {total} found
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
            Sort
          </span>
          {SORT_OPTIONS.map((option) => (
            <Chip
              key={option.id}
              active={sort === option.id}
              onClick={() => setParam('sort', option.id)}
              label={`Sort by ${option.label}`}
            >
              {option.label}
            </Chip>
          ))}
        </div>
      </div>

      {/* Radius control */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 flex-shrink-0">
          Radius
        </span>
        {RADIUS_OPTIONS.map((value) => (
          <Chip
            key={value}
            active={radius === value}
            onClick={() => setParam('radius', value)}
            label={`Search within ${value} kilometres`}
          >
            {value} km
          </Chip>
        ))}
      </div>

      {/* Categories */}
      <div className="mb-7">
        <CategoryBar
          categories={categories.data ?? []}
          activeId={categoryId}
          onSelect={(id) => setParam('category', id)}
          loading={categories.isPending}
        />
      </div>

      {/* Results */}
      {firstLoad ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy="true">
          {Array.from({ length: 6 }).map((_, index) => (
            <VendorCardSkeleton key={index} />
          ))}
        </div>
      ) : query.isError && vendors.length === 0 ? (
        <ErrorState
          title="Nearby kitchens failed to load"
          message={query.error?.message || 'We could not reach the nearby vendors endpoint.'}
          onRetry={query.refetch}
          isRetrying={query.isFetching}
        />
      ) : vendors.length === 0 ? (
        <EmptyState
          icon={<ChefHat className="w-8 h-8 text-[#542813]" />}
          title="No kitchens in this radius"
          message={
            activeCategory
              ? `No ${activeCategory.name.toLowerCase()} kitchens within ${radius} km. Try a wider radius or another category.`
              : `Nothing found within ${radius} km right now. Try a wider radius.`
          }
          actionLabel={radius < 15 ? 'Widen to 15 km' : undefined}
          onAction={radius < 15 ? () => setParam('radius', 15) : undefined}
        >
          {categoryId && (
            <button
              type="button"
              onClick={() => setParam('category', null)}
              className="text-xs font-bold text-[#542813] hover:underline"
            >
              Clear category filter
            </button>
          )}
        </EmptyState>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {vendors.map((vendor) => (
              <VendorCard key={`${vendor.id}-${vendor.distanceKm}`} vendor={vendor} />
            ))}
            {isFetchingNextPage &&
              Array.from({ length: 3 }).map((_, index) => (
                <VendorCardSkeleton key={`loading-${index}`} />
              ))}
          </div>

          <div ref={sentinelRef} className="h-px" aria-hidden="true" />

          <div className="mt-8 flex justify-center">
            {hasNextPage ? (
              <button
                type="button"
                onClick={fetchNextPage}
                disabled={isFetchingNextPage}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white border border-stone-200 text-sm font-bold text-stone-700 hover:border-[#d9bda6] hover:text-[#542813] transition disabled:opacity-60 shadow-sm active:scale-95"
              >
                {isFetchingNextPage && <Loader2 className="w-4 h-4 animate-spin text-[#542813]" />}
                Load more kitchens
              </button>
            ) : (
              <p className="text-xs text-stone-400 font-semibold">
                You have seen all {total} kitchens within {radius} km
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
