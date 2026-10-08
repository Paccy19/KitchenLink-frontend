import React, { useEffect, useState } from 'react';
import { ChefHat, SearchX } from 'lucide-react';
import useSearch, { SEARCH_SUGGESTIONS } from '../../hooks/useSearch';
import DishCard from './DishCard';
import VendorCard from './VendorCard';
import EmptyState, { ErrorState } from '../common/EmptyState';
import { ResultRowSkeleton } from '../common/Skeleton';

function TabButton({ active, onClick, count, children }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`px-4 py-2.5 rounded-2xl text-sm font-bold transition whitespace-nowrap ${
        active
          ? 'bg-orange-600 text-white shadow-md shadow-orange-500/20'
          : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
      }`}
    >
      {children}
      <span
        className={`ml-2 text-xs font-black px-1.5 py-0.5 rounded-full ${
          active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
        }`}
      >
        {count}
      </span>
    </button>
  );
}

/**
 * Tabbed global-search results: Dishes / Kitchens.
 * Fuzzy matching happens on the backend; highlights are rendered client-side.
 *
 * @param {{query:string, onSuggest?: (q:string)=>void}} props
 */
export default function SearchResults({ query, onSuggest }) {
  const { data, isPending, isError, error, refetch, isFetching, debouncedQuery } = useSearch(query);
  const [tab, setTab] = useState('dishes');

  const dishes = data?.dishes ?? [];
  const vendors = data?.vendors ?? [];
  const hasResults = dishes.length > 0 || vendors.length > 0;

  // Auto-select the tab that actually has results.
  useEffect(() => {
    if (!hasResults) return;
    if (tab === 'dishes' && dishes.length === 0 && vendors.length > 0) setTab('kitchens');
    if (tab === 'kitchens' && vendors.length === 0 && dishes.length > 0) setTab('dishes');
  }, [hasResults, dishes.length, vendors.length, tab]);

  if (isPending) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Searching">
        <SkeletonHeading query={query} />
        {Array.from({ length: 4 }).map((_, index) => (
          <ResultRowSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Search failed"
        message={error?.message || 'We could not run your search right now.'}
        onRetry={refetch}
        isRetrying={isFetching}
      />
    );
  }

  if (!hasResults) {
    return (
      <EmptyState
        icon={<SearchX className="w-8 h-8" />}
        title={`No matches for “${debouncedQuery || query}”`}
        message="Double-check the spelling or try one of these popular cravings:"
      >
        <div className="flex flex-wrap justify-center gap-2 pt-1">
          {SEARCH_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onSuggest?.(suggestion)}
              className="px-3.5 py-2 rounded-full bg-orange-50 text-orange-700 border border-orange-100 text-xs font-bold hover:bg-orange-100 transition"
            >
              Try “{suggestion}”
            </button>
          ))}
        </div>
      </EmptyState>
    );
  }

  return (
    <div className="space-y-5">
      <SkeletonHeading query={debouncedQuery || query} />

      <div className="flex items-center gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Search result types">
        <TabButton active={tab === 'dishes'} onClick={() => setTab('dishes')} count={dishes.length}>
          Dishes
        </TabButton>
        <TabButton active={tab === 'kitchens'} onClick={() => setTab('kitchens')} count={vendors.length}>
          Kitchens
        </TabButton>
      </div>

      <div role="tabpanel" aria-label={tab === 'dishes' ? 'Dish results' : 'Kitchen results'}>
        {tab === 'dishes' ? (
          dishes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {dishes.map((dish) => (
                <DishCard key={dish.id} dish={dish} variant="row" highlightedQuery={debouncedQuery} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<ChefHat className="w-8 h-8" />}
              title="No dishes matched"
              message="Kitchens matched your search — check the Kitchens tab."
              actionLabel="Show kitchens"
              onAction={() => setTab('kitchens')}
            />
          )
        ) : vendors.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {vendors.map((vendor) => (
              <VendorCard key={vendor.id} vendor={vendor} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<ChefHat className="w-8 h-8" />}
            title="No kitchens matched"
            message="Dishes matched your search — check the Dishes tab."
            actionLabel="Show dishes"
            onAction={() => setTab('dishes')}
          />
        )}
      </div>
    </div>
  );
}

function SkeletonHeading({ query }) {
  return (
    <h2 className="text-lg font-black text-gray-900">
      Results for <span className="text-orange-600">“{query}”</span>
    </h2>
  );
}
