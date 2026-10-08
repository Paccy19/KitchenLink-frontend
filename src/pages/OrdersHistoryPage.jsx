import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Clock, 
  RotateCcw, 
  MapPin, 
  Star, 
  ChevronRight, 
  ShoppingBag, 
  ChefHat 
} from 'lucide-react';
import { ORDER_STATUSES, useOrders } from '../context/OrderContext';
import { useCart } from '../context/CartContext';
import { VENDORS } from '../data/mockData';
import { useToast } from '../components/common/Toast';

export default function OrdersHistoryPage() {
  const navigate = useNavigate();
  const { orders, setActiveTrackingOrderId, apiError, refreshOrders } = useOrders();
  const { addToCart } = useCart();
  const toast = useToast();

  const handleReorder = async (order) => {
    const vendor = VENDORS.find((v) => v.id === order.vendorId) || {
      id: order.vendorId,
      name: order.vendorName,
      type: order.vendorType,
      location: order.vendorLocation,
      deliveryFee: order.pricing.deliveryFee
    };

    for (const item of order.items) {
      const added = await addToCart(
        { id: item.id || item.dishId, name: item.name, price: item.price, image: item.image || vendor.coverImage },
        vendor,
        item.selectedOptions || {},
        item.quantity || 1
      );
      if (!added) {
        toast.error('Could not add the complete order to your basket.');
        return;
      }
    }

    navigate('/checkout');
  };

  const handleTrackClick = (orderId) => {
    setActiveTrackingOrderId(orderId);
    navigate(`/track/${orderId}`);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      
      {/* Top Bar */}
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-stone-600 hover:text-[#542813] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Marketplace</span>
        </Link>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Order History & Receipts
          </h1>
          <p className="text-xs text-stone-500 font-medium">
            Review past meals, reorder favorites, and track live deliveries
          </p>
        </div>
      </div>

      {apiError && (
        <div role="alert" className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <span>{apiError}</span>
          <button type="button" onClick={refreshOrders} className="font-bold underline">
            Retry
          </button>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-stone-200/80 shadow-sm space-y-4 animate-scale-in">
          <div className="w-16 h-16 rounded-2xl bg-[#faf6f2] text-[#542813] border border-[#ebd7c5] mx-auto flex items-center justify-center shadow-sm">
            <ShoppingBag className="w-8 h-8 text-[#6d391d]" />
          </div>
          <h3 className="text-lg font-black text-gray-900">No orders yet</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Explore delicious home cooked meals and Kigali kitchens today!
          </p>
          <Link
            to="/"
            className="inline-block px-5 py-2.5 bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] text-white rounded-xl text-xs font-bold shadow-md shadow-[#2b1206]/20 hover:from-[#3d1b0c] transition active:scale-95"
          >
            Start Ordering
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => {
            const isLive = !['delivered', 'cancelled'].includes(order.status);

            return (
              <div
                key={order.id}
                className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-sm hover:shadow-md hover:border-[#ebd7c5] transition-all duration-300 space-y-4"
              >
                {/* Order Top Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-stone-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#faf6f2] text-[#542813] border border-[#ebd7c5] flex items-center justify-center font-black shadow-sm">
                      <ChefHat className="w-5 h-5 text-[#6d391d]" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-gray-900">
                        {order.vendorName}
                      </h3>
                      <p className="text-xs text-stone-400 font-medium">
                        {order.id} · {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-black px-3 py-1 rounded-full ${
                        isLive
                          ? 'bg-[#f5ebe1] text-[#3d1b0c] border border-[#ebd7c5] animate-pulse'
                          : order.status === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      ● {ORDER_STATUSES.find((status) => status.id === order.status)?.label ?? order.status}
                    </span>

                    {isLive && (
                      <button
                        onClick={() => handleTrackClick(order.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#2b1206] to-[#542813] hover:from-[#3d1b0c] text-white font-bold text-xs flex items-center gap-1 shadow-sm transition active:scale-95"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Track Live</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-2">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs text-stone-700">
                      <div>
                        <span className="font-bold text-gray-900">{item.quantity}x {item.name}</span>
                        {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                          <span className="text-[11px] text-stone-400 ml-2">
                            ({Object.values(item.selectedOptions).join(', ')})
                          </span>
                        )}
                      </div>
                      <span className="font-extrabold text-stone-800">
                        {(item.price * item.quantity).toLocaleString()} RWF
                      </span>
                    </div>
                  ))}
                </div>

                {/* Rating if exists */}
                {order.rated && (
                  <div className="p-3 bg-[#faf6f2] border border-[#ebd7c5] rounded-xl text-xs text-[#3d1b0c] flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>Your Review ({order.rating} / 5): "{order.review}"</span>
                  </div>
                )}

                {/* Bottom Row */}
                <div className="pt-4 border-t border-stone-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="text-stone-500 font-medium">
                    Total: <span className="font-black text-[#4e2410] text-sm">{order.pricing.total.toLocaleString()} RWF</span> via {order.payment.method}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTrackClick(order.id)}
                      className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs transition active:scale-95"
                    >
                      View Details & Tracking
                    </button>

                    <button
                      onClick={() => handleReorder(order)}
                      className="px-4 py-2 rounded-xl bg-[#faf6f2] hover:bg-[#f5ebe1] text-[#3d1b0c] border border-[#ebd7c5] font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reorder Dishes</span>
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
