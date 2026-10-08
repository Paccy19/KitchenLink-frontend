import React, { useRef } from 'react';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react';
import { CategoryBarSkeleton } from '../common/Skeleton';

const isImageUrl = (value = '') =>
  /^(https?:)?\/\//i.test(value) || value.startsWith('data:image');

function CategoryIcon({ iconUrl, name, active }) {
  if (isImageUrl(iconUrl)) {
    return (
      <img
        src={iconUrl}
        alt=""
        aria-hidden="true"
        loading="lazy"
        className="h-7 w-7 object-contain"
      />
    );
  }
  return (
    <span className="text-2xl leading-none" aria-hidden="true">
      {iconUrl || name?.charAt(0) || '🍽️'}
    </span>
  );
}

/**
 * Persistent horizontal category bar for the homepage.
 * Tapping a category navigates to the filtered nearby-vendors list.
 *
 * @param {{categories:Array, activeId?:string|null,
 *          onSelect:(categoryId:string|null)=>void, loading?:boolean}} props
 */
export default function CategoryBar({ categories = [], activeId = null, onSelect, loading = false }) {
  const scrollerRef = useRef(null);

  const scrollBy = (amount) => {
    scrollerRef.current?.scrollBy({ left: amount, behavior: 'smooth' });
  };

  if (loading && categories.length === 0) return <CategoryBarSkeleton />;

  return (
    <section aria-label="Food categories" className="relative group/bar">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
          Explore by Category
        </h2>
        <div className="hidden sm:flex items-center gap-1">
          <button
            type="button"
            onClick={() => scrollBy(-240)}
            aria-label="Scroll categories left"
            className="w-8 h-8 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300 flex items-center justify-center transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(240)}
            aria-label="Scroll categories right"
            className="w-8 h-8 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300 flex items-center justify-center transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x scrollbar-none"
        role="tablist"
        aria-label="Categories"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeId === null}
          onClick={() => onSelect?.(null)}
          className={clsx(
            'flex flex-col items-center gap-2 min-w-[76px] snap-start rounded-2xl px-2 py-2 transition focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-500/20',
            activeId === null
              ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/25'
              : 'bg-white text-gray-700 border border-gray-100 hover:border-orange-200 hover:bg-orange-50/50',
          )}
        >
          <span className="h-12 w-12 rounded-2xl bg-white/95 border border-orange-100 flex items-center justify-center shadow-sm">
            <LayoutGrid className="w-5 h-5 text-orange-600" aria-hidden="true" />
          </span>
          <span className="text-[11px] font-bold leading-tight text-center">All</span>
        </button>

        {categories.map((category) => {
          const active = activeId === category.id;
          return (
            <button
              key={category.id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={`Browse ${category.name}`}
              title={category.description || category.name}
              onClick={() => onSelect?.(category.id)}
              className={clsx(
                'flex flex-col items-center gap-2 min-w-[76px] snap-start rounded-2xl px-2 py-2 transition focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-500/20',
                active
                  ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/25'
                  : 'bg-white text-gray-700 border border-gray-100 hover:border-orange-200 hover:bg-orange-50/50',
              )}
            >
              <span
                className={clsx(
                  'h-12 w-12 rounded-2xl flex items-center justify-center shadow-sm',
                  active ? 'bg-white/95' : 'bg-gray-50 border border-gray-100',
                )}
              >
                <CategoryIcon iconUrl={category.iconUrl} name={category.name} active={active} />
              </span>
              <span className="text-[11px] font-bold leading-tight text-center line-clamp-2">
                {category.name}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
