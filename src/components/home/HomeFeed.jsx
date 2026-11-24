import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import TopRatedKitchens from './TopRatedKitchens';
import BrandStrip from './BrandStrip';
import BigEventsBanner from './BigEventsBanner';
import CategoryBar from './CategoryBar';
import SearchBar from './SearchBar';
import VendorCard from './VendorCard';
import DishCard from './DishCard';
import SpecialCard from './SpecialCard';
import PullToRefreshIndicator from './PullToRefreshIndicator';
import { ErrorState } from '../common/EmptyState';
import VendorTypeFilter from '../common/VendorTypeFilter';
import useVendorTypeParam from '../../hooks/useVendorTypeParam';
import { HomeFeedSkeleton, VendorTileSkeleton, DishCardSkeleton } from '../common/Skeleton';
import { useToast } from '../common/Toast';

import useHomeFeed from '../../hooks/useHomeFeed';
import useCategories from '../../hooks/useCategories';
import useVendorSpecials from '../../hooks/useVendorSpecials';
import useAllVendors from '../../hooks/useAllVendors';
import useVendorOffers from '../../hooks/useVendorOffers';
import OfferDayCard from './OfferDayCard';
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

/**
 * Homepage feed: search → Big Events → categories → products → kitchens,
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

      <section aria-label="Find food and kitchens" className="mb-5 sm:mb-6 max-w-3xl">
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

      {/* ── Compact Big Events promotion ──────────────────────── */}
      <BigEventsBanner />

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

          {/* Vendor products and specials appear before kitchen listings. */}
          {((specials.data?.length ?? 0) > 0 || (offers.data?.length ?? 0) > 0) && (
            <section aria-label="Tomorrow's specials">
              <SectionHeader
                title="Tomorrow's Specials"
                subtitle="Pre-order specials and upcoming kitchen offers"
                to="/vendors?filter=preorder"
                linkLabel="See all"
              />
              <div className="flex gap-4 overflow-x-auto pb-3 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x">
                {(specials.data ?? []).map((entry) => (
                  <SpecialCard
                    key={entry.vendor.id}
                    vendor={entry.vendor}
                    special={entry.special}
                  />
                ))}
                {(offers.data ?? []).map((offer) => (
                  <OfferDayCard key={offer.id} offer={offer} />
                ))}
              </div>
            </section>
          )}

          <section aria-label="Popular dishes near you">
            <SectionHeader
              title="Popular Dishes Near You"
              subtitle="What people around you are ordering today"
              to="/vendors"
              linkLabel="Browse menus"
            />
            <div className="flex gap-4 overflow-x-auto pb-3 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x">
              {(data?.popularDishes ?? []).map((dish) => (
                <DishCard key={dish.id} dish={dish} />
              ))}
              {feed.isFetching && (data?.popularDishes?.length ?? 0) === 0 && (
                <>
                  <DishCardSkeleton />
                  <DishCardSkeleton />
                  <DishCardSkeleton />
                </>
              )}
            </div>
          </section>

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
