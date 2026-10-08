import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bike,
  Clock,
  Heart,
  Info,
  MapPin,
  Plus,
  ShoppingBag,
  Star,
  UtensilsCrossed,
} from 'lucide-react';
import useVendorStorefront from '../hooks/useVendorStorefront';
import { StorefrontSkeleton } from '../components/common/Skeleton';
import EmptyState, { ErrorState } from '../components/common/EmptyState';
import LazyImage from '../components/common/LazyImage';
import FoodItemModal from '../components/vendor/FoodItemModal';
import { useCart } from '../context/CartContext';
import { useToast } from '../components/common/Toast';
import { useWishlist } from '../context/WishlistContext';
import { formatRwf } from '../api/normalize';

/**
 * Vendor storefront: `GET /vendors/{vendor_id}`.
 * Header (banner, type, rating, prep time, delivery, neighbourhood),
 * category tabs, menu items with availability, sticky cart CTA.
 */
export default function VendorPage() {
  const { vendorId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const { addToCart, setIsCartOpen, cartItems, subtotal, totalItemCount } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

  const { data: vendor, isPending, isError, error, refetch, isFetching } =
    useVendorStorefront(vendorId);

  const [activeCategory, setActiveCategory] = useState('All');
  const [modalDish, setModalDish] = useState(null);

  // Deep link: /vendor/:id?dish=dish-101 opens the dish modal.
  const dishParam = searchParams.get('dish');
  useEffect(() => {
    if (!dishParam || !vendor?.menu?.length) return;
    const match = vendor.menu.find((dish) => dish.id === dishParam);
    if (match) setModalDish(match);
    if (dishParam) {
      const next = new URLSearchParams(searchParams);
      next.delete('dish');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dishParam, vendor]);

  const menuCategories = useMemo(
    () => ['All', ...(vendor?.menuCategories ?? [])],
    [vendor],
  );

  const groupedMenu = useMemo(() => {
    if (!vendor?.menu) return [];
    const filtered =
      activeCategory === 'All'
        ? vendor.menu
        : vendor.menu.filter((dish) => dish.category === activeCategory);
    const groups = new Map();
    filtered.forEach((dish) => {
      if (!groups.has(dish.category)) groups.set(dish.category, []);
      groups.get(dish.category).push(dish);
    });
    return [...groups.entries()];
  }, [vendor, activeCategory]);

  const handleQuickAdd = async (dish) => {
    if (!vendor) return;
    if (dish.options?.length) {
      setModalDish(dish);
      return;
    }
    const added = await addToCart({ ...dish }, { ...vendor, location: vendor.neighborhood }, {}, 1);
    if (added) toast.success(`${dish.name} added to cart`);
  };

  const handleWishlistToggle = async (dish) => {
    try {
      if (isInWishlist(dish.id)) {
        await removeFromWishlist(dish.id);
        toast.info(`${dish.name} removed from your wishlist`);
      } else {
        await addToWishlist(dish, { ...vendor, location: vendor.neighborhood });
        toast.success(`${dish.name} saved for later`);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (isPending) {
    return (
      <div className="pb-24">
        <StorefrontSkeleton />
      </div>
    );
  }

  if (isError || !vendor) {
    const notFound = error?.status === 404;
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 animate-fade-in">
        {notFound ? (
          <EmptyState
            icon={<UtensilsCrossed className="w-8 h-8 text-[#542813]" />}
            title="Kitchen not found"
            message="This kitchen may have been removed or the link is incorrect."
            actionLabel="Browse nearby kitchens"
            onAction={() => {
              window.location.href = '/vendors';
            }}
          />
        ) : (
          <ErrorState
            title="Storefront unavailable"
            message={error?.message || 'We could not load this kitchen right now.'}
            onRetry={refetch}
            isRetrying={isFetching}
          />
        )}
      </div>
    );
  }

  const cartVendorItems = cartItems.filter((item) => item.vendorId === vendor.id);

  return (
    <div className="min-h-screen bg-[#faf7f4] pb-28 animate-fade-in">
      {/* ── Header banner ─────────────────────────────────────── */}
      <div className="relative h-56 sm:h-80 w-full bg-stone-900 overflow-hidden">
        <img
          src={vendor.bannerUrl}
          alt={`${vendor.name} storefront`}
          className="w-full h-full object-cover opacity-90 scale-100 hover:scale-105 transition-transform duration-700 ease-out"
          loading="eager"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/25" />

        <div className="absolute top-5 left-4 sm:left-8 z-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/90 hover:bg-white text-gray-900 font-bold text-xs shadow-md backdrop-blur-md transition-all active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Back to Kitchens</span>
            <span className="sm:hidden">Back</span>
          </Link>
        </div>

        <div className="absolute bottom-5 left-4 right-4 sm:left-8 sm:right-8 text-white">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="px-3 py-1 rounded-full text-xs font-black bg-[#2b1206] text-white border border-[#522712] shadow-md">
              {vendor.type}
            </span>
            {vendor.isOpen && (
              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-forest-600 shadow-md">
                Open now
              </span>
            )}
            {vendor.deliveryAvailable && (
              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-white/95 text-forest-700 flex items-center gap-1 shadow-md">
                <Bike className="w-3.5 h-3.5" aria-hidden="true" />
                Delivery available
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight drop-shadow-sm">
            {vendor.name}
          </h1>
        </div>
      </div>

      {/* ── Info card ─────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
        <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-xl border border-stone-200/80 mb-7">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
            <div className="flex items-center gap-1.5 text-sm font-extrabold text-gray-900">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" aria-hidden="true" />
              {vendor.rating}
              {vendor.reviewsCount > 0 && (
                <span className="text-xs text-stone-400 font-medium">({vendor.reviewsCount} reviews)</span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-sm font-bold text-stone-700">
              <Clock className="w-4 h-4 text-[#8a5332]" aria-hidden="true" />
              {vendor.prepTime}
              <span className="text-xs text-stone-400 font-medium">prep</span>
            </div>

            <div className="flex items-center gap-1.5 text-sm font-bold text-stone-700">
              <MapPin className="w-4 h-4 text-[#8a5332]" aria-hidden="true" />
              {vendor.neighborhood}
            </div>

            {vendor.deliveryFee > 0 && (
              <div className="flex items-center gap-1.5 text-sm font-bold text-stone-700">
                <Bike className="w-4 h-4 text-[#8a5332]" aria-hidden="true" />
                {formatRwf(vendor.deliveryFee)} delivery
              </div>
            )}

            {vendor.operatingHours && (
              <div className="flex items-center gap-1.5 text-sm font-bold text-stone-700">
                <Info className="w-4 h-4 text-stone-400" aria-hidden="true" />
                {vendor.operatingHours}
              </div>
            )}
          </div>

          {vendor.description && (
            <p className="text-sm text-stone-600 leading-relaxed mt-4 pt-4 border-t border-stone-100 max-w-3xl">
              {vendor.description}
            </p>
          )}
        </div>

        {/* ── Menu category tabs ──────────────────────────────── */}
        <div
          className="flex items-center gap-2 overflow-x-auto pb-2 mb-5 sticky top-[132px] sm:top-[112px] z-30 bg-[#faf7f4]/90 backdrop-blur-md py-2 -mx-1 px-1 rounded-2xl"
          role="tablist"
          aria-label="Menu categories"
        >
          {menuCategories.map((category) => (
            <button
              key={category}
              type="button"
              role="tab"
              aria-selected={activeCategory === category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap active:scale-95 ${
                activeCategory === category
                  ? 'bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] text-white shadow-md shadow-[#2b1206]/25'
                  : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100 hover:border-[#d9bda6]'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* ── Menu grouped by category ────────────────────────── */}
        <div className="space-y-8 pb-8">
          {groupedMenu.map(([category, dishes]) => (
            <section key={category} aria-label={category}>
              <h2 className="text-lg font-black text-gray-900 mb-3 flex items-center gap-2">
                {category}
                <span className="text-xs font-bold text-stone-400">{dishes.length} items</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dishes.map((dish) => (
                  <article
                    key={dish.id}
                    className="bg-white rounded-3xl p-4 border border-stone-200/80 shadow-sm hover:shadow-xl hover:border-[#ebd7c5] hover:-translate-y-1 transition-all duration-300 flex gap-4 items-start group/card"
                  >
                    <button
                      type="button"
                      onClick={() => setModalDish(dish)}
                      className="flex-1 min-w-0 text-left group"
                      aria-label={`View ${dish.name}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {dish.isAvailable ? (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-forest-100 text-forest-700">
                            Available
                          </span>
                        ) : (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">
                            Sold out
                          </span>
                        )}
                        {dish.popular && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#f5ebe1] text-[#3d1b0c] border border-[#ebd7c5]">
                            Popular
                          </span>
                        )}
                        {dish.isPreorder && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#faf6f2] text-[#542813] border border-[#ebd7c5]">
                            Pre-order
                          </span>
                        )}
                      </div>

                      <h3 className="font-extrabold text-base text-gray-900 group-hover:text-[#542813] transition-colors">
                        {dish.name}
                      </h3>
                      <p className="text-xs text-stone-500 line-clamp-2 mt-1 leading-relaxed">
                        {dish.description}
                      </p>

                      <div className="flex items-center gap-3 mt-2.5">
                        <span className="text-base font-black text-[#4e2410]">
                          {formatRwf(dish.price)}
                        </span>
                        <span className="text-[11px] text-stone-400 font-semibold flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#8a5332]" aria-hidden="true" />
                          {dish.prepTime}
                        </span>
                      </div>
                    </button>

                    <div className="flex flex-col items-end gap-3 flex-shrink-0">
                      <LazyImage
                        src={dish.image}
                        alt={dish.name}
                        aspect="aspect-square"
                        className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden"
                        imgClassName="group-hover/card:scale-108 transition-transform duration-500 ease-out"
                      />
                      <button
                        type="button"
                        onClick={() => handleWishlistToggle(dish)}
                        aria-label={isInWishlist(dish.id) ? `Remove ${dish.name} from wishlist` : `Save ${dish.name} to wishlist`}
                        aria-pressed={isInWishlist(dish.id)}
                        className="w-full inline-flex items-center justify-center gap-1 rounded-xl border border-rose-100 bg-white px-3 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-50"
                      >
                        <Heart className={`w-3.5 h-3.5 ${isInWishlist(dish.id) ? 'fill-rose-500' : ''}`} />
                        <span>{isInWishlist(dish.id) ? 'Saved' : 'Save'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickAdd(dish)}
                        disabled={!dish.isAvailable}
                        aria-label={`Add ${dish.name} to cart`}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl bg-[#faf6f2] hover:bg-[#2b1206] hover:text-white text-[#3d1b0c] border border-[#ebd7c5] hover:border-[#2b1206] font-bold text-xs transition-all active:scale-95 disabled:opacity-40 disabled:hover:bg-[#faf6f2] disabled:hover:text-[#3d1b0c]"
                      >
                        <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{dish.options?.length ? 'Select' : 'Add'}</span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}

          {groupedMenu.length === 0 && (
            <EmptyState
              icon={<UtensilsCrossed className="w-8 h-8 text-[#542813]" />}
              title={`No ${activeCategory} dishes right now`}
              message="Check back soon — menus change daily."
              actionLabel="Show full menu"
              onAction={() => setActiveCategory('All')}
            />
          )}
        </div>
      </div>

      {/* ── Sticky cart CTA ───────────────────────────────────── */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200/80 px-4 py-3 shadow-2xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="min-w-0">
            {cartVendorItems.length > 0 ? (
              <>
                <p className="text-xs text-stone-500 font-semibold truncate">
                  {cartVendorItems.length} item{cartVendorItems.length > 1 ? 's' : ''} from{' '}
                  {vendor.name}
                </p>
                <p className="text-sm font-black text-[#4e2410]">{formatRwf(subtotal)}</p>
              </>
            ) : (
              <>
                <p className="text-xs text-stone-500 font-semibold">Hungry?</p>
                <p className="text-sm font-black text-gray-900">
                  Add dishes from the menu above
                </p>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            disabled={totalItemCount === 0}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] hover:from-[#3d1b0c] hover:via-[#5c2810] hover:to-[#2c1206] text-white font-bold text-sm shadow-xl shadow-[#2b1206]/25 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-40 disabled:shadow-none flex-shrink-0"
          >
            <ShoppingBag className="w-4 h-4 text-[#d9bda6]" aria-hidden="true" />
            <span>View Cart</span>
            {totalItemCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-white/25 text-xs flex items-center justify-center font-black">
                {totalItemCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Dish detail modal (options / customisation) ───────── */}
      {modalDish && (
        <FoodItemModal
          item={modalDish}
          vendor={{ ...vendor, location: vendor.neighborhood }}
          isOpen
          onClose={() => setModalDish(null)}
        />
      )}
    </div>
  );
}
