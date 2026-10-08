import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Phone, 
  Bike, 
  AlertCircle, 
  Star, 
  MessageSquare, 
  ChefHat, 
  RefreshCw,
  FastForward,
  Check,
  ShieldCheck,
  Zap,
  ClipboardList,
  PackageCheck,
  Send,
  Award,
  ShoppingBag
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
    case 'send': return <Send className={className} />;
    case 'award': return <Award className={className} />;
    default: return <Check className={className} />;
  }
}

export default function OrderTrackingPage() {
  const { orderId } = useParams();
  const { 
    orders, 
    activeTrackingOrderId, 
    advanceOrderStatus, 
    setOrderStatus, 
    cancelOrder,
    rateOrder, 
    submitComplaint,
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

  // Modals
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [ratingVal, setRatingVal] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
  const [issueType, setIssueType] = useState('Late delivery');
  const [issueDesc, setIssueDesc] = useState('');
  const [complaintSubmitted, setComplaintSubmitted] = useState(false);

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

  const handleReviewSubmit = (e) => {
    e.preventDefault();
    rateOrder(order.id, ratingVal, reviewComment);
    setReviewSubmitted(true);
    setTimeout(() => {
      setIsReviewModalOpen(false);
    }, 1200);
  };

  const handleComplaintSubmit = (e) => {
    e.preventDefault();
    submitComplaint(order.id, issueType, issueDesc);
    setComplaintSubmitted(true);
    setTimeout(() => {
      setIsComplaintModalOpen(false);
    }, 1200);
  };

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

      {/* Simulator Control Bar for instant testing */}
      {!apiEnabled && (
        <div className="bg-gradient-to-r from-[#1c0a03] via-[#3a1a0c] to-[#1c0a03] text-white rounded-3xl p-4 sm:p-5 mb-8 shadow-2xl border border-[#522712]/70 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#542813] text-[#ebd7c5] border border-[#7a3a19]/50 flex items-center justify-center font-bold text-xs shadow-sm">
              <Zap className="w-4 h-4 text-[#d9bda6]" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>Interactive Status Simulator</span>
                <span className="text-[10px] bg-[#542813] text-[#ebd7c5] border border-[#7a3a19]/50 px-2 py-0.5 rounded-full font-bold">
                  Frontend Demo
                </span>
              </div>
              <p className="text-[11px] text-stone-300">
                Test every step of the order lifecycle live in real-time
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => advanceOrderStatus(order.id)}
              disabled={isDeliveredOrDone || isCancelled}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#8a5332] to-[#6d391d] hover:from-[#a0633e] hover:to-[#824424] disabled:opacity-50 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md transition active:scale-95"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>Advance to Next Status</span>
            </button>

            <select
              value={order.status}
              onChange={(e) => setOrderStatus(order.id, e.target.value)}
              className="bg-[#2b1206] text-stone-200 text-xs font-semibold px-3 py-2 rounded-xl border border-[#522712] outline-none cursor-pointer"
            >
              {ORDER_STATUSES.filter((status) => (
                status.id !== 'cancelled' || canCancel || isCancelled
              )).map((status) => (
                <option key={status.id} value={status.id}>
                  Jump to: {status.label}
                </option>
              ))}
            </select>
            {canCancel && (
              <button
                type="button"
                onClick={() => cancelOrder(order.id, 'Cancelled from order tracking')}
                className="px-3.5 py-2 rounded-xl border border-red-400/40 text-red-200 hover:bg-red-500/15 font-bold text-xs transition"
              >
                Cancel order
              </button>
            )}
          </div>
        </div>
      )}

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
              <span>{order.estimatedDeliveryTime || '20–30 min'}</span>
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

          {/* Delivery Simulation Map Graphic */}
          <div className="bg-gradient-to-br from-stone-50 to-[#faf6f2] rounded-3xl p-6 border border-stone-200/80 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase text-stone-500 flex items-center gap-1">
                <MapPin className="w-4 h-4 text-[#8a5332]" />
                <span>Live Route Simulation</span>
              </span>
              <span className="text-xs font-extrabold text-[#542813]">
                Kimironko Sector
              </span>
            </div>

            <div className="bg-white/85 backdrop-blur-md rounded-2xl p-4 border border-stone-100 shadow-sm space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 rounded-full bg-[#542813] mt-1 flex-shrink-0 ring-4 ring-[#ebd7c5]" />
                <div className="text-xs">
                  <span className="font-bold text-gray-900">Kitchen Pickup:</span>
                  <p className="text-stone-600">{order.vendorName} ({order.vendorLocation})</p>
                </div>
              </div>

              <div className="w-0.5 h-6 bg-dashed border-l border-dashed border-stone-300 ml-1.5" />

              <div className="flex items-start gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-600 mt-1 flex-shrink-0 ring-4 ring-emerald-200" />
                <div className="text-xs">
                  <span className="font-bold text-gray-900">Customer Drop-off:</span>
                  <p className="text-stone-600">{order.deliveryAddress?.street || 'Kimironko KG 11 Ave'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Post-Delivery Actions: Review & Complaint buttons */}
          {isDeliveredOrDone && (
            <div className="p-6 bg-white rounded-3xl border border-stone-200/80 shadow-sm space-y-3">
              <h4 className="font-black text-gray-900 text-sm">Order Completed</h4>
              <p className="text-xs text-stone-600">
                How was your meal from {order.vendorName}? Help them grow with your feedback.
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={() => setIsReviewModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] hover:from-[#3d1b0c] hover:via-[#5c2810] hover:to-[#2c1206] text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-[#2b1206]/20 active:scale-95"
                >
                  <Star className="w-3.5 h-3.5 text-[#d9bda6]" />
                  <span>Rate & Review Kitchen</span>
                </button>

                <button
                  onClick={() => setIsComplaintModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-red-50 text-stone-700 hover:text-red-600 font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Report an Issue / Complaint</span>
                </button>
              </div>

              {order.rated && (
                <div className="p-3 bg-[#faf6f2] border border-[#ebd7c5] rounded-xl text-xs text-[#3d1b0c] font-medium flex items-center gap-1.5">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>You rated this order {order.rating} stars: "{order.review}"</span>
                </div>
              )}
            </div>
          )}

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

      {/* Review Modal */}
      {isReviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scale-in border border-stone-100">
            <h3 className="font-black text-xl text-gray-900">
              Rate {order.vendorName}
            </h3>
            <p className="text-xs text-stone-500">
              Your honest feedback helps food cooks maintain top quality and reputation.
            </p>

            {reviewSubmitted ? (
              <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl text-xs font-bold text-center flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Thank you for your review!</span>
              </div>
            ) : (
              <form onSubmit={handleReviewSubmit} className="space-y-4">
                <div className="flex justify-center gap-2 py-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setRatingVal(star)}
                      className="p-1 hover:scale-110 transition active:scale-95"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= ratingVal
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-stone-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Your Comments
                  </label>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Tell us what you loved about the food..."
                    rows={3}
                    className="w-full text-xs p-3 rounded-xl border border-stone-200 outline-none focus:border-[#542813] focus:ring-2 focus:ring-[#542813]/15 transition"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] text-white rounded-xl font-bold text-xs shadow-md shadow-[#2b1206]/20 transition-all hover:scale-[1.01] active:scale-95"
                  >
                    Submit Review
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsReviewModalOpen(false)}
                    className="px-4 py-3 bg-stone-100 text-stone-700 rounded-xl font-bold text-xs hover:bg-stone-200 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Complaint Modal */}
      {isComplaintModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scale-in border border-stone-100">
            <h3 className="font-black text-xl text-gray-900">
              Submit Complaint & Support Request
            </h3>
            <p className="text-xs text-stone-500">
              Our support team reviews customer issues promptly with vendor escrow guarantees.
            </p>

            {complaintSubmitted ? (
              <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl text-xs font-bold text-center flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Complaint registered! An agent is assigned to your ticket.</span>
              </div>
            ) : (
              <form onSubmit={handleComplaintSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Select Issue Type
                  </label>
                  <select
                    value={issueType}
                    onChange={(e) => setIssueType(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-stone-200 bg-white outline-none focus:border-[#542813]"
                  >
                    <option value="Wrong food">Wrong food delivered</option>
                    <option value="Missing food">Missing food / item</option>
                    <option value="Late delivery">Late delivery</option>
                    <option value="Food quality problem">Food quality problem</option>
                    <option value="Payment problem">Payment problem</option>
                    <option value="Delivery problem">Delivery / driver problem</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={issueDesc}
                    onChange={(e) => setIssueDesc(e.target.value)}
                    placeholder="Describe what occurred with your order..."
                    rows={3}
                    required
                    className="w-full text-xs p-3 rounded-xl border border-stone-200 outline-none focus:border-[#542813] focus:ring-2 focus:ring-[#542813]/15 transition"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-95"
                  >
                    Send Ticket to Support
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsComplaintModalOpen(false)}
                    className="px-4 py-3 bg-stone-100 text-stone-700 rounded-xl font-bold text-xs hover:bg-stone-200 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
