import React, { useRef } from 'react';
import clsx from 'clsx';
import { 
  ChevronLeft, 
  ChevronRight, 
  LayoutGrid, 
  Soup, 
  Flame, 
  Sandwich, 
  Salad, 
  Croissant, 
  Coffee, 
  Clock, 
  Beef, 
  CupSoda, 
  Cake, 
  UtensilsCrossed 
} from 'lucide-react';
import { CategoryBarSkeleton } from '../common/Skeleton';

const isImageUrl = (value = '') =>
  /^(https?:)?\/\//i.test(value) || value.startsWith('data:image');

const CATEGORY_ICON_MAP = {
  all: LayoutGrid,
  local: Soup,
  african: Flame,
  'fast-food': Sandwich,
  fast_food: Sandwich,
  healthy: Salad,
  bakery: Croissant,
  breakfast: Coffee,
  lunch: Clock,
  dinner: Beef,
  drinks: CupSoda,
  desserts: Cake,
};

function CategoryIcon({ iconKey, categoryId, active }) {
  if (isImageUrl(iconKey)) {
    return (
      <img
        src={iconKey}
        alt=""
        aria-hidden="true"
        loading="lazy"
        className="h-6 w-6 object-contain"
      />
    );
  }

  const lookupKey = (iconKey || categoryId || '').toLowerCase().replace(/_/g, '-');
  const IconComponent = CATEGORY_ICON_MAP[lookupKey] || CATEGORY_ICON_MAP[categoryId] || UtensilsCrossed;

  return (
    <IconComponent
      className={clsx(
        'w-5 h-5 transition-transform duration-200 group-hover:scale-110',
        active ? 'text-white' : 'text-[#542813]'
      )}
      aria-hidden="true"
    />
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
      <div className="flex items-center justify-between mb-3.5">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
            Explore by Category
          </h2>
          <p className="text-xs text-stone-500 font-medium">Curated cuisines crafted by local culinary experts</p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => scrollBy(-240)}
            aria-label="Scroll categories left"
            className="w-8 h-8 rounded-full bg-white border border-stone-200 text-stone-600 hover:text-stone-900 hover:border-brand-400 hover:bg-brand-50 flex items-center justify-center transition shadow-sm active:scale-95"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(240)}
            aria-label="Scroll categories right"
            className="w-8 h-8 rounded-full bg-white border border-stone-200 text-stone-600 hover:text-stone-900 hover:border-brand-400 hover:bg-brand-50 flex items-center justify-center transition shadow-sm active:scale-95"
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
            'group flex flex-col items-center gap-2 min-w-[80px] snap-start rounded-2xl px-2.5 py-2.5 transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-700/20 active:scale-95',
            activeId === null
              ? 'bg-gradient-to-br from-[#2b1206] via-[#481f0d] to-[#200d05] text-white shadow-lg shadow-[#2b1206]/30 scale-[1.02]'
              : 'bg-white text-stone-700 border border-stone-200/80 hover:border-brand-300 hover:bg-brand-50/50 hover:-translate-y-0.5 hover:shadow-md',
          )}
        >
          <span
            className={clsx(
              'h-12 w-12 rounded-2xl flex items-center justify-center transition-colors shadow-sm',
              activeId === null
                ? 'bg-white/15 border border-white/20'
                : 'bg-stone-50 border border-stone-100 group-hover:bg-[#faf5f0]',
            )}
          >
            <LayoutGrid className={clsx('w-5 h-5 transition-transform duration-200 group-hover:scale-110', activeId === null ? 'text-white' : 'text-[#542813]')} aria-hidden="true" />
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
                'group flex flex-col items-center gap-2 min-w-[80px] snap-start rounded-2xl px-2.5 py-2.5 transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-700/20 active:scale-95',
                active
                  ? 'bg-gradient-to-br from-[#2b1206] via-[#481f0d] to-[#200d05] text-white shadow-lg shadow-[#2b1206]/30 scale-[1.02]'
                  : 'bg-white text-stone-700 border border-stone-200/80 hover:border-brand-300 hover:bg-brand-50/50 hover:-translate-y-0.5 hover:shadow-md',
              )}
            >
              <span
                className={clsx(
                  'h-12 w-12 rounded-2xl flex items-center justify-center transition-colors shadow-sm',
                  active
                    ? 'bg-white/15 border border-white/20'
                    : 'bg-stone-50 border border-stone-100 group-hover:bg-[#faf5f0]',
                )}
              >
                <CategoryIcon
                  iconKey={category.iconUrl || category.icon}
                  categoryId={category.id}
                  active={active}
                />
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
