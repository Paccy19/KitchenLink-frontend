import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import HeroSlider from './HeroSlider';
import KitchensRow from './KitchensRow';
import AllDishes from './AllDishes';

import PullToRefreshIndicator from './PullToRefreshIndicator';
import HomeHero from './HomeHero';
import { CategoryCircles, PopularDishes, OrderBand, SectionTitle } from './HomeSections';
import useCategories from '../../hooks/useCategories';
import useReveal from '../../hooks/useReveal';
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
  const popularDishes = data?.popularDishes ?? [];
  const categories = useCategories({ enabled: !isSearching });
  const reveal = useReveal([isSearching, feed.isPending, popularDishes.length, categories.data?.length]);
  const hasSpecials = (specials.data?.length ?? 0) > 0 || (offers.data?.length ?? 0) > 0;

  return (
    <div ref={reveal} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-16" {...pull.handlers}>
      <PullToRefreshIndicator
        pullDistance={pull.pullDistance}
        ready={pull.ready}
        refreshing={pull.refreshing}
      />

      {/* ── Hero: headline, search, order / kitchens ─────────────── */}
      <HomeHero
        query={query}
        onQueryChange={setQuery}
        onSubmit={setQuery}
        kitchens={nearKitchens.data?.vendors?.length ?? 0}
        dishes={popularDishes.length}
      />

      {isSearching ? (
        <div className="mt-10">
          <Suspense fallback={<HomeFeedSkeleton />}>
            <SearchResults query={urlQuery} onSuggest={setQuery} vendorTypes={vendorTypes} onVendorTypesChange={setVendorTypes} />
          </Suspense>
        </div>
      ) : feed.isPending ? (
        <div className="mt-10"><HomeFeedSkeleton /></div>
      ) : feed.isError && !data ? (
        <div className="mt-10">
          <ErrorState
            title="Your feed could not load"
            message={feed.error?.message || 'We could not reach the kitchens near you.'}
            onRetry={feed.refetch}
            isRetrying={feed.isFetching}
          />
        </div>
      ) : (
        <div className="mt-14 sm:mt-20 space-y-16 sm:space-y-24">
          <CategoryCircles categories={categories.data ?? []} />

          {popularDishes.length > 0 ? (
            <PopularDishes dishes={popularDishes} />
          ) : (
            (feed.isFetching) && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }, (_, i) => <CompactDishSkeleton key={i} />)}</div>
            )
          )}

          {/* Big events, Tomorrow's Specials and Offer Days, one slide each. */}
          {hasSpecials && (
            <section aria-label="Specials" className="kl-reveal">
              <SectionTitle kicker="Limited" title="Today's specials" to="/vendors?filter=preorder" linkLabel="All specials" />
              <HeroSlider specials={specials.data ?? []} offers={offers.data ?? []} />
            </section>
          )}

          <div className="kl-reveal">
            <KitchensRow vendors={nearKitchens.data?.vendors ?? []} loading={nearKitchens.isPending} allTo="/vendors" />
          </div>

          <div className="kl-reveal">
            <AllDishes />
          </div>

          <OrderBand />
        </div>
      )}

    </div>
  );
}
