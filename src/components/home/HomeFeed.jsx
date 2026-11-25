import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import BrandStrip from './BrandStrip';
import HeroSlider from './HeroSlider';
import KitchensRow from './KitchensRow';
import AllDishes from './AllDishes';
import SearchBar from './SearchBar';
import DishCard from './DishCard';
import PullToRefreshIndicator from './PullToRefreshIndicator';
import { ErrorState } from '../common/EmptyState';
import useVendorTypeParam from '../../hooks/useVendorTypeParam';
import { HomeFeedSkeleton, Skeleton } from '../common/Skeleton';
import { useToast } from '../common/Toast';

import useHomeFeed from '../../hooks/useHomeFeed';
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
 * Homepage feed: search, hero slider, popular dishes, Kitchens Near You, and All Dishes.
 * Pull-to-refresh and graceful loading/error/empty states are included.
 */
export default function HomeFeed() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlQuery = searchParams.get('q') ?? '';
  const [query, setQuery] = useState(urlQuery);
  const debouncedQuery = useDebounce(query, SEARCH_DEBOUNCE_MS);

  // Search results retain their existing kitchen-type filter.
  const [vendorTypes, setVendorTypes] = useVendorTypeParam();

  const feed = useHomeFeed();
  // "Kitchens Near You": nearest first from the server, regardless of type.
  const nearKitchens = useAllVendors({ perPage: 20, enabled: !urlQuery.trim() });
  const specials = useVendorSpecials();
  const offers = useVendorOffers();

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

  const isSearching = urlQuery.trim().length > 0;
  const data = feed.data;
  const popularDishes = (data?.popularDishes ?? []).slice(0, 4);

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
          {/* The specials live in the slider; this links to all of them. */}
          {((specials.data?.length ?? 0) > 0 || (offers.data?.length ?? 0) > 0) && (
            <div className="mt-2 flex justify-end">
              <Link
                to="/vendors?filter=preorder"
                className="text-xs font-black text-[#542813] hover:text-[#2b1206] whitespace-nowrap flex items-center gap-1 group transition-colors"
              >
                <span>View all specials</span>
                <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
              </Link>
            </div>
          )}
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
          {/* Kitchens near the customer (open first, then by rating); tapping one opens it. */}
          <KitchensRow
            vendors={nearKitchens.data?.vendors ?? []}
            loading={nearKitchens.isPending}
            allTo="/vendors"
          />

          {/* Every dish from every kitchen, 8 at a time, with category chips and sorting. */}
          <AllDishes />

        </div>
      )}

      <div className="mt-12 sm:mt-14">
        <BrandStrip />
      </div>
    </div>
  );
}
