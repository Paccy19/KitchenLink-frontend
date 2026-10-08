import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ChefHat, MapPinOff, RefreshCw } from 'lucide-react';

import SearchBar from './SearchBar';
import CategoryBar from './CategoryBar';
import VendorCard from './VendorCard';
import DishCard from './DishCard';
import LocationIndicator from './LocationIndicator';
import PullToRefreshIndicator from './PullToRefreshIndicator';
import PreOrderBanner from './PreOrderBanner';
import FoodItemModal from '../vendor/FoodItemModal';
import EmptyState, { ErrorState } from '../common/EmptyState';
import { HomeFeedSkeleton, VendorTileSkeleton, DishCardSkeleton } from '../common/Skeleton';
import { useToast } from '../common/Toast';

import useHomeFeed from '../../hooks/useHomeFeed';
import useCategories from '../../hooks/useCategories';
import useDebounce from '../../hooks/useDebounce';
import usePullToRefresh from '../../hooks/usePullToRefresh';
import { useLocation } from '../../context/LocationContext';

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
 * Homepage feed: search → location → categories → featured kitchens →
 * popular dishes, with pull-to-refresh and graceful loading/error/empty
 * states. Everything data-driven comes from the React Query hooks.
 */
export default function HomeFeed() {
  const navigate = useNavigate();
  const toast = useToast();
  const { isUsingFallback, isPrimerOpen } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlQuery = searchParams.get('q') ?? '';
  const [query, setQuery] = useState(urlQuery);
  const debouncedQuery = useDebounce(query, SEARCH_DEBOUNCE_MS);
  const [selectedDish, setSelectedDish] = useState(null);

  const feed = useHomeFeed();
  const categories = useCategories({ enabled: !urlQuery.trim() });

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-16" {...pull.handlers}>
      <PullToRefreshIndicator
        pullDistance={pull.pullDistance}
        ready={pull.ready}
        refreshing={pull.refreshing}
      />

      {/* ── Search + location row ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center mb-4">
        <SearchBar
          value={query}
          onChange={setQuery}
          onSubmit={(value) => setQuery(value)}
          className="flex-1"
        />
        <div className="flex items-center gap-2 justify-between sm:justify-start">
          <LocationIndicator />
          <button
            type="button"
            onClick={pull.refresh}
            aria-label="Refresh homepage feed"
            disabled={pull.refreshing}
            className="w-9 h-9 rounded-full bg-white border border-stone-200 text-stone-500 hover:text-[#542813] hover:border-[#d9bda6] hover:bg-[#faf6f2] flex items-center justify-center transition disabled:opacity-60 shadow-sm active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${pull.refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Subtle fallback notice when GPS is unavailable / denied */}
      {isUsingFallback && !isPrimerOpen && !isSearching && (
        <p className="text-[11px] text-gray-400 -mt-2 mb-4 flex items-center gap-1.5">
          <MapPinOff className="w-3.5 h-3.5" aria-hidden="true" />
          Showing kitchens around {feed.data?.location?.label ?? 'Kigali'} — allow location or pick a
          neighbourhood for exact distances.
        </p>
      )}

      {/* ── Search results view ───────────────────────────────── */}
      {isSearching ? (
        <Suspense fallback={<HomeFeedSkeleton />}>
          <SearchResults query={urlQuery} onSuggest={setQuery} />
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
        <div className="space-y-9">
          {/* Categories */}
          <CategoryBar
            categories={data?.categories ?? categories.data ?? []}
            activeId={null}
            onSelect={handleCategorySelect}
            loading={categories.isPending}
          />

          {/* Featured / nearby kitchens */}
          <section aria-label="Featured kitchens">
            <SectionHeader
              title="Featured & Nearby Kitchens"
              subtitle={
                data?.updatedAt
                  ? `Updated ${new Date(data.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : 'Kitchens around you right now'
              }
              to="/vendors"
              linkLabel="See all kitchens"
            />
            {feed.isError && data ? (
              <ErrorState onRetry={feed.refetch} isRetrying={feed.isFetching} />
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-3 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x">
                {(data?.featuredVendors ?? []).map((vendor) => (
                  <VendorCard key={vendor.id} vendor={vendor} variant="tile" />
                ))}
                {feed.isFetching && !data?.featuredVendors?.length && (
                  <>
                    <VendorTileSkeleton />
                    <VendorTileSkeleton />
                    <VendorTileSkeleton />
                  </>
                )}
              </div>
            )}

            {!feed.isPending && (data?.featuredVendors?.length ?? 0) === 0 && !feed.isError && (
              <EmptyState
                icon={<ChefHat className="w-8 h-8" />}
                title="No kitchens nearby yet"
                message="Widen your search radius or switch neighbourhood to discover more kitchens."
                actionLabel="Browse nearby kitchens"
                onAction={() => navigate('/vendors')}
              />
            )}
          </section>

          {/* Popular dishes near you */}
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

          {/* Pre-order / tomorrow's specials (existing marketplace feature) */}
          <PreOrderBanner onSelectPreorderDish={(dish, vendor) => {
            setSelectedDish({ dish, vendor });
          }} />

          {selectedDish && (
            <FoodItemModal
              item={selectedDish.dish}
              vendor={selectedDish.vendor}
              isOpen
              onClose={() => setSelectedDish(null)}
            />
          )}
        </div>
      )}
    </div>
  );
}
