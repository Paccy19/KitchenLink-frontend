import React, { useRef } from 'react';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react';
import FadeImage from '../common/FadeImage';
import { scrollBehavior } from '../../utils/motion';
import { CategoryBarSkeleton } from '../common/Skeleton';

const isImageUrl = (value = '') =>
  /^(https?:)?\/\//i.test(value) || value.startsWith('data:image') || value.startsWith('/');

const PHOTO = (name) => `/images/home/food/${name}.jpg`;

/**
 * A food photo for a category, from words in its name (the categories are
 * the live ones from the server; admins can rename or add them). First match
 * wins; anything unknown gets a general plate.
 */
const PHOTO_RULES = [
  [/pizza/, 'pizza'],
  // Before "fast": "breakfast" contains it.
  [/breakfast|pancake/, 'pancakes'],
  [/burger|\bfast|street|snack/, 'burger'],
  [/grill|brochette|bbq|barbecue|kebab|skewer/, 'skewers'],
  [/meat|steak|dinner/, 'steak'],
  [/healthy|salad|vegan|vegetarian|meal prep/, 'salad'],
  [/rice|bowl|lunch|prepared/, 'bowl'],
  [/pasta|noodle/, 'pasta'],
  [/bread|bakery/, 'bread'],
  [/pastr|croissant/, 'toast'],
  [/cake|cookie|biscuit/, 'cake'],
  [/dessert|sweet|ice cream/, 'dessert'],
  [/coffee|tea|cafe/, 'coffee'],
  [/drink|juice|smoothie|beverage/, 'juice'],
  [/local|rwanda|african|traditional|signature|restaurant|catering|general/, 'plate'],
];
const photoFor = (name = '') => {
  const lower = name.toLowerCase();
  const rule = PHOTO_RULES.find(([pattern]) => pattern.test(lower));
  return PHOTO(rule ? rule[1] : 'plate');
};

function CategoryCard({ name, image, active, onClick, label, title, icon: Icon = null }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-label={label}
      title={title}
      onClick={onClick}
      className={clsx(
        'group flex-shrink-0 w-[112px] sm:w-[134px] snap-start rounded-[20px] overflow-hidden flex flex-col transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#542813]/25 active:scale-95',
        active
          ? 'bg-[#6d391d] text-white shadow-lg shadow-[#2b1206]/30'
          : 'bg-white text-gray-900 shadow-[0_2px_10px_rgba(43,18,6,0.08)] hover:-translate-y-1 hover:shadow-[0_10px_24px_rgba(43,18,6,0.14)]',
      )}
    >
      {Icon ? (
        // "All": an icon tile instead of a photo, as in the design.
        <span className="flex w-full aspect-[4/3] items-center justify-center">
          <span className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center">
            <Icon className={clsx('w-6 h-6 sm:w-7 sm:h-7', active ? 'text-[#ffc27a]' : 'text-[#f28c18]')} aria-hidden="true" />
          </span>
        </span>
      ) : (
        <span className="block w-full aspect-[4/3] overflow-hidden bg-[#f5ebe1]">
          <FadeImage
            src={image}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            fallback={<span className="block w-full h-full bg-[#f5ebe1]" />}
          />
        </span>
      )}
      <span className="block px-2 py-2.5 text-xs sm:text-[13px] font-bold leading-tight text-center line-clamp-2">
        {name}
      </span>
    </button>
  );
}

/**
 * "Popular Food Categories" row on the homepage: photo cards for the live
 * categories (an image an admin uploaded for a category is used first).
 * Tapping one opens the kitchens filtered by it, exactly as before.
 *
 * @param {{categories:Array, activeId?:string|null,
 *          onSelect:(categoryId:string|null)=>void, loading?:boolean}} props
 */
export default function CategoryBar({
  categories = [],
  activeId = null,
  onSelect,
  loading = false,
  title = 'Explore by Category',
  subtitle = 'Curated cuisines crafted by local culinary experts',
}) {
  const scrollerRef = useRef(null);

  const scrollBy = (amount) => {
    scrollerRef.current?.scrollBy({ left: amount, behavior: scrollBehavior() });
  };

  if (loading && categories.length === 0) return <CategoryBarSkeleton />;

  return (
    <section aria-label="Food categories" className="relative">
      <div className="flex items-end justify-between gap-3 mb-4">
        <div className="flex items-stretch gap-3">
          <span aria-hidden="true" className="w-1.5 rounded-full bg-[#f28c18]" />
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">{title}</h2>
            <p className="text-xs sm:text-sm text-stone-500 font-medium mt-0.5">{subtitle}</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => scrollBy(-320)}
            aria-label="Scroll categories left"
            className="w-9 h-9 rounded-full bg-white border border-stone-200 text-stone-600 hover:text-[#542813] hover:border-[#d9bda6] flex items-center justify-center transition shadow-sm active:scale-95"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(320)}
            aria-label="Scroll categories right"
            className="w-9 h-9 rounded-full bg-white border border-stone-200 text-stone-600 hover:text-[#542813] hover:border-[#d9bda6] flex items-center justify-center transition shadow-sm active:scale-95"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="flex gap-3 sm:gap-4 overflow-x-auto pt-1 pb-3 -mx-4 px-4 sm:mx-0 sm:px-1 snap-x scrollbar-none"
        role="tablist"
        aria-label="Categories"
      >
        <CategoryCard
          name="All"
          icon={LayoutGrid}
          active={activeId === null}
          label="Browse all kitchens"
          onClick={() => onSelect?.(null)}
        />
        {categories.map((category) => {
          const uploaded = category.iconUrl && isImageUrl(category.iconUrl) ? category.iconUrl : '';
          return (
            <CategoryCard
              key={category.id}
              name={category.name}
              image={uploaded || photoFor(category.name)}
              active={activeId === category.id}
              label={`Browse ${category.name}`}
              title={category.description || category.name}
              onClick={() => onSelect?.(category.id)}
            />
          );
        })}
      </div>
    </section>
  );
}
