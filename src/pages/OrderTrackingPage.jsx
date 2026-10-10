import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Phone, 
  Bike, 
  Star, 
  ChefHat, 
  RefreshCw,
  Check,
  ClipboardList,
  PackageCheck,
  ShoppingBag,
  ShieldCheck
} from 'lucide-react';
import { useOrders, ORDER_STATUSES } from '../context/OrderContext';

function StepIcon({ iconKey, className = "w-4 h-4" }) {
  switch (iconKey) {
    case 'clipboard': return <ClipboardList className={className} />;
    case 'check-circle': return <CheckCircle2 className={className} />;
    case 'chef-hat': return <ChefHat className={className} />;
    case 'shopping-bag': return <ShoppingBag className={className} />;
    case 'bike': return <Bike className={className} />;
    case 'package': return <PackageCheck className={className} />;
    default: return <Check className={className} />;
  }
}

export default function OrderTrackingPage() {
  const { orderId } = useParams();
  const { 
    orders, 
    activeTrackingOrderId, 
    cancelOrder,
    apiEnabled,
    apiError,
    refreshOrder,
  } = useOrders();

  const targetOrderId = orderId || activeTrackingOrderId;
  const order = targetOrderId
    ? orders.find((existingOrder) => existingOrder.id === targetOrderId)
    : orders[0];

  useEffect(() => {
    if (apiEnabled && orderId && !order) refreshOrder(orderId);
  }, [apiEnabled, orderId, order?.id]);

  if (!order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-xl font-black text-gray-900">
          {apiError ? 'Unable to load this order' : 'No active order found'}
        </h2>
        {apiError && <p role="alert" className="text-sm text-red-700">{apiError}</p>}
        <Link to="/" className="px-5 py-2.5 bg-gradient-to-r from-[#2b1206] to-[#542813] text-white rounded-xl font-bold text-xs shadow-md">
          Return to Marketplace
        </Link>
      </div>
    );
  }

  const currentStatusIndex = ORDER_STATUSES.findIndex((s) => s.id === order.status);
  const isDeliveredOrDone = order.status === 'delivered';
  const isCancelled = order.status === 'cancelled';
  const canCancel = ['placed', 'confirmed', 'preparing', 'ready'].includes(order.status);
  const progressStatuses = ORDER_STATUSES.filter((status) => status.id !== 'cancelled');

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      
      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-stone-600 hover:text-[#542813] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-500 font-medium">Order ID:</span>
          <span className="font-extrabold text-xs text-stone-900 bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-200">
            {order.id}
          </span>
        </div>
      </div>

      {apiError && (
        <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {apiError}
        </div>
      )}

      {apiEnabled && canCancel && (
        <button
          type="button"
          onClick={() => cancelOrder(order.id, 'Cancelled by customer')}
          className="mb-6 px-4 py-2 rounded-xl border border-red-200 bg-white text-red-700 hover:bg-red-50 font-bold text-xs transition"
        >
          Cancel order
        </button>
      )}

      {/* Main Status Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-md mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-100">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-[#542813]">
              {isDeliveredOrDone ? 'Order complete' : isCancelled ? 'Order cancelled' : 'Order status'}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight mt-1">
              {ORDER_STATUSES[currentStatusIndex]?.label || order.status.replaceAll('_', ' ')}
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 mt-1 font-medium">
              {ORDER_STATUSES[currentStatusIndex]?.description}
            </p>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-[10px] uppercase font-bold text-stone-400 block">
              Estimated Delivery
            </span>
            <div className="text-lg font-black text-[#4e2410] flex items-center sm:justify-end gap-1.5">
              <Clock className="w-4 h-4 text-[#8a5332]" />
              <span>{order.estimatedDeliveryTime || 'Not available'}</span>
            </div>
            <span className="text-xs text-stone-500 font-medium">
              {order.vendorName} ({order.vendorLocation})
            </span>
          </div>
        </div>

        {/* Step-by-Step Progress Tracker */}
        {isCancelled ? (
          <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
            This order was cancelled. {order.cancelReason || ''}
          </div>
        ) : (
        <div className="pt-8 pb-4">
          <div className="relative">
            {/* Progress line */}
            <div className="hidden sm:block absolute top-1/2 left-4 right-4 h-1 bg-stone-200 -translate-y-1/2 z-0" />
            <div
              className="hidden sm:block absolute top-1/2 left-4 h-1 bg-gradient-to-r from-[#2b1206] to-[#6d391d] -translate-y-1/2 z-0 transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.max(0, (currentStatusIndex / (progressStatuses.length - 1)) * 100))}%`
              }}
            />

            {/* Stepper nodes */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 relative z-10">
              {progressStatuses.map((step, idx) => {
                const isPassed = idx <= currentStatusIndex;
                const isCurrent = idx === currentStatusIndex;

                return (
                  <div key={step.id} className="flex flex-col items-center text-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 shadow-sm ${
                        isCurrent
                          ? 'bg-gradient-to-br from-[#2b1206] to-[#542813] text-white ring-4 ring-[#ebd7c5] scale-110 shadow-lg shadow-[#2b1206]/35'
                          : isPassed
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white border-2 border-stone-200 text-stone-400'
                      }`}
                    >
                      {isPassed && !isCurrent ? (
                        <Check className="w-5 h-5 stroke-[2.5]" />
                      ) : (
                        <StepIcon iconKey={step.icon} className="w-4 h-4" />
                      )}
                    </div>
                    <span
                      className={`text-[11px] font-bold mt-2 max-w-[90px] leading-tight ${
                        isCurrent
                          ? 'text-[#542813] font-black'
                          : isPassed
                          ? 'text-gray-900'
                          : 'text-stone-400'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        )}

      </div>

      {/* Delivery confirmation code */}
      {order.deliveryCode && !order.deliveryConfirmed && (
        <div className="mb-8 rounded-3xl border-2 border-dashed border-[#6d391d]/40 bg-gradient-to-br from-[#fff7ee] to-[#faf6f2] p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#2b1206] via-[#8a5332] to-[#2b1206]" />
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-[#6d391d]">
            <ShieldCheck className="w-3.5 h-3.5" />
            Delivery confirmation code
          </div>
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="font-mono text-5xl sm:text-6xl tracking-[0.25em] font-black text-[#2b1206] bg-white/80 border border-[#ebd7c5] rounded-2xl px-5 py-3 shadow-sm select-all">
                {order.deliveryCode}
              </div>
              <p className="text-xs sm:text-sm text-stone-600 font-medium max-w-[220px] leading-relaxed">
                Give this to the rider when your food arrives to confirm the delivery.
              </p>
            </div>
            <span className="text-[11px] font-bold text-stone-400 self-start sm:self-center">
              Sent to your phone and stored here in your account
            </span>
          </div>
        </div>
      )}
      {order.deliveryConfirmed && (
        <div className="mb-8 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <p className="text-sm font-semibold text-emerald-800">
            Delivery confirmed. Enjoy your meal!
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Driver Information & Live Map Simulation */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Driver Card */}
          {order.driver && ['out_for_delivery', 'delivered'].includes(order.status) && (
            <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Assigned Delivery Partner
              </span>

              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-[#faf6f2] text-[#542813] border border-[#ebd7c5] flex items-center justify-center font-black text-base shadow-sm">
                    <Bike className="w-6 h-6 text-[#6d391d]" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-gray-900 text-sm sm:text-base">
                      {order.driver.name}
                    </h3>
                    <p className="text-xs text-stone-500 font-medium">
                      {order.driver.vehicle || 'Delivery partner'}
                    </p>
                    {order.driver.rating && <div className="flex items-center gap-1 text-[11px] text-amber-600 font-bold mt-0.5">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{order.driver.rating} rating</span>
                    </div>}
                  </div>
                </div>

                <a
                  href={`tel:${order.driver.phone}`}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#faf6f2] hover:bg-[#f5ebe1] text-[#3d1b0c] border border-[#ebd7c5] font-bold text-xs transition"
                >
                  <Phone className="w-3.5 h-3.5 text-[#6d391d]" />
                  <span>Call Rider</span>
                </a>
              </div>
            </div>
          )}

          {/* Delivery destination */}
          <div className="bg-gradient-to-br from-stone-50 to-[#faf6f2] rounded-3xl p-6 border border-stone-200/80 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase text-stone-500 flex items-center gap-1">
                <MapPin className="w-4 h-4 text-[#8a5332]" />
                <span>Delivery destination</span>
              </span>
            </div>

            <div className="bg-white/85 backdrop-blur-md rounded-2xl p-4 border border-stone-100 shadow-sm space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-600 mt-1 flex-shrink-0 ring-4 ring-emerald-200" />
                <div className="text-xs">
                  <span className="font-bold text-gray-900">Drop-off address:</span>
                  <p className="text-stone-600">{order.deliveryAddress?.street || order.deliveryAddress?.address || 'Address unavailable'}</p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Order Items Summary */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-sm space-y-4">
            <h3 className="font-black text-base text-gray-900 border-b border-stone-100 pb-3">
              Order Receipt
            </h3>

            <div className="space-y-3">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs">
                  <div>
                    <span className="font-bold text-gray-900">{item.quantity}x {item.name}</span>
                    {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                      <p className="text-[10px] text-stone-400">
                        {Object.values(item.selectedOptions).join(', ')}
                      </p>
                    )}
                  </div>
                  <span className="font-bold text-stone-800">
                    {(item.price * item.quantity).toLocaleString()} RWF
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-stone-100 space-y-1.5 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal</span>
                <span>{order.pricing.subtotal.toLocaleString()} RWF</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Delivery Fee</span>
                <span>{order.pricing.deliveryFee.toLocaleString()} RWF</span>
              </div>
              <div className="flex justify-between text-sm font-black text-gray-900 pt-2 border-t border-stone-200">
                <span>Total Paid</span>
                <span className="text-[#4e2410]">{order.pricing.total.toLocaleString()} RWF</span>
              </div>
            </div>

            <div className="p-3 bg-stone-50 rounded-xl text-[11px] text-stone-500 font-medium border border-stone-100">
              Payment via <span className="font-bold text-gray-700">{order.payment.method}</span> · Status:{' '}
              <span className={`font-bold ${order.payment.status === 'paid' ? 'text-emerald-600' : order.payment.status === 'refunded' ? 'text-blue-600' : 'text-amber-600'}`}>
                {order.payment.status}
              </span>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
