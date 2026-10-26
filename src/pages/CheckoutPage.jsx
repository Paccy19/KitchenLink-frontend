import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useOrders } from '../context/OrderContext';
import { useLocation } from '../context/LocationContext';
import { buildScheduledFor } from '../utils/schedule';
import { basketRuleProblem } from '../data/vendorTypes';
import { sanitizePhoneInput } from '../utils/validation';
import FulfillmentSection from '../components/checkout/FulfillmentSection';
import ScheduleSection from '../components/checkout/ScheduleSection';
import PaymentSection from '../components/checkout/PaymentSection';
import OrderSummary from '../components/checkout/OrderSummary';
import { EMPTY_PAYMENT_INPUTS, PAYMENT_METHODS, buildPaymentDetails } from '../components/checkout/paymentMethods';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const {
    cartItems,
    activeVendor,
    subtotal,
    deliveryFee,
    deliveryQuote,
    grandTotal,
    clearCart,
    clearAfterCheckout,
    waitForCartSync,
    apiError: cartApiError,
    isSyncing,
    orderType,
    fulfillment,
    setFulfillment,
    scheduledDate,
    scheduledTime,
    preorderSpecial,
    orderingRules,
    totalItemCount,
  } = useCart();
  const { user, isAuthenticated, openAuthModal, addAddress } = useAuth();
  const { placeOrder, apiEnabled, apiError, clearApiError } = useOrders();
  const { coords } = useLocation();

  const scheduledFor =
    orderType === 'scheduled'
      ? buildScheduledFor(scheduledDate, scheduledTime)
      : orderType === 'preorder' && preorderSpecial?.deliveryAt
        ? preorderSpecial.deliveryAt
        : null;

  // Pickup: the customer collects the food at the kitchen — no delivery fee,
  // no delivery worker, and the kitchen confirms with the customer's code.
  const isPickup = fulfillment === 'pickup';

  // Selected address state
  const [selectedAddressId, setSelectedAddressId] = useState(() => {
    return user.addresses && user.addresses.length > 0 ? user.addresses[0].id : 'new';
  });

  // Payment method state. Mobile Money starts with the number the customer
  // signed in with; they can still change it.
  const accountPhone = sanitizePhoneInput(user.phone);
  const [paymentMethod, setPaymentMethod] = useState('mobile_money');
  const [paymentInputs, setPaymentInputs] = useState(() => ({
    ...EMPTY_PAYMENT_INPUTS,
    mobile_money: { phone: accountPhone },
  }));

  // Signing in on this page fills the number in, unless one was already typed.
  useEffect(() => {
    if (!accountPhone) return;
    setPaymentInputs((prev) =>
      prev.mobile_money.phone ? prev : { ...prev, mobile_money: { phone: accountPhone } },
    );
  }, [accountPhone]);
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const setPaymentInput = (code, field, value) =>
    setPaymentInputs((prev) => ({
      ...prev,
      [code]: { ...prev[code], [field]: value },
    }));

  if (cartItems.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4 animate-scale-in">
        <div className="w-16 h-16 rounded-2xl bg-[#faf6f2] text-[#542813] border border-[#ebd7c5] mx-auto flex items-center justify-center shadow-sm">
          <AlertCircle className="w-8 h-8 text-[#6d391d]" />
        </div>
        <h2 className="text-2xl font-black text-gray-900">Your basket is currently empty</h2>
        <p className="text-xs text-stone-500">Add dishes from a kitchen before checking out.</p>
        <Link
          to="/"
          className="inline-block px-6 py-3 rounded-2xl bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] text-white font-bold text-sm shadow-md shadow-[#2b1206]/20 transition-all hover:scale-[1.01] active:scale-95"
        >
          Browse Menus
        </Link>
      </div>
    );
  }

  const handleConfirmOrder = async () => {
    if (isSyncing) {
      setErrorMsg('Please wait while your basket syncs with your account.');
      return;
    }
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }

    const currentAddr = user.addresses?.find((a) => a.id === selectedAddressId)
      || user.addresses?.[0];
    if (!isPickup && !currentAddr?.street) {
      setErrorMsg('Add or select a delivery address before placing your order.');
      return;
    }
    if (!isPickup && deliveryQuote.unavailableReason) {
      setErrorMsg(deliveryQuote.unavailableReason);
      return;
    }
    if (!isPickup && deliveryFee == null) {
      setErrorMsg("We couldn't calculate the delivery fee for your location. Please check your location and try again.");
      return;
    }

    // The kitchen type's minimum order / dishes-per-order rules.
    const ruleProblem = basketRuleProblem(orderingRules, { subtotal, itemCount: totalItemCount });
    if (ruleProblem) {
      setErrorMsg(ruleProblem);
      return;
    }

    const { error: paymentError, details: paymentDetails } = buildPaymentDetails(paymentMethod, paymentInputs);
    if (paymentError) {
      setErrorMsg(paymentError);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    clearApiError();
    const method = PAYMENT_METHODS.find((m) => m.code === paymentMethod);
    try {
      if (!(await waitForCartSync())) {
        setErrorMsg('Your basket changed. Please check it and confirm again.');
        return;
      }
      const orderId = await placeOrder({
        items: cartItems,
        vendor: activeVendor,
        deliveryAddress: isPickup ? null : currentAddr,
        fulfillment,
        deliveryLocation: isPickup
          ? { note: orderNotes }
          : {
              address: currentAddr.street,
              neighborhood: currentAddr.district,
              latitude: coords.lat,
              longitude: coords.lng,
              note: [currentAddr.instructions, orderNotes].filter(Boolean).join(' | '),
            },
        paymentMethod: {
          code: method.code,
          label: method.label,
        },
        paymentDetails,
        orderType,
        scheduledFor,
        scheduledInfo: { date: scheduledDate, time: scheduledTime },
        specialText: orderType === 'preorder' ? preorderSpecial?.text ?? '' : '',
        pricing: { subtotal, deliveryFee: deliveryFee ?? 0, total: grandTotal },
        specialNotes: orderNotes
      });

      if (apiEnabled) clearAfterCheckout();
      else await clearCart();
      navigate(`/track/${orderId}`);
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">

      {/* Back Button */}
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
            Checkout & Confirmation
          </h1>
          <p className="text-xs text-stone-500 font-medium">
            Choose delivery or pickup, review timing and pay safely in escrow
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left Column: Form & Information */}
        <div className="lg:col-span-7 space-y-6">

          <FulfillmentSection
            fulfillment={fulfillment}
            onFulfillmentChange={(value) => {
              setFulfillment(value);
              setErrorMsg('');
            }}
            activeVendor={activeVendor}
            addresses={user.addresses}
            selectedAddressId={selectedAddressId}
            onSelectAddress={setSelectedAddressId}
            onAddAddress={addAddress}
            onError={setErrorMsg}
          />

          <ScheduleSection
            orderType={orderType}
            isPickup={isPickup}
            preorderSpecial={preorderSpecial}
            scheduledFor={scheduledFor}
            scheduledDate={scheduledDate}
            scheduledTime={scheduledTime}
            apiEnabled={apiEnabled}
          />

          <PaymentSection
            paymentMethod={paymentMethod}
            onMethodChange={setPaymentMethod}
            paymentInputs={paymentInputs}
            onInputChange={setPaymentInput}
            accountPhone={accountPhone}
          />

          {/* 4. Notes for Kitchen or Rider */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-sm space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">
              {isPickup ? 'Order Notes for the Kitchen' : 'Order Notes / Delivery Instructions'}
            </label>
            <textarea
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              placeholder={isPickup ? 'Any special notes for the kitchen (e.g. when you will come)...' : 'Any special notes for the kitchen or delivery worker...'}
              rows={2}
              className="w-full text-xs p-3 rounded-xl border border-stone-200 outline-none focus:border-[#542813] focus:ring-2 focus:ring-[#542813]/15 transition resize-none"
            />
          </div>

        </div>

        {/* Right Column: Order Summary & Placement */}
        <div className="lg:col-span-5">
          <OrderSummary
            activeVendor={activeVendor}
            cartItems={cartItems}
            subtotal={subtotal}
            deliveryFee={deliveryFee}
            deliveryQuote={deliveryQuote}
            grandTotal={grandTotal}
            isPickup={isPickup}
            error={errorMsg || apiError || cartApiError}
            onPlaceOrder={handleConfirmOrder}
            isSubmitting={isSubmitting}
            disabled={isSubmitting || isSyncing || deliveryQuote.isLoading}
          />
        </div>

      </div>

    </div>
  );
}
