import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { deliveryFeeLabel, deliveryFeeValue } from '../../context/CartContext';

/** Checkout right column: the kitchen, dishes, price breakdown and Place Order button. */
export default function OrderSummary({
  activeVendor,
  cartItems,
  subtotal,
  deliveryFee,
  deliveryQuote,
  grandTotal,
  isPickup,
  error,
  onPlaceOrder,
  isSubmitting,
  disabled,
}) {
  return (
    <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xl sticky top-[calc(var(--app-header-h,112px)+1rem)] space-y-6">

      <div className="border-b border-stone-100 pb-4">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#542813]">
          Order Review
        </span>
        <h3 className="font-black text-lg text-gray-900 mt-0.5">
          From: {activeVendor?.name}
        </h3>
        <p className="text-xs text-stone-500">
          {activeVendor?.type} · {activeVendor?.location}
        </p>
      </div>

      {/* Items in order */}
      <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
        {cartItems.map((item) => (
          <div key={item.itemKey} className="flex items-center justify-between text-xs">
            <div className="flex-1 min-w-0 pr-2">
              <div className="font-bold text-gray-900 truncate">
                {item.quantity}x {item.name}
              </div>
              {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                <div className="text-[10px] text-stone-400 truncate">
                  {Object.values(item.selectedOptions).join(', ')}
                </div>
              )}
            </div>
            <div className="font-extrabold text-stone-800 flex-shrink-0">
              {(item.price * item.quantity).toLocaleString()} RWF
            </div>
          </div>
        ))}
      </div>

      {/* Price Breakdown */}
      <div className="space-y-2 pt-4 border-t border-stone-100 text-xs">
        <div className="flex justify-between text-stone-600">
          <span>Items Subtotal</span>
          <span className="font-bold">{subtotal.toLocaleString()} RWF</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>{deliveryFeeLabel(deliveryQuote)}</span>
          <span className="font-bold">{deliveryFeeValue(deliveryFee, deliveryQuote)}</span>
        </div>
        <p className="text-[10px] leading-relaxed text-stone-400 font-medium">
          {isPickup
            ? "You collect your order at the kitchen, so there's no delivery fee."
            : deliveryQuote.unavailableReason
              ? deliveryQuote.unavailableReason
              : deliveryQuote.kitchenDelivers
                ? "You're beyond the delivery workers' range, so the kitchen brings your order itself and charges its own travel fee. Far orders are scheduled ahead. At handover, give the kitchen the code we send you."
                : 'The delivery fee depends on the distance from the kitchen to you, is charged separately from your food, and goes in full to your delivery worker.'}
        </p>
        <div className="flex justify-between text-base font-black text-gray-900 pt-3 border-t border-gray-200">
          <span>Total Due</span>
          <span className="text-[#4e2410]">{grandTotal.toLocaleString()} RWF</span>
        </div>
      </div>

      {/* Submit Button */}
      {error && (
        <div role="alert" className="mb-3 rounded-xl border border-red-100 bg-red-50 p-3 text-xs font-semibold text-red-700">
          {error}
        </div>
      )}
      <button
        onClick={onPlaceOrder}
        disabled={disabled}
        className={`w-full py-4 rounded-2xl bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] hover:from-[#3d1b0c] hover:via-[#5c2810] hover:to-[#2c1206] text-white font-black text-sm shadow-xl shadow-[#2b1206]/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-95 ${
          isSubmitting ? 'opacity-75 cursor-wait' : ''
        }`}
      >
        {isSubmitting ? (
          <span>Placing your order...</span>
        ) : (
          <>
            <CheckCircle2 className="w-5 h-5" />
            <span>Place Order · {grandTotal.toLocaleString()} RWF</span>
          </>
        )}
      </button>

    </div>
  );
}
