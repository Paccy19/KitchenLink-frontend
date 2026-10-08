import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, Star } from 'lucide-react';
import LazyImage from '../common/LazyImage';
import { formatRwf } from '../../api/normalize';

/**
 * Dish card used in the "Popular Dishes Near You" feed section and in the
 * Dishes tab of global search. Tapping opens the dish inside its kitchen's
 * storefront.
 *
 * @param {{dish:Object, highlightedQuery?:string, variant?:'tile'|'row'}} props
 */
export default function DishCard({ dish, highlightedQuery = '', variant = 'tile' }) {
  const to = `/vendor/${dish.vendor?.id ?? ''}?dish=${encodeURIComponent(dish.id)}`;

  const name = highlightedQuery ? highlight(dish.name, highlightedQuery) : dish.name;

  if (variant === 'row') {
    return (
      <Link
        to={to}
        aria-label={`${dish.name}, ${formatRwf(dish.price)}, from ${dish.vendor?.name ?? 'kitchen'}`}
        className="group flex items-center gap-4 bg-white rounded-3xl border border-stone-200/80 p-3.5 shadow-sm hover:shadow-lg hover:border-[#ebd7c5] hover:-translate-y-0.5 transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#542813]/20"
      >
        <LazyImage
          src={dish.image}
          alt={dish.name}
          aspect="aspect-square"
          className="w-20 h-20 flex-shrink-0 rounded-2xl overflow-hidden"
          imgClassName="group-hover:scale-108 transition-transform duration-500 ease-out"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
              {dish.category}
            </span>
            {!dish.isAvailable && (
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">
                Sold out
              </span>
            )}
          </div>
          <h3 className="font-extrabold text-sm text-gray-900 group-hover:text-[#542813] transition-colors line-clamp-1">
            {name}
          </h3>
          <p className="text-xs text-stone-500 line-clamp-1">{dish.vendor?.name}</p>
        </div>
        <div className="text-right flex-shrink-0 pr-1">
          <div className="text-sm font-black text-[#4e2410] whitespace-nowrap">
            {formatRwf(dish.price)}
          </div>
          <div className="text-[11px] text-stone-400 font-semibold flex items-center gap-1 justify-end mt-0.5">
            <Clock className="w-3 h-3 text-[#8a5332]" aria-hidden="true" />
            {dish.prepTime}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={to}
      aria-label={`${dish.name}, ${formatRwf(dish.price)}, from ${dish.vendor?.name ?? 'kitchen'}`}
      className="group block min-w-[190px] max-w-[190px] snap-start bg-white rounded-3xl border border-stone-200/80 overflow-hidden shadow-sm hover:shadow-2xl hover:border-[#ebd7c5] hover:-translate-y-1.5 transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#542813]/20"
    >
      <div className="relative overflow-hidden">
        <LazyImage
          src={dish.image}
          alt={dish.name}
          aspect="aspect-[4/3]"
          rounded="rounded-none"
          imgClassName="group-hover:scale-110 transition-transform duration-500 ease-out"
        />
        {dish.isAvailable ? (
          <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-forest-600/95 text-white text-[10px] font-black shadow-md backdrop-blur-sm">
            Available
          </span>
        ) : (
          <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-stone-800/90 text-white text-[10px] font-black shadow-md backdrop-blur-sm">
            Sold out
          </span>
        )}
      </div>

      <div className="p-3.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
          {dish.category}
        </span>
        <h3 className="font-extrabold text-sm text-gray-900 group-hover:text-[#542813] transition-colors line-clamp-2 mt-0.5 leading-snug">
          {name}
        </h3>

        <p className="text-[11px] text-stone-500 font-medium line-clamp-1 mt-1">
          {dish.vendor?.name}
        </p>

        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-stone-100">
          <span className="text-sm font-black text-[#4e2410] whitespace-nowrap">
            {formatRwf(dish.price)}
          </span>
          <span className="text-[11px] text-stone-400 font-semibold flex items-center gap-1">
            {dish.rating > 0 && (
              <>
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" aria-hidden="true" />
                {dish.rating}
                <span className="mx-0.5">·</span>
              </>
            )}
            <Clock className="w-3 h-3 text-[#8a5332]" aria-hidden="true" />
            {dish.prepTime}
          </span>
        </div>
      </div>
    </Link>
  );
}

/** Escape regex characters in the user query. */
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Wrap fuzzy matches in <mark> — the backend only needs to return matches,
 * highlighting is done safely on the client.
 */
function highlight(text = '', query = '') {
  const trimmed = query.trim();
  if (!trimmed) return text;
  try {
    const regex = new RegExp(
      `(${trimmed.split(/\s+/).map(escapeRegExp).join('|')})`,
      'gi',
    );
    const parts = String(text).split(regex);
    // split() with a capturing group returns matches at odd indexes
    return parts.map((part, index) =>
      index % 2 === 1 ? (
        <mark key={index} className="bg-[#f5ebe1] text-[#3d1b0c] font-semibold rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      ),
    );
  } catch {
    return text;
  }
}
