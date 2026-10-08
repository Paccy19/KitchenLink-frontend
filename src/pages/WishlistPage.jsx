import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, ShoppingBag, Trash2 } from 'lucide-react';
import EmptyState from '../components/common/EmptyState';
import LazyImage from '../components/common/LazyImage';
import { useCart } from '../context/CartContext';
import { useToast } from '../components/common/Toast';
import { useWishlist } from '../context/WishlistContext';
import { formatRwf } from '../api/normalize';

export default function WishlistPage() {
  const navigate = useNavigate();
  const { items, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();
  const toast = useToast();

  const handleAddToCart = ({ dish, vendor }) => {
    if (dish.options?.length) {
      navigate(`/vendor/${vendor.id}?dish=${encodeURIComponent(dish.id)}`);
      return;
    }
    addToCart(dish, vendor, {}, 1);
    toast.success(`${dish.name} added to your cart`);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-orange-600 transition mb-5"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to marketplace
      </Link>

      <div className="flex items-end justify-between gap-4 mb-7">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-600">Saved for later</p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 mt-1">
            Your wishlist
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {items.length} {items.length === 1 ? 'dish' : 'dishes'} saved on this device
          </p>
        </div>
        <Heart className="hidden sm:block w-10 h-10 text-rose-500 fill-rose-100" aria-hidden="true" />
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<Heart className="w-8 h-8" />}
          title="Your wishlist is empty"
          message="Save dishes from a kitchen menu and they will be waiting for you here."
          actionLabel="Explore kitchens"
          onAction={() => navigate('/vendors')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map(({ dish, vendor }) => (
            <article
              key={dish.id}
              className="flex gap-4 rounded-3xl border border-gray-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <Link to={`/vendor/${vendor.id}`} className="flex-shrink-0">
                <LazyImage
                  src={dish.image}
                  alt={dish.name}
                  aspect="aspect-square"
                  className="w-24 h-24 sm:w-28 sm:h-28"
                />
              </Link>
              <div className="min-w-0 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      to={`/vendor/${vendor.id}`}
                      className="font-extrabold text-sm text-gray-900 hover:text-orange-600 line-clamp-2"
                    >
                      {dish.name}
                    </Link>
                    <p className="text-xs text-gray-500 mt-1 truncate">{vendor.name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromWishlist(dish.id)}
                    aria-label={`Remove ${dish.name} from wishlist`}
                    className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-auto pt-3 flex items-center justify-between gap-2">
                  <span className="font-black text-orange-600">{formatRwf(dish.price)}</span>
                  <button
                    type="button"
                    onClick={() => handleAddToCart({ dish, vendor })}
                    disabled={!dish.isAvailable}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700 transition hover:bg-orange-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    Add to cart
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
