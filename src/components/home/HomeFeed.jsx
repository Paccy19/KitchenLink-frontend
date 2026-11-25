import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import TopRatedKitchens from './TopRatedKitchens';
import BrandStrip from './BrandStrip';
import HeroSlider from './HeroSlider';
import CategoryBar from './CategoryBar';
import SearchBar from './SearchBar';
import VendorCard from './VendorCard';
import DishCard from './DishCard';
import PullToRefreshIndicator from './PullToRefreshIndicator';
import { ErrorState } from '../common/EmptyState';
import VendorTypeFilter from '../common/VendorTypeFilter';
import useVendorTypeParam from '../../hooks/useVendorTypeParam';
import { HomeFeedSkeleton, VendorTileSkeleton, Skeleton } from '../common/Skeleton';
import { useToast } from '../common/Toast';

import useHomeFeed from '../../hooks/useHomeFeed';
import useCategories from '../../hooks/useCategories';
import useVendorSpecials from '../../hooks/useVendorSpecials';
import useAllVendors from '../../hooks/useAllVendors';
import useVendorOffers from '../../hooks/useVendorOffers';
import useDebounce from '../../hooks/useDebounce';
import usePullToRefresh from '../../hooks/usePullToRefresh';

// Code-split the search results experience (heavy list rendering).
const SearchResults = lazy(() => import('./SearchResults'));

const SEARCH_DEBOUNCE_MS = 350;

function SectionHeader({ title, subtitle, to, linkLabel = 'See all' }) {
  return (
    <div className="flex items-end justify-between gap-3 mb-3.5">
      <div>
        <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-stone-500 mt-0.5">{subtitle}</p>}
      </div>
      {to && (
        <Link
          to={to}
          className="text-xs font-black text-[#542813] hover:text-[#2b1206] whitespace-nowrap flex items-center gap-1 group transition-colors"
        >
          <span>{linkLabel}</span>
          <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
        </Link>
      )}
    </div>
  );
}

/** Placeholder for a compact DishCard while the feed loads. */
function CompactDishSkeleton() {
  return (
    <div className="w-[168px] lg:w-auto flex-shrink-0 bg-white rounded-2xl border border-gray-100 overflow-hidden" aria-hidden="true">
      <Skeleton className="h-24 lg:h-16 w-full rounded-none" />
      <div className="p-2.5 space-y-2">
        <Skeleton className="h-2.5 w-1/3" />
        <Skeleton className="h-3.5 w-5/6" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

/**
 * Homepage feed: search + hero slider (Big Events, Tomorrow's Specials) next
 * to the popular dishes → categories → kitchens,
 * with pull-to-refresh and graceful loading/error/empty states.
 */
export default function HomeFeed() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlQuery = searchParams.get('q') ?? '';
  const [query, setQuery] = useState(urlQuery);
  const debouncedQuery = useDebounce(query, SEARCH_DEBOUNCE_MS);

  // Kitchen type filter (?type=home_cook,cafe) — applies to the kitchen lists and search.
  const [vendorTypes, setVendorTypes] = useVendorTypeParam();
  const typeQuery = vendorTypes.length ? `?type=${vendorTypes.join(',')}` : '';

  const feed = useHomeFeed({ vendorTypes });
  const categories = useCategories({ enabled: !urlQuery.trim() });
  const specials = useVendorSpecials();
  const offers = useVendorOffers();
  const allVendors = useAllVendors({ perPage: 6, vendorTypes, enabled: !urlQuery.trim() });

  // Keep the URL shareable: debounce input → `?q=` (replace, no history spam).
  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (trimmed === urlQuery) return;
    const next = new URLSearchParams(searchParams);
    if (trimmed) next.set('q', trimmed);
    else next.delete('q');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  // External changes (e.g. Navbar submit) update the input.
  useEffect(() => {
    setQuery((current) => (current === urlQuery ? current : urlQuery));
  }, [urlQuery]);

  const refreshFeed = useCallback(async () => {
    try {
      await feed.refetch();
    } catch {
      toast.error('Could not refresh your feed. Check your connection.');
    }
  }, [feed, toast]);

  const pull = usePullToRefresh(refreshFeed);

  const handleCategorySelect = (categoryId) => {
    navigate(categoryId ? `/vendors?category=${encodeURIComponent(categoryId)}` : '/vendors');
  };

  const isSearching = urlQuery.trim().length > 0;
  const data = feed.data;
  const popularDishes = (data?.popularDishes ?? []).slice(0, 4);

  /** The kitchen-type filter, right above the kitchen lists it changes. */
  const typeToolbar = (
    <div className="rounded-3xl bg-white border border-stone-200/80 shadow-[0_2px_12px_rgba(43,18,6,0.05)] px-3 sm:px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
      <span className="flex-shrink-0 px-1 text-[11px] font-black uppercase tracking-wider text-stone-400">Kitchen type</span>
      <VendorTypeFilter value={vendorTypes} onChange={setVendorTypes} className="min-w-0 sm:flex-1" />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-16" {...pull.handlers}>
      <PullToRefreshIndicator
        pullDistance={pull.pullDistance}
        ready={pull.ready}
        refreshing={pull.refreshing}
      />

      {/* ── Top: search + hero slider | popular dishes ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-7">
        <div className="min-w-0 flex flex-col">
          <section aria-label="Find food and kitchens" className="mb-4">
            <h1 className="mb-2 text-xl sm:text-2xl font-black tracking-tight text-[#3d1b0c]">
              Find food near you
            </h1>
            <SearchBar
              compact
              inputId="home-search"
              value={query}
              onChange={setQuery}
              onSubmit={setQuery}
              placeholder="Search meals or kitchens..."
            />
          </section>

          {/* Big Events, then one slide per Tomorrow's Special / Offer Day. */}
          <HeroSlider fill specials={specials.data ?? []} offers={offers.data ?? []} className="lg:flex-1" />
        </div>

        <section aria-label="Popular dishes near you" className="min-w-0">
          <SectionHeader
            title="Popular Dishes Near You"
            subtitle="What people around you are ordering today"
            to="/vendors"
            linkLabel="See all"
          />
          {/* A swipeable row on phones and tablets, a 2×2 grid next to the slider. */}
          <div className="flex gap-3 overflow-x-auto snap-x pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 lg:grid lg:grid-cols-2 lg:overflow-visible lg:pb-0">
            {popularDishes.map((dish) => (
              <DishCard key={dish.id} dish={dish} compact className="w-[168px] lg:w-auto" />
            ))}
            {popularDishes.length === 0 && (feed.isPending || feed.isFetching) &&
              Array.from({ length: 4 }, (_, i) => <CompactDishSkeleton key={i} />)}
          </div>
          {popularDishes.length === 0 && !feed.isPending && !feed.isFetching && (
            <p className="rounded-2xl bg-[#faf6f2] border border-[#f1e2d2] px-4 py-6 text-center text-xs font-semibold text-stone-500">
              No popular dishes near you yet.
            </p>
          )}
        </section>
      </div>

      <div className="mt-10 sm:mt-12" />

      {/* ── Search results view ───────────────────────────────── */}
      {isSearching ? (
        // Search results have their own kitchen-type filter.
        <Suspense fallback={<HomeFeedSkeleton />}>
          <SearchResults query={urlQuery} onSuggest={setQuery} vendorTypes={vendorTypes} onVendorTypesChange={setVendorTypes} />
        </Suspense>
      ) : feed.isPending ? (
        <HomeFeedSkeleton />
      ) : feed.isError && !data ? (
        <ErrorState
          title="Your feed could not load"
          message={feed.error?.message || 'We could not reach the kitchens near you.'}
          onRetry={feed.refetch}
          isRetrying={feed.isFetching}
        />
      ) : (
        <div className="space-y-10 sm:space-y-12">
          {/* Categories (live; tapping one opens the filtered kitchens) */}
          <CategoryBar
            categories={categories.data ?? data?.categories ?? []}
            activeId={null}
            onSelect={handleCategorySelect}
            loading={categories.isPending}
            title="Popular Food Categories"
            subtitle="Explore a wide variety of cuisines"
          />

          {/* The specials now live in the slider at the top; this links to all of them. */}
          {((specials.data?.length ?? 0) > 0 || (offers.data?.length ?? 0) > 0) && (
            <div className="-mt-4 sm:-mt-6 flex justify-end">
              <Link
                to="/vendors?filter=preorder"
                className="text-xs font-black text-[#542813] hover:text-[#2b1206] whitespace-nowrap flex items-center gap-1 group transition-colors"
              >
                <span>View all specials</span>
                <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
              </Link>
            </div>
          )}

          {/* Kitchen type, right above the kitchen lists it changes. */}
          {typeToolbar}

          {/* Best-rated live kitchens + the promotion banner (real offers only) */}
          <TopRatedKitchens
            vendorLists={[data?.featuredVendors ?? [], allVendors.data?.vendors ?? []]}
            loading={feed.isFetching || allVendors.isPending}
            offers={offers.data ?? []}
            specials={specials.data ?? []}
            seeAllTo={`/vendors${typeQuery}`}
          />

          {/* All kitchens — near or far, nearest to the customer first */}
          <section aria-label="All kitchens">
            <SectionHeader
              title="All Kitchens"
              subtitle={
                allVendors.data?.locationUsed
                  ? 'Every kitchen on the platform — nearest to you first'
                  : 'Every kitchen on the platform — use your location to see nearby ones first'
              }
              to={`/vendors${typeQuery}`}
              linkLabel={
                allVendors.data?.total ? `See all ${allVendors.data.total}` : 'See all'
              }
            />
            {allVendors.isPending ? (
              <div className="flex gap-4 overflow-x-auto pb-3 -mx-4 px-4 sm:mx-0 sm:px-0">
                <VendorTileSkeleton />
                <VendorTileSkeleton />
                <VendorTileSkeleton />
              </div>
            ) : allVendors.isError ? (
              <ErrorState onRetry={allVendors.refetch} isRetrying={allVendors.isFetching} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {(allVendors.data?.vendors ?? []).map((vendor) => (
                  <VendorCard key={vendor.id} vendor={vendor} />
                ))}
              </div>
            )}
          </section>

        </div>
      )}

      <div className="mt-12 sm:mt-14">
        <BrandStrip />
      </div>
    </div>
  );
}
