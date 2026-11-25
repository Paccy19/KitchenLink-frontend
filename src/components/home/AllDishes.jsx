import React, { useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import DishCard from './DishCard';
import { RowHeading } from './HomeCardRow';
import { Skeleton } from '../common/Skeleton';
import { ErrorState } from '../common/EmptyState';
import useAllDishes from '../../hooks/useAllDishes';
import useCategories from '../../hooks/useCategories';

const SORTS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Rating' },
  { value: 'delivery_time', label: 'Delivery time' },
];

function DishTileSkeleton() {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden" aria-hidden="true">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="p-3.5 space-y-2.5">
        <Skeleton className="h-2.5 w-1/3" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-5 w-24" />
      </div>
    </div>
  );
}

/**
 * "All Dishes" on the homepage: every dish from every kitchen, 8 at a time
 * from GET /home/dishes, with category chips and a sort menu. "Load more
 * dishes" fetches the next page.
 */
export default function AllDishes() {
  const [categoryId, setCategoryId] = useState(null);
  const [sort, setSort] = useState('recommended');
  const categories = useCategories();
  const dishes = useAllDishes({ categoryId, sort });

  const list = dishes.data?.dishes ?? [];
  const total = dishes.data?.total ?? 0;
  const subtitle = `Everything on the menu from every kitchen${dishes.data ? ` · ${total} ${total === 1 ? 'dish' : 'dishes'}` : ''}`;
  // A new chip or sort shows the old grid (faded) until its first page arrives.
  const switching = dishes.isPlaceholderData;

  const chips = [{ id: null, name: 'All' }, ...(categories.data ?? [])];

  return (
    <section aria-label="All dishes">
      <RowHeading title="All Dishes" subtitle={subtitle}>
        <label className="flex flex-shrink-0 items-center gap-2.5">
          <span className="hidden sm:inline text-sm font-medium text-stone-500">Sort by</span>
          <span className="relative">
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              aria-label="Sort dishes"
              className="appearance-none pl-3.5 pr-9 py-2 rounded-xl bg-white border border-[#ebd7c5] text-sm font-bold text-gray-900 shadow-sm hover:border-[#d9bda6] focus:border-[#f28c18] focus:ring-4 focus:ring-[#f28c18]/15 outline-none transition cursor-pointer"
            >
              {SORTS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6d391d]" aria-hidden="true" />
          </span>
        </label>
      </RowHeading>

      {/* Category chips: the active one is the dark brown pill. */}
      <div
        role="tablist"
        aria-label="Dish categories"
        className="flex gap-2.5 overflow-x-auto pt-0.5 pb-3 mb-2 -mx-4 px-4 sm:mx-0 sm:px-0.5 snap-x scrollbar-none"
      >
        {chips.map((chip) => {
          const active = chip.id === categoryId;
          return (
            <button
              key={chip.id ?? 'all'}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setCategoryId(chip.id)}
              className={`flex-shrink-0 snap-start px-4 py-2 rounded-full text-sm font-bold border transition active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#542813]/20 ${
                active
                  ? 'bg-[#2b1206] border-[#2b1206] text-white shadow-md shadow-[#2b1206]/20'
                  : 'bg-white border-[#ebd7c5] text-stone-700 hover:border-[#d9bda6] hover:text-[#3d1b0c]'
              }`}
            >
              {chip.name}
            </button>
          );
        })}
      </div>

      {dishes.isError && list.length === 0 ? (
        <ErrorState
          title="Dishes could not load"
          message={dishes.error?.message || 'We could not reach the kitchens.'}
          onRetry={dishes.refetch}
          isRetrying={dishes.isFetching}
        />
      ) : dishes.isPending ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {Array.from({ length: 8 }, (_, i) => <DishTileSkeleton key={i} />)}
        </div>
      ) : list.length === 0 ? (
        <p className="rounded-3xl bg-[#faf6f2] border border-[#f1e2d2] px-4 py-10 text-center text-sm font-semibold text-stone-500">
          No dishes in this category yet.
        </p>
      ) : (
        <>
          <div
            aria-busy={dishes.isFetching}
            className={`grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 transition-opacity ${switching ? 'opacity-50' : ''}`}
          >
            {list.map((dish) => (
              <DishCard key={dish.id} dish={dish} actions />
            ))}
            {dishes.isFetchingNextPage && Array.from({ length: 8 }, (_, i) => <DishTileSkeleton key={`more-${i}`} />)}
          </div>

          {dishes.hasNextPage && !switching && (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => dishes.fetchNextPage()}
                disabled={dishes.isFetchingNextPage}
                className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-white border border-[#ebd7c5] text-sm sm:text-base font-extrabold text-[#2b1206] shadow-sm hover:border-[#d9bda6] hover:shadow-md transition active:scale-95 disabled:opacity-60"
              >
                {dishes.isFetchingNextPage && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                {dishes.isFetchingNextPage ? 'Loading…' : 'Load more dishes'}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
