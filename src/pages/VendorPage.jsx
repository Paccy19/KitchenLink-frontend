import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bike,
  Clock,
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

  const handleQuickAdd = (dish) => {
    if (!vendor) return;
    if (dish.options?.length) {
      setModalDish(dish);
      return;
    }
    addToCart({ ...dish }, { ...vendor, location: vendor.neighborhood }, {}, 1);
    toast.success(`${dish.name} added to cart`);
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
      <div className="max-w-3xl mx-auto px-4 py-16">
        {notFound ? (
          <EmptyState
            icon={<UtensilsCrossed className="w-8 h-8" />}
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
    <div className="min-h-screen bg-gray-50/60 pb-28">
      {/* ── Header banner ─────────────────────────────────────── */}
      <div className="relative h-56 sm:h-80 w-full bg-stone-900">
        <img
          src={vendor.bannerUrl}
          alt={`${vendor.name} storefront`}
          className="w-full h-full object-cover opacity-90"
          loading="eager"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/25" />

        <div className="absolute top-5 left-4 sm:left-8 z-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/90 hover:bg-white text-gray-900 font-bold text-xs shadow-md backdrop-blur-md transition"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Back to Kitchens</span>
            <span className="sm:hidden">Back</span>
          </Link>
        </div>

        <div className="absolute bottom-5 left-4 right-4 sm:left-8 sm:right-8 text-white">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="px-3 py-1 rounded-full text-xs font-black bg-orange-600 shadow-md">
              {vendor.type}
            </span>
            {vendor.isOpen && (
              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-forest-600">
                Open now
              </span>
            )}
            {vendor.deliveryAvailable && (
              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-white/95 text-forest-700 flex items-center gap-1">
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
        <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-xl border border-gray-100 mb-7">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
            <div className="flex items-center gap-1.5 text-sm font-extrabold text-gray-900">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" aria-hidden="true" />
              {vendor.rating}
              {vendor.reviewsCount > 0 && (
                <span className="text-xs text-gray-400 font-medium">({vendor.reviewsCount} reviews)</span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-sm font-bold text-gray-700">
              <Clock className="w-4 h-4 text-orange-500" aria-hidden="true" />
              {vendor.prepTime}
              <span className="text-xs text-gray-400 font-medium">prep</span>
            </div>

            <div className="flex items-center gap-1.5 text-sm font-bold text-gray-700">
              <MapPin className="w-4 h-4 text-orange-500" aria-hidden="true" />
              {vendor.neighborhood}
            </div>

            {vendor.deliveryFee > 0 && (
              <div className="flex items-center gap-1.5 text-sm font-bold text-gray-700">
                <Bike className="w-4 h-4 text-orange-500" aria-hidden="true" />
                {formatRwf(vendor.deliveryFee)} delivery
              </div>
            )}

            {vendor.operatingHours && (
              <div className="flex items-center gap-1.5 text-sm font-bold text-gray-700">
                <Info className="w-4 h-4 text-gray-400" aria-hidden="true" />
                {vendor.operatingHours}
              </div>
            )}
          </div>

          {vendor.description && (
            <p className="text-sm text-gray-600 leading-relaxed mt-4 pt-4 border-t border-gray-100 max-w-3xl">
              {vendor.description}
            </p>
          )}
        </div>

        {/* ── Menu category tabs ──────────────────────────────── */}
        <div
          className="flex items-center gap-2 overflow-x-auto pb-2 mb-5 sticky top-[132px] sm:top-[112px] z-30 bg-gray-50/90 backdrop-blur-md py-2 -mx-1 px-1 rounded-2xl"
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
              className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition whitespace-nowrap ${
                activeCategory === category
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-500/20'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
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
                <span className="text-xs font-bold text-gray-400">{dishes.length} items</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dishes.map((dish) => (
                  <article
                    key={dish.id}
                    className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition flex gap-4 items-start"
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
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                            Sold out
                          </span>
                        )}
                        {dish.popular && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                            Popular
                          </span>
                        )}
                        {dish.isPreorder && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                            Pre-order
                          </span>
                        )}
                      </div>

                      <h3 className="font-extrabold text-base text-gray-900 group-hover:text-orange-600 transition-colors">
                        {dish.name}
                      </h3>
                      <p className="text-xs text-gray-500 line-clamp-2 mt-1 leading-relaxed">
                        {dish.description}
                      </p>

                      <div className="flex items-center gap-3 mt-2.5">
                        <span className="text-base font-black text-orange-600">
                          {formatRwf(dish.price)}
                        </span>
                        <span className="text-[11px] text-gray-400 font-semibold flex items-center gap-1">
                          <Clock className="w-3 h-3" aria-hidden="true" />
                          {dish.prepTime}
                        </span>
                      </div>
                    </button>

                    <div className="flex flex-col items-end gap-3 flex-shrink-0">
                      <LazyImage
                        src={dish.image}
                        alt={dish.name}
                        aspect="aspect-square"
                        className="w-24 h-24 sm:w-28 sm:h-28"
                        imgClassName="group-hover:scale-105"
                      />
                      <button
                        type="button"
                        onClick={() => handleQuickAdd(dish)}
                        disabled={!dish.isAvailable}
                        aria-label={`Add ${dish.name} to cart`}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl bg-orange-50 hover:bg-orange-600 hover:text-white text-orange-600 font-bold text-xs transition disabled:opacity-40 disabled:hover:bg-orange-50 disabled:hover:text-orange-600"
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
              icon={<UtensilsCrossed className="w-8 h-8" />}
              title={`No ${activeCategory} dishes right now`}
              message="Check back soon — menus change daily."
              actionLabel="Show full menu"
              onAction={() => setActiveCategory('All')}
            />
          )}
        </div>
      </div>

      {/* ── Sticky cart CTA ───────────────────────────────────── */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-100 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="min-w-0">
            {cartVendorItems.length > 0 ? (
              <>
                <p className="text-xs text-gray-500 font-semibold truncate">
                  {cartVendorItems.length} item{cartVendorItems.length > 1 ? 's' : ''} from{' '}
                  {vendor.name}
                </p>
                <p className="text-sm font-black text-gray-900">{formatRwf(subtotal)}</p>
              </>
            ) : (
              <>
                <p className="text-xs text-gray-500 font-semibold">Hungry?</p>
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
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold text-sm shadow-lg shadow-orange-500/25 transition disabled:opacity-40 disabled:shadow-none flex-shrink-0"
          >
            <ShoppingBag className="w-4 h-4" aria-hidden="true" />
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
