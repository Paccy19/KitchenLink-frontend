import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingBag, 
  ArrowRight, 
  Clock, 
  Calendar, 
  ChefHat, 
  AlertTriangle,
  Zap
} from 'lucide-react';
import { useCart } from '../../context/CartContext';

export default function CartDrawer() {
  const navigate = useNavigate();
  const {
    cartItems,
    activeVendor,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeFromCart,
    clearCart,
    subtotal,
    deliveryFee,
    grandTotal,
    totalItemCount,
    orderType,
    setOrderType,
    scheduledDate,
    setScheduledDate,
    scheduledTime,
    setScheduledTime,
    vendorConflict,
    resolveConflictReplace,
    resolveConflictCancel
  } = useCart();

  if (!isCartOpen) return null;

  const handleCheckoutClick = () => {
    setIsCartOpen(false);
    navigate('/checkout');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end">
      
      {/* Slide-out Drawer */}
      <div className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        
        {/* Drawer Header */}
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#faf6f2] text-[#542813] border border-[#ebd7c5] flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-[#6d391d]" />
            </div>
            <div>
              <h3 className="font-extrabold text-gray-900 text-base">Your Basket</h3>
              <p className="text-xs text-stone-500 font-medium">
                {totalItemCount} {totalItemCount === 1 ? 'dish' : 'dishes'} selected
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {cartItems.length > 0 && (
              <button
                onClick={clearCart}
                className="p-2 text-stone-400 hover:text-red-500 transition"
                title="Clear basket"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-2 text-stone-400 hover:text-stone-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Vendor Banner if cart has items */}
        {activeVendor && cartItems.length > 0 && (
          <div className="px-5 py-3 bg-[#faf6f2] border-b border-[#ebd7c5] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ChefHat className="w-4 h-4 text-[#6d391d]" />
              <div>
                <span className="text-xs font-bold text-gray-900">{activeVendor.name}</span>
                <span className="text-[10px] ml-1.5 px-1.5 py-0.5 rounded bg-[#f5ebe1] text-[#3d1b0c] font-semibold border border-[#ebd7c5]">
                  {activeVendor.type}
                </span>
              </div>
            </div>
            <span className="text-xs text-stone-500 font-medium">{activeVendor.location}</span>
          </div>
        )}

        {/* Cart Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-20 h-20 rounded-full bg-[#faf6f2] border border-[#ebd7c5] flex items-center justify-center text-[#6d391d]">
                <ShoppingBag className="w-10 h-10" />
              </div>
              <div>
                <h4 className="font-extrabold text-gray-900 text-lg">Your basket is empty</h4>
                <p className="text-xs text-stone-500 max-w-xs mt-1">
                  Discover delicious dishes prepared by Kigali's home cooks, bakers, and restaurants.
                </p>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] text-white font-bold text-xs shadow-md shadow-[#2b1206]/20 hover:from-[#3d1b0c] hover:to-[#2c1206] transition-all active:scale-95"
              >
                Explore Kitchens
              </button>
            </div>
          ) : (
            <>
              {/* Order Timing Toggle */}
              <div className="p-3.5 bg-stone-50/80 rounded-2xl border border-stone-200/80 space-y-3">
                <div className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#8a5332]" />
                  <span>Delivery Timing</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOrderType('immediate')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                      orderType === 'immediate'
                        ? 'bg-gradient-to-r from-[#2b1206] to-[#4e2410] text-white border-[#2b1206] shadow-sm'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Order for Now</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOrderType('scheduled')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                      orderType === 'scheduled'
                        ? 'bg-gradient-to-r from-[#2b1206] to-[#4e2410] text-white border-[#2b1206] shadow-sm'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Schedule / Pre-Order</span>
                  </button>
                </div>

                {orderType === 'scheduled' && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="text-[10px] font-bold text-stone-500 uppercase">Day</label>
                      <select
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="w-full text-xs font-bold p-2 rounded-xl bg-white border border-stone-200 outline-none focus:border-[#542813]"
                      >
                        <option value="Today">Today</option>
                        <option value="Tomorrow">Tomorrow</option>
                        <option value="Friday">Friday</option>
                        <option value="Saturday">Saturday</option>
                        <option value="Sunday">Sunday</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-stone-500 uppercase">Time</label>
                      <select
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="w-full text-xs font-bold p-2 rounded-xl bg-white border border-stone-200 outline-none focus:border-[#542813]"
                      >
                        <option value="11:30 AM">11:30 AM</option>
                        <option value="12:30 PM">12:30 PM</option>
                        <option value="01:30 PM">01:30 PM</option>
                        <option value="06:30 PM">06:30 PM</option>
                        <option value="07:30 PM">07:30 PM</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-3">
                {cartItems.map((item) => (
                  <div
                    key={item.itemKey}
                    className="p-3.5 bg-white rounded-2xl border border-stone-200/80 shadow-sm flex gap-3 items-start"
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-gray-900 truncate">
                        {item.name}
                      </h4>

                      {/* Display custom choices */}
                      {item.selectedOptions && Object.entries(item.selectedOptions).length > 0 && (
                        <div className="text-[11px] text-stone-500 mt-0.5 line-clamp-1">
                          {Object.entries(item.selectedOptions)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(' · ')}
                        </div>
                      )}

                      {/* Special instructions */}
                      {item.specialInstructions && (
                        <div className="text-[11px] text-[#6d391d] italic mt-0.5 truncate">
                          "{item.specialInstructions}"
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-2">
                        <span className="font-extrabold text-xs text-[#4e2410]">
                          {(item.price * item.quantity).toLocaleString()} RWF
                        </span>

                        {/* Quantity Counter */}
                        <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-xl p-0.5">
                          <button
                            onClick={() => updateQuantity(item.itemKey, item.quantity - 1)}
                            className="w-6 h-6 rounded-lg flex items-center justify-center text-stone-500 hover:bg-stone-200 transition"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-5 text-center text-xs font-bold text-stone-800">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.itemKey, item.quantity + 1)}
                            className="w-6 h-6 rounded-lg flex items-center justify-center text-stone-500 hover:bg-stone-200 transition"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Drawer Footer with Calculation & Checkout button */}
        {cartItems.length > 0 && (
          <div className="p-5 bg-stone-50 border-t border-stone-200 space-y-3">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Items Subtotal</span>
                <span className="font-bold">{subtotal.toLocaleString()} RWF</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Delivery fee (free over 15,000 RWF)</span>
                <span className="font-bold">{deliveryFee.toLocaleString()} RWF</span>
              </div>
              <div className="flex justify-between text-base font-black text-gray-900 pt-2 border-t border-gray-200">
                <span>Total Amount</span>
                <span className="text-[#4e2410]">{grandTotal.toLocaleString()} RWF</span>
              </div>
            </div>

            <button
              onClick={handleCheckoutClick}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] hover:from-[#3d1b0c] hover:via-[#5c2810] hover:to-[#2c1206] text-white font-extrabold text-sm shadow-xl shadow-[#2b1206]/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-95"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

      </div>

      {/* Multi-Vendor Conflict Alert Modal */}
      {vendorConflict && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-[#faf6f2] text-[#542813] border border-[#ebd7c5] mx-auto flex items-center justify-center">
              <AlertTriangle className="w-8 h-8" />
            </div>
            
            <h4 className="font-black text-gray-900 text-lg">
              Start a new basket?
            </h4>
            
            <p className="text-xs text-stone-600 leading-relaxed">
              Your basket already contains items from{' '}
              <span className="font-bold text-gray-900">{vendorConflict.currentVendor?.name}</span>.
              Do you want to clear your current basket and start fresh with items from{' '}
              <span className="font-bold text-[#542813]">{vendorConflict.incomingVendor?.name}</span>?
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={resolveConflictCancel}
                className="py-2.5 px-4 rounded-xl border border-stone-300 font-bold text-xs text-stone-700 hover:bg-stone-50 transition"
              >
                Keep Current
              </button>

              <button
                onClick={resolveConflictReplace}
                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#2b1206] to-[#4e2410] hover:from-[#3d1b0c] hover:to-[#6d391d] font-bold text-xs text-white shadow-md transition"
              >
                Start New Basket
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
