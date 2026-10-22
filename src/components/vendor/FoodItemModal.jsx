import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { X, Plus, Minus, ShoppingBag, Clock, Sparkles, Heart, Store, ChevronRight } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useToast } from '../common/Toast';
import { formatRwf } from '../../api/normalize';

/**
 * Dish details: photo, price, options, notes, quantity and "Add to cart".
 * A bottom sheet on phones and a centred card on larger screens, rendered
 * above everything (including the site header). Escape, the close button or
 * tapping outside closes it; the page behind doesn't scroll meanwhile.
 *
 * Opening a dish never leaves the current page. `showKitchenLink` adds an
 * optional link to the kitchen's full menu (off on the kitchen page itself).
 */
export default function FoodItemModal({ item, vendor, isOpen, onClose, showKitchenLink = false }) {
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const toast = useToast();
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [instructions, setInstructions] = useState('');
  const [adding, setAdding] = useState(false);
  const dialogRef = useRef(null);
  // Callers pass a new onClose each render; the effect below only needs the latest.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!item || !isOpen) return;
    const defaults = {};
    if (item.options) {
      item.options.forEach((opt) => {
        defaults[opt.name] = opt.choices[0];
      });
    }
    setQuantity(1);
    setSelectedOptions(defaults);
    setInstructions('');
  }, [item, isOpen]);

  // Lock the page behind, close on Escape, and move focus into the dialog.
  useEffect(() => {
    if (!isOpen) return undefined;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    const previous = document.activeElement;
    dialogRef.current?.focus();
    const onKey = (event) => event.key === 'Escape' && onCloseRef.current();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen || !item) return null;

  const isSaved = isInWishlist(item.id);
  const hasPrepTime = item.prepTime && item.prepTime !== '—';

  const handleWishlistToggle = async () => {
    try {
      if (isSaved) {
        await removeFromWishlist(item.id);
        toast.info(`${item.name} removed from your wishlist`);
      } else {
        await addToWishlist(item, vendor);
        toast.success(`${item.name} saved for later`);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleOptionChange = (optionName, choice) => {
    setSelectedOptions((prev) => ({ ...prev, [optionName]: choice }));
  };

  const handleAddToCart = async () => {
    setAdding(true);
    try {
      const added = await addToCart(item, vendor, selectedOptions, quantity, instructions);
      if (added) onClose();
    } finally {
      setAdding(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 animate-fade-in"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={item.name}
        tabIndex={-1}
        className="relative bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl animate-scale-in border border-stone-100 flex flex-col max-h-[92dvh] sm:max-h-[calc(100dvh-2rem)] outline-none"
      >
        {/* Photo with name; close + save over it */}
        <div className="relative h-48 sm:h-60 w-full bg-stone-100 flex-shrink-0">
          {item.image && (
            <img
              src={item.image}
              alt={item.name}
              className="w-full h-full object-cover"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

          {/* Grab handle on phones (bottom sheet) */}
          <span className="sm:hidden absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1.5 rounded-full bg-white/80" aria-hidden="true" />

          <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
            <button
              type="button"
              onClick={handleWishlistToggle}
              aria-pressed={isSaved}
              aria-label={isSaved ? `Remove ${item.name} from wishlist` : `Save ${item.name} to wishlist`}
              className="w-10 h-10 rounded-full bg-white/95 text-rose-500 flex items-center justify-center shadow-md transition hover:scale-105 active:scale-95"
            >
              <Heart className={`w-5 h-5 ${isSaved ? 'fill-rose-500' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-10 h-10 rounded-full bg-white/95 text-stone-700 hover:text-black flex items-center justify-center shadow-md transition active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="absolute bottom-4 left-4 right-4 text-white">
            {item.category && (
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#2b1206] to-[#542813] text-white border border-white/20 inline-block mb-1.5 shadow-sm">
                {item.category}
              </span>
            )}
            <h3 className="text-xl sm:text-2xl font-black leading-snug drop-shadow-sm line-clamp-2 break-words">
              {item.name}
            </h3>
          </div>
        </div>

        {/* Scrollable details */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-5">
          <div className="flex items-start justify-between gap-3 pb-4 border-b border-stone-100">
            <div className="min-w-0">
              <div className="text-2xl font-black text-[#4e2410]">{formatRwf(item.price)}</div>
              <div className="text-xs text-stone-500 font-medium truncate">
                from {vendor.name}
                {vendor.type ? ` · ${vendor.type}` : ''}
              </div>
            </div>
            {hasPrepTime && (
              <div className="flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold text-stone-700 bg-stone-100 px-3 py-1.5 rounded-xl">
                <Clock className="w-3.5 h-3.5 text-[#8a5332]" />
                <span>{item.prepTime}</span>
              </div>
            )}
          </div>

          {item.description && (
            <p className="text-sm text-stone-600 leading-relaxed break-words">{item.description}</p>
          )}

          {item.isPreorder && (
            <div className="p-3.5 rounded-2xl bg-[#faf6f2] border border-[#ebd7c5] text-[#3d1b0c] text-xs font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#8a5332] flex-shrink-0" />
              <div>
                <span className="font-bold">Scheduled Pre-Order Special: </span>
                {item.preorderCutoff || 'Prepared specially for tomorrow'}
              </div>
            </div>
          )}

          {item.options && item.options.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">Customize your dish</h4>
              {item.options.map((option, idx) => (
                <fieldset key={idx} className="space-y-2">
                  <legend className="text-xs font-bold text-stone-800 mb-2">{option.name}</legend>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {option.choices.map((choice, cIdx) => {
                      const isSelected = selectedOptions[option.name] === choice;
                      return (
                        <button
                          key={cIdx}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => handleOptionChange(option.name, choice)}
                          className={`text-left text-sm px-3 py-2.5 rounded-xl border transition-all active:scale-95 ${
                            isSelected
                              ? 'border-[#542813] bg-[#faf6f2] font-bold text-[#3d1b0c] shadow-sm'
                              : 'border-stone-200 bg-stone-50/50 hover:bg-stone-100 text-stone-700'
                          }`}
                        >
                          {choice}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="dish-instructions" className="text-xs font-bold uppercase tracking-wider text-stone-400">
              Special instructions
            </label>
            <textarea
              id="dish-instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="E.g. Extra spicy Akabanga, sauce on the side, no onions…"
              rows={2}
              maxLength={300}
              className="w-full text-sm p-3 rounded-xl border border-stone-200 focus:border-[#542813] focus:ring-2 focus:ring-[#542813]/15 outline-none resize-none transition"
            />
          </div>

          {showKitchenLink && vendor?.id && (
            <Link
              to={`/vendor/${vendor.id}`}
              onClick={onClose}
              className="flex items-center gap-3 rounded-2xl border border-stone-200 px-4 py-3 hover:bg-stone-50 transition"
            >
              <Store className="w-5 h-5 text-[#8a5332] flex-shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-gray-900 truncate">See all dishes from {vendor.name}</span>
                <span className="block text-[11px] text-stone-500">Optional — you can add this dish right here</span>
              </span>
              <ChevronRight className="w-4 h-4 text-stone-400 flex-shrink-0" />
            </Link>
          )}
        </div>

        {/* Quantity + add, always visible */}
        <div
          className="flex-shrink-0 px-4 sm:px-6 pt-3 sm:pt-4 bg-stone-50 border-t border-stone-100 flex items-center gap-3"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <div className="flex items-center gap-1 bg-white border border-stone-200 rounded-2xl p-1 shadow-sm flex-shrink-0">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              aria-label="One less"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-stone-600 hover:bg-stone-100 transition disabled:opacity-40"
              disabled={quantity <= 1}
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-6 text-center text-sm font-black text-gray-900" aria-live="polite">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(99, q + 1))}
              aria-label="One more"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-stone-600 hover:bg-stone-100 transition disabled:opacity-40"
              disabled={quantity >= 99}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={adding || item.isAvailable === false}
            className="flex-1 min-w-0 h-12 px-4 rounded-2xl bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] hover:from-[#3d1b0c] hover:via-[#5c2810] hover:to-[#2c1206] text-white font-bold text-sm shadow-xl shadow-[#2b1206]/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-60 disabled:hover:scale-100"
          >
            <ShoppingBag className="w-4 h-4 text-[#d9bda6] flex-shrink-0" />
            <span className="truncate">
              {item.isAvailable === false ? 'Sold out' : `Add · ${formatRwf(item.price * quantity)}`}
            </span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
