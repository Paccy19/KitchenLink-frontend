import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bike,
  CalendarClock,
  Clock,
  Heart,
  Info,
  MapPin,
  Minus,
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
import { VendorAvatar } from '../components/home/VendorCard';
import DishHoverPreview from '../components/common/DishHoverPreview';
import { buildPreorderSpecial, formatScheduledFor } from '../utils/schedule';

/**
 * Vendor storefront: `GET /vendors/{vendor_id}`.
 * Header (banner, type, rating, prep time, delivery, neighbourhood),
 * category tabs, menu items with availability, sticky cart CTA.
 */
export default function VendorPage() {
  const { vendorId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const { addToCart, updateQuantity, setIsCartOpen, cartItems, subtotal, totalItemCount, orderType, setOrderType, preorderSpecial, setPreorderSpecial } = useCart();
  const navigate = useNavigate();
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

  const activeSpecial = vendor.special;
  const isPreorderForThisVendor =
    orderType === 'preorder' && preorderSpecial?.vendorId === vendor.id;

  const handlePreorderToggle = () => {
    if (isPreorderForThisVendor) {
      setOrderType('immediate');
      setPreorderSpecial(null);
      return;
    }
    if (!activeSpecial) return;
    setPreorderSpecial(buildPreorderSpecial(vendor, activeSpecial));
    setOrderType('preorder');
  };

  return (
    <div className="min-h-screen bg-[#faf7f4] pb-28 lg:pb-12 animate-fade-in">
      {/* ── Header banner ─────────────────────────────────────── */}
      <div className="relative h-60 sm:h-72 w-full bg-gradient-to-br from-[#2b1206] via-[#481f0d] to-[#1c0a03] overflow-hidden">
        {/* No banner (or a broken link): keep the chocolate background instead of a broken-image icon. */}
        {(vendor.bannerUrl || vendor.avatarUrl) && (
          <img
            src={vendor.bannerUrl || vendor.avatarUrl}
            alt={`${vendor.name} storefront`}
            className="w-full h-full object-cover object-center opacity-90"
            loading="eager"
            decoding="async"
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
        )}
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

        <div className="absolute bottom-12 sm:bottom-14 left-4 right-4 sm:left-8 sm:right-8 text-white">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="px-3 py-1 rounded-full text-xs font-black bg-[#2b1206] text-white border border-[#522712] shadow-md">
              {vendor.type}
            </span>
            {vendor.isOpen ? (
              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-forest-600 shadow-md">
                Open now
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-stone-700/90 shadow-md">
                Closed now · schedule for later
              </span>
            )}
            {vendor.deliveryAvailable && (
              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-white/95 text-forest-700 flex items-center gap-1 shadow-md">
                <Bike className="w-3.5 h-3.5" aria-hidden="true" />
                Delivery available
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <VendorAvatar
              vendor={vendor}
              className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl text-2xl ring-2 ring-white/40 shadow-lg"
            />
            <h1 className="min-w-0 text-2xl sm:text-4xl font-black tracking-tight leading-tight drop-shadow-sm line-clamp-2 break-words">
              {vendor.name}
            </h1>
          </div>
        </div>
      </div>

      {/* ── Info card ─────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
        <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-xl border border-stone-200/80 mb-7">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
            <div className="flex items-center gap-1.5 text-sm font-extrabold text-gray-900">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" aria-hidden="true" />
              {vendor.rating > 0 ? vendor.rating : <span className="text-stone-500 font-bold">New</span>}
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

        {/* ── Tomorrow's Special banner ───────────────────────── */}
        {activeSpecial && (
          <div className="mb-7 rounded-3xl border border-[#d9dcc0] bg-gradient-to-br from-[#f5f6e9] to-[#eef0dc] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <span className="inline-block px-2.5 py-1 rounded-full bg-[#c9cda2] text-[#2b3317] text-[11px] font-black mb-2">
                Tomorrow's Special
              </span>
              <p className="text-base font-extrabold text-[#2b3317] leading-snug">
                {activeSpecial.text}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs font-semibold text-stone-600">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#8a5332]" aria-hidden="true" />
                  Order before {formatScheduledFor(activeSpecial.cutoffAt)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarClock className="w-3.5 h-3.5 text-[#8a5332]" aria-hidden="true" />
                  Arrives {formatScheduledFor(activeSpecial.deliveryAt)}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handlePreorderToggle}
              disabled={!activeSpecial.isOrderable && !isPreorderForThisVendor}
              className={`flex-shrink-0 px-5 py-3 rounded-2xl font-bold text-sm shadow-md transition active:scale-95 disabled:opacity-50 ${
                isPreorderForThisVendor
                  ? 'bg-white text-[#3d1b0c] border border-[#c9cda2]'
                  : 'bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] text-white'
              }`}
            >
              {isPreorderForThisVendor ? 'Pre-order on · Cancel' : 'Pre-order this special'}
            </button>
          </div>
        )}

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8 lg:items-start">
        <div className="min-w-0">
        {/* ── Menu category tabs ──────────────────────────────── */}
        <div
          className="flex items-center gap-2 overflow-x-auto pb-2 mb-5 sticky top-[var(--app-header-h,132px)] z-30 bg-[#faf7f4]/90 backdrop-blur-md py-2 -mx-1 px-1 rounded-2xl"
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
              <h2 className="text-lg font-black text-gray-900 mb-3 flex items-baseline gap-2">
                {category}
                <span className="text-xs font-bold text-stone-400">
                  {dishes.length} {dishes.length === 1 ? 'item' : 'items'}
                </span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {dishes.map((dish) => (
                  <article
                    key={dish.id}
                    className="bg-white rounded-3xl p-3.5 sm:p-4 border border-stone-200/80 shadow-sm hover:shadow-lg hover:border-[#ebd7c5] transition-all duration-300 flex gap-3.5 group/card"
                  >
                    <DishHoverPreview dish={dish} className="flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => setModalDish(dish)}
                        className="w-full h-full text-left flex flex-col group"
                        aria-label={`View ${dish.name}`}
                      >
                        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
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

                        <h3 className="font-extrabold text-base leading-snug text-gray-900 group-hover:text-[#542813] transition-colors line-clamp-2 break-words">
                          {dish.name}
                        </h3>
                        {dish.description && (
                          <p className="text-xs text-stone-500 line-clamp-2 mt-1 leading-relaxed break-words">
                            {dish.description}
                          </p>
                        )}

                        <div className="mt-auto pt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="text-base font-black text-[#4e2410] whitespace-nowrap">
                            {formatRwf(dish.price)}
                          </span>
                          {dish.prepTime && dish.prepTime !== '—' && (
                            <span className="text-[11px] text-stone-400 font-semibold flex items-center gap-1 whitespace-nowrap">
                              <Clock className="w-3 h-3 text-[#8a5332]" aria-hidden="true" />
                              {dish.prepTime}
                            </span>
                          )}
                        </div>
                      </button>
                    </DishHoverPreview>

                    <div className="relative flex-shrink-0 self-start">
                      <LazyImage
                        src={dish.image}
                        alt={dish.name}
                        aspect="aspect-square"
                        className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden"
                        imgClassName="group-hover/card:scale-105 transition-transform duration-500 ease-out"
                      />
                      <button
                        type="button"
                        onClick={() => handleWishlistToggle(dish)}
                        aria-label={isInWishlist(dish.id) ? `Remove ${dish.name} from wishlist` : `Save ${dish.name} to wishlist`}
                        aria-pressed={isInWishlist(dish.id)}
                        className="absolute top-1.5 right-1.5 w-8 h-8 rounded-full bg-white/95 shadow-md flex items-center justify-center text-rose-500 transition hover:scale-110 active:scale-95"
                      >
                        <Heart className={`w-4 h-4 ${isInWishlist(dish.id) ? 'fill-rose-500' : ''}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickAdd(dish)}
                        disabled={!dish.isAvailable}
                        aria-label={`Add ${dish.name} to cart`}
                        className="absolute -bottom-2 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 pl-2.5 pr-3 h-9 rounded-full bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] text-white font-bold text-xs shadow-lg shadow-[#2b1206]/30 border-2 border-white transition-all hover:scale-105 active:scale-95 disabled:from-stone-400 disabled:via-stone-400 disabled:to-stone-400 disabled:hover:scale-100 whitespace-nowrap"
                      >
                        <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{!dish.isAvailable ? 'Sold out' : dish.options?.length ? 'Select' : 'Add'}</span>
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

        {/* ── Desktop: your order, always in view ─────────────── */}
        <aside className="hidden lg:block sticky top-[calc(var(--app-header-h,132px)+1rem)]" aria-label="Your order">
          <OrderPanel
            vendorName={vendor.name}
            items={cartVendorItems}
            otherKitchenItems={cartItems.length - cartVendorItems.length}
            updateQuantity={updateQuantity}
            onReview={() => setIsCartOpen(true)}
            onCheckout={() => navigate('/checkout')}
          />
        </aside>
        </div>
      </div>

      {/* ── Sticky cart CTA ───────────────────────────────────── */}
      <div
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200/80 px-4 pt-3 shadow-2xl"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
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

/** Desktop sidebar: what's in the basket from this kitchen, with quantity controls. */
function OrderPanel({ vendorName, items, otherKitchenItems, updateQuantity, onReview, onCheckout }) {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  return (
    <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-stone-100 flex items-center gap-2">
        <ShoppingBag className="w-5 h-5 text-[#8a5332]" aria-hidden="true" />
        <h2 className="font-black text-gray-900">Your order</h2>
        {count > 0 && <span className="ml-auto text-xs font-bold text-stone-400">{count} item{count === 1 ? '' : 's'}</span>}
      </div>

      {items.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <UtensilsCrossed className="w-8 h-8 text-[#d9bda6] mx-auto" aria-hidden="true" />
          <p className="mt-2 text-sm font-bold text-gray-900">Your basket is empty</p>
          <p className="text-xs text-stone-500 mt-0.5">Tap “Add” on a dish from {vendorName} to start your order.</p>
          {otherKitchenItems > 0 && (
            <p className="mt-3 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              Your basket has dishes from another kitchen. Adding from here will ask to replace them.
            </p>
          )}
        </div>
      ) : (
        <>
          <ul className="max-h-[45vh] overflow-y-auto divide-y divide-stone-100">
            {items.map((item) => (
              <li key={item.itemKey} className="px-5 py-3 flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-900 truncate">{item.name}</p>
                  {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                    <p className="text-[11px] text-stone-400 truncate">{Object.values(item.selectedOptions).join(', ')}</p>
                  )}
                  <p className="text-xs font-bold text-[#4e2410] mt-0.5">{formatRwf(item.price * item.quantity)}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.itemKey, item.quantity - 1)}
                    aria-label={`One less ${item.name}`}
                    className="w-7 h-7 rounded-full border border-stone-200 flex items-center justify-center text-stone-600 hover:bg-stone-100"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-5 text-center text-sm font-black text-gray-900">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.itemKey, item.quantity + 1)}
                    aria-label={`One more ${item.name}`}
                    className="w-7 h-7 rounded-full border border-stone-200 flex items-center justify-center text-stone-600 hover:bg-stone-100"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="px-5 py-4 border-t border-stone-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-stone-600">Subtotal</span>
              <span className="text-base font-black text-[#4e2410]">{formatRwf(total)}</span>
            </div>
            <p className="text-[11px] text-stone-400">Delivery fee (or free pickup) is chosen at checkout.</p>
            <button
              type="button"
              onClick={onCheckout}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] text-white font-black text-sm shadow-md transition hover:scale-[1.01] active:scale-95"
            >
              Go to checkout
            </button>
            <button type="button" onClick={onReview} className="w-full text-xs font-bold text-[#542813] hover:underline">
              Review basket
            </button>
          </div>
        </>
      )}
    </div>
  );
}
