import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Clock, Heart, Loader2, Plus, Star } from 'lucide-react';
import LazyImage from '../common/LazyImage';
import { formatRwf, normalizeVendorDetail } from '../../api/normalize';
import DishHoverPreview from '../common/DishHoverPreview';
import FoodItemModal from '../vendor/FoodItemModal';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useToast } from '../common/Toast';
import { vendorStorefrontQuery } from '../../hooks/useVendorStorefront';

const hasPrep = (dish) => Boolean(dish.prepTime) && dish.prepTime !== '—';

/**
 * Dish card used in the "Popular Dishes Near You" feed section and in the
 * Dishes tab of global search. Tapping opens the dish details right here —
 * the customer stays on the page and can add it to the basket; the details
 * offer an optional link to the kitchen's full menu.
 *
 * `compact` (tile variant only): the smaller card of the homepage's
 * Popular Dishes grid: a ~96px photo, a one-line name, tighter spacing. It
 * fills its column; the parent sets its width. Without it the tile is the
 * fixed 190px card it always was.
 *
 * `actions` (tile variant only): the full-size card for the homepage's All
 * Dishes grid: it fills its grid cell and adds a favourite heart on the photo
 * and a round "+" that puts the dish in the basket (dishes with options open
 * their details instead). When the dish's kitchen is closed it shows "Kitchen
 * closed", fades to 75% and disables "+" (tooltip: when it opens).
 *
 * @param {{dish:Object, highlightedQuery?:string, variant?:'tile'|'row', compact?:boolean, actions?:boolean, className?:string}} props
 */
export default function DishCard({ dish, highlightedQuery = '', variant = 'tile', compact = false, actions = false, className = '' }) {
  const [open, setOpen] = useState(false);
  const [modalDish, setModalDish] = useState(dish);
  const vendor = dish.vendor
    ? { ...dish.vendor, location: dish.vendor.neighborhood || dish.vendor.location }
    : null;
  const details = open && vendor && (
    <FoodItemModal item={modalDish} vendor={vendor} isOpen onClose={() => setOpen(false)} showKitchenLink />
  );

  const name = highlightedQuery ? highlight(dish.name, highlightedQuery) : dish.name;
  const label = `${dish.name}, ${formatRwf(dish.price)}, from ${dish.vendor?.name ?? 'kitchen'}`;
  const showDetails = (item = dish) => {
    setModalDish(item);
    setOpen(true);
  };

  if (variant === 'tile' && actions) {
    return (
      <>
        <ShopDishTile dish={dish} vendor={vendor} name={name} label={label} onOpen={showDetails} className={className} />
        {details}
      </>
    );
  }

  if (variant === 'row') {
    return (
      <>
        <DishHoverPreview dish={dish}>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={label}
            className="group w-full text-left flex items-center gap-4 bg-white rounded-3xl border border-stone-200/80 p-3.5 shadow-sm hover:shadow-lg hover:border-[#ebd7c5] hover:-translate-y-0.5 transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#542813]/20"
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
              <div className="text-sm font-black text-[#4e2410] whitespace-nowrap">{formatRwf(dish.price)}</div>
              {hasPrep(dish) && (
                <div className="text-[11px] text-stone-400 font-semibold flex items-center gap-1 justify-end mt-0.5">
                  <Clock className="w-3 h-3 text-[#8a5332]" aria-hidden="true" />
                  {dish.prepTime}
                </div>
              )}
            </div>
          </button>
        </DishHoverPreview>
        {details}
      </>
    );
  }

  return (
    <>
      <DishHoverPreview dish={dish} className={`snap-start flex-shrink-0 ${className}`}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={label}
          className={`group block text-left ${compact ? 'w-full h-full rounded-2xl hover:-translate-y-1' : 'min-w-[190px] max-w-[190px] rounded-3xl hover:-translate-y-1.5'} snap-start bg-white border border-stone-200/80 overflow-hidden shadow-sm hover:shadow-2xl hover:border-[#ebd7c5] transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#542813]/20`}
        >
          <div className="relative overflow-hidden">
            <LazyImage
              src={dish.image}
              alt={dish.name}
              aspect={compact ? '' : 'aspect-[4/3]'}
              rounded="rounded-none"
              className={compact ? 'h-24 lg:h-16' : undefined}
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

          <div className={compact ? 'p-2.5 lg:px-2.5 lg:py-2' : 'p-3.5'}>
            <span className={`text-[10px] font-bold uppercase tracking-wider text-stone-400 ${compact ? 'block truncate' : ''}`}>{dish.category}</span>
            <h3 className={`font-extrabold text-sm text-gray-900 group-hover:text-[#542813] transition-colors mt-0.5 leading-snug ${compact ? 'truncate' : 'line-clamp-2'}`}>
              {name}
            </h3>

            <p className={`text-[11px] text-stone-500 font-medium line-clamp-1 ${compact ? 'mt-0.5' : 'mt-1'}`}>{dish.vendor?.name}</p>

            <div className={`flex items-center justify-between gap-1.5 border-t border-stone-100 ${compact ? 'mt-2 pt-1.5 lg:mt-1.5 lg:pt-1' : 'mt-2.5 pt-2'}`}>
              <span className="text-sm font-black text-[#4e2410] whitespace-nowrap">{formatRwf(dish.price)}</span>
              <span className={`text-[11px] text-stone-400 font-semibold flex items-center gap-1 ${compact ? 'min-w-0 whitespace-nowrap overflow-hidden' : ''}`}>
                {dish.rating > 0 && (
                  <>
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" aria-hidden="true" />
                    {dish.rating}
                    {hasPrep(dish) && <span className="mx-0.5">·</span>}
                  </>
                )}
                {hasPrep(dish) && (
                  <>
                    <Clock className="w-3 h-3 text-[#8a5332]" aria-hidden="true" />
                    {dish.prepTime}
                  </>
                )}
              </span>
            </div>
          </div>
        </button>
      </DishHoverPreview>
      {details}
    </>
  );
}

/** "Opens at 08:00", "Opens tomorrow at 08:00", "Opens Mon at 08:00", or '' when unknown. */
function opensAtLabel(opensAt) {
  if (!opensAt?.time) return '';
  if (opensAt.dayOffset === 0) return `Opens at ${opensAt.time}`;
  if (opensAt.dayOffset === 1) return `Opens tomorrow at ${opensAt.time}`;
  const day = opensAt.day ? opensAt.day.charAt(0).toUpperCase() + opensAt.day.slice(1, 3) : '';
  return day ? `Opens ${day} at ${opensAt.time}` : `Opens at ${opensAt.time}`;
}

/** The full-size tile with a favourite heart and an add-to-basket "+" (DishCard `actions`). */
function ShopDishTile({ dish, vendor, name, label, onOpen, className }) {
  const queryClient = useQueryClient();
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const closed = dish.vendor?.isOpen === false;
  const opensAt = closed ? opensAtLabel(dish.vendor?.opensAt) : '';
  const saved = isInWishlist(dish.id);

  const openDetails = async () => {
    if (loadingOptions) return;
    if (!dish.hasOptions || dish.options?.length) {
      onOpen(dish);
      return;
    }
    if (!vendor?.id) {
      toast.error('Kitchen details are unavailable. Please try again.');
      return;
    }
    setLoadingOptions(true);
    try {
      const rawVendor = await queryClient.fetchQuery(vendorStorefrontQuery(vendor.id));
      const fullDish = normalizeVendorDetail(rawVendor).menu.find((item) => item.id === dish.id);
      if (!fullDish?.options?.length) {
        throw new Error('Dish customisation options could not be loaded. Please try again.');
      }
      onOpen(fullDish);
    } catch (error) {
      toast.error(error.message || 'Dish customisation options could not be loaded.');
    } finally {
      setLoadingOptions(false);
    }
  };

  const toggleSaved = async () => {
    try {
      if (saved) {
        await removeFromWishlist(dish.id);
        toast.info(`${dish.name} removed from your wishlist`);
      } else {
        await addToWishlist(dish, vendor);
        toast.success(`${dish.name} saved for later`);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const add = async () => {
    if (closed || !vendor) return;
    // Choices to make first: open the details, as tapping the card does.
    if (dish.hasOptions || dish.options?.length) {
      await openDetails();
      return;
    }
    setBusy(true);
    try {
      await addToCart(dish, vendor, {}, 1);
    } finally {
      setBusy(false);
    }
  };

  const addLabel = closed
    ? `${dish.name}: kitchen closed${opensAt ? `. ${opensAt}` : ''}`
    : `Add ${dish.name} to basket`;

  return (
    <DishHoverPreview dish={dish} className={`min-w-0 h-full ${className}`}>
      <div className={`group relative h-full ${closed ? 'opacity-75' : ''}`}>
        <button
          type="button"
          onClick={openDetails}
          aria-label={`${label}${closed ? ', kitchen closed' : ''}`}
          className="flex w-full h-full flex-col text-left bg-white rounded-3xl border border-stone-200/80 overflow-hidden shadow-sm hover:shadow-2xl hover:border-[#ebd7c5] hover:-translate-y-1.5 transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#542813]/20"
        >
          <div className="relative overflow-hidden flex-shrink-0">
            <LazyImage
              src={dish.image}
              alt={dish.name}
              aspect="aspect-[4/3]"
              rounded="rounded-none"
              imgClassName="group-hover:scale-110 transition-transform duration-500 ease-out"
            />
            <span
              className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-white text-[10px] font-black shadow-md backdrop-blur-sm lg:top-1.5 lg:left-1.5 lg:px-1.5 lg:text-[8px] ${
                closed ? 'bg-stone-600/90' : 'bg-forest-600/95'
              }`}
            >
              {closed ? 'Kitchen closed' : 'Available'}
            </span>
          </div>

          <div className="flex flex-1 flex-col p-3.5 lg:p-2.5">
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
              <span className="min-w-0 truncate">{dish.category}</span>
              {dish.rating > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <Star className="w-3 h-3 flex-shrink-0 fill-amber-400 text-amber-400" aria-hidden="true" />
                  <span className="text-[#8a5332]">{dish.rating}</span>
                </>
              )}
            </span>
            <h3 className="min-h-[2.4em] font-extrabold text-sm sm:text-[15px] lg:text-xs text-gray-900 group-hover:text-[#542813] transition-colors line-clamp-2 mt-0.5 leading-snug">
              {name}
            </h3>
            <p className="text-[11px] sm:text-xs text-stone-500 font-medium line-clamp-1 mt-0.5">{dish.vendor?.name}</p>
            {/* Room on the right for the "+" button, which sits over the card. */}
            <div className="mt-auto pt-2.5 pr-10 flex items-center gap-2 min-h-8 lg:pt-2 lg:pr-6 lg:min-h-7">
              <span className="text-sm sm:text-base lg:text-xs font-black text-[#4e2410] whitespace-nowrap">{formatRwf(dish.price)}</span>
              {hasPrep(dish) && (
                <span className="hidden xl:flex items-center gap-1 text-[11px] text-stone-400 font-semibold">
                  <Clock className="w-3 h-3 text-[#8a5332]" aria-hidden="true" />
                  {dish.prepTime}
                </span>
              )}
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={toggleSaved}
          aria-label={saved ? `Remove ${dish.name} from favourites` : `Save ${dish.name} to favourites`}
          aria-pressed={saved}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/95 shadow-md flex items-center justify-center transition hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#f28c18]/40 lg:top-1.5 lg:right-1.5 lg:w-6 lg:h-6"
        >
          <Heart className={`w-4 h-4 lg:w-3.5 lg:h-3.5 ${saved ? 'fill-rose-500 text-rose-500' : 'text-rose-500'}`} aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={add}
          disabled={closed || busy || loadingOptions}
          aria-label={addLabel}
          title={closed ? opensAt || 'Kitchen closed' : `Add ${dish.name} to basket`}
          className="absolute bottom-3.5 right-3 w-8 h-8 rounded-full bg-[#2b1206] text-white shadow-md flex items-center justify-center transition hover:bg-[#542813] hover:scale-110 active:scale-95 disabled:bg-stone-500 disabled:hover:scale-100 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-4 focus-visible:ring-[#f28c18]/40 lg:bottom-2.5 lg:right-2.5 lg:w-6 lg:h-6"
        >
          {loadingOptions
            ? <Loader2 className="w-4 h-4 animate-spin lg:w-3.5 lg:h-3.5" aria-hidden="true" />
            : <Plus className="w-4 h-4 lg:w-3.5 lg:h-3.5" aria-hidden="true" />}
        </button>
      </div>
    </DishHoverPreview>
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
