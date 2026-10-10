import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Plus,
  Smartphone,
  CreditCard,
  Coins,
  Wallet,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useOrders } from '../context/OrderContext';
import { useLocation } from '../context/LocationContext';

const PAYMENT_METHODS = [
  {
    code: 'mobile_money',
    label: 'Mobile Money',
    hint: 'MTN or Airtel — +25078, +25079 or +25073',
    icon: Smartphone,
  },
  {
    code: 'card',
    label: 'Cards',
    hint: 'Visa or Mastercard via secure checkout',
    icon: CreditCard,
  },
  {
    code: 'ekash',
    label: 'eKash',
    hint: 'Pay instantly from your eKash wallet',
    icon: Coins,
  },
  {
    code: 'wallet',
    label: 'Wallet',
    hint: 'Pay from the wallet linked to your phone',
    icon: Wallet,
  },
];

// Mobile Money only supports MTN (078, 079) and Airtel (073).
const MOBILE_MONEY_PHONE_REGEX = /^0(78|79|73)\d{7}$/;
const MOBILE_PHONE_REGEX = /^0(72|73|78|79)\d{7}$/;

const normalizeRwandanPhone = (raw) => {
  let digits = String(raw ?? '').replace(/[^\d]/g, '');
  if (digits.startsWith('250')) digits = digits.slice(3);
  if (!digits.startsWith('0')) digits = `0${digits}`;
  return digits;
};

const formatCardNumber = (raw) =>
  String(raw ?? '')
    .replace(/[^\d]/g, '')
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, '$1 ');

const formatCardExpiry = (raw) => {
  const digits = String(raw ?? '').replace(/[^\d]/g, '').slice(0, 4);
  return digits.length >= 3 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { 
    cartItems, 
    activeVendor, 
    subtotal, 
    deliveryFee, 
    grandTotal, 
    clearCart,
    clearAfterCheckout,
    apiError: cartApiError,
    isSyncing,
    orderType,
    scheduledDate,
    scheduledTime
  } = useCart();
  const { user, isAuthenticated, openAuthModal, addAddress } = useAuth();
  const { placeOrder, apiEnabled, apiError, clearApiError } = useOrders();
  const { coords } = useLocation();

  // Selected address state
  const [selectedAddressId, setSelectedAddressId] = useState(() => {
    return user.addresses && user.addresses.length > 0 ? user.addresses[0].id : 'new';
  });

  // New address form state
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [newTitle, setNewTitle] = useState('Home');
  const [newStreet, setNewStreet] = useState('');
  const [newDistrict, setNewDistrict] = useState('Kimironko, Gasabo');
  const [newInstructions, setNewInstructions] = useState('');

  // Payment method state
  const [paymentMethod, setPaymentMethod] = useState('mobile_money');
  const [paymentInputs, setPaymentInputs] = useState({
    mobile_money: { phone: '' },
    card: { card_number: '', card_expiry: '', card_cvv: '' },
    ekash: { phone: '' },
    wallet: { phone: '' },
  });
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const setPaymentInput = (code, field, value) =>
    setPaymentInputs((prev) => ({
      ...prev,
      [code]: { ...prev[code], [field]: value },
    }));

  // Validates the inputs for the selected method and returns the payload that
  // gets persisted with the order. The CVV is validated but never sent/stored.
  const buildPaymentDetails = () => {
    if (paymentMethod === 'card') {
      const { card_number, card_expiry, card_cvv } = paymentInputs.card;
      const cardNumber = String(card_number ?? '').replace(/\s/g, '');
      if (!/^\d{13,19}$/.test(cardNumber)) {
        return { error: 'Enter a valid card number (13–19 digits).' };
      }
      const expiry = String(card_expiry ?? '').trim();
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) {
        return { error: 'Enter the card expiry as MM/YY.' };
      }
      if (!/^\d{3,4}$/.test(String(card_cvv ?? '').trim())) {
        return { error: 'Enter the card CVV (3–4 digits).' };
      }
      return { details: { card_number: cardNumber, card_expiry: expiry } };
    }

    const phone = normalizeRwandanPhone(paymentInputs[paymentMethod]?.phone);
    const regex =
      paymentMethod === 'mobile_money' ? MOBILE_MONEY_PHONE_REGEX : MOBILE_PHONE_REGEX;
    if (!regex.test(phone)) {
      return {
        error:
          paymentMethod === 'mobile_money'
            ? 'Enter a valid MTN or Airtel number (+25078, +25079 or +25073).'
            : 'Enter a valid Rwandan mobile number (e.g. 0788123456).',
      };
    }
    return { details: { phone } };
  };

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

  const handleAddNewAddress = (e) => {
    e.preventDefault();
    if (!newStreet) {
      setErrorMsg('Please specify your street address');
      return;
    }
    const newAddr = {
      title: newTitle,
      street: newStreet,
      district: newDistrict,
      city: 'Kigali',
      instructions: newInstructions
    };
    addAddress(newAddr);
    setShowNewAddressForm(false);
    setErrorMsg('');
  };

  const handleConfirmOrder = async () => {
    if (isSyncing) {
      setErrorMsg('Please wait while your basket syncs with your account.');
      return;
    }
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    if (apiEnabled && orderType === 'scheduled') {
      setErrorMsg('Scheduled delivery is not available through the backend yet. Change the order to immediate delivery in your basket.');
      return;
    }

    const currentAddr = user.addresses?.find((a) => a.id === selectedAddressId)
      || user.addresses?.[0];
    if (!currentAddr?.street) {
      setErrorMsg('Add or select a delivery address before placing your order.');
      return;
    }

    const { error: paymentError, details: paymentDetails } = buildPaymentDetails();
    if (paymentError) {
      setErrorMsg(paymentError);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    clearApiError();
    const method = PAYMENT_METHODS.find((m) => m.code === paymentMethod);
    try {
      const orderId = await placeOrder({
        items: cartItems,
        vendor: activeVendor,
        deliveryAddress: currentAddr,
        deliveryLocation: {
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
        scheduledInfo: { date: scheduledDate, time: scheduledTime },
        pricing: { subtotal, deliveryFee, total: grandTotal },
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
            Review delivery destination, scheduling and safe escrow payment
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Form & Information */}
        <div className="lg:col-span-7 space-y-6">

          {/* 1. Delivery Location Selection */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#faf6f2] text-[#542813] border border-[#ebd7c5] flex items-center justify-center font-black text-xs">
                  1
                </div>
                <h3 className="font-extrabold text-gray-900 text-base">
                  Delivery Destination
                </h3>
              </div>

              {!showNewAddressForm && (
                <button
                  onClick={() => setShowNewAddressForm(true)}
                  className="text-xs font-bold text-[#542813] hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Location</span>
                </button>
              )}
            </div>

            {!showNewAddressForm ? (
              <div className="space-y-2.5">
                {user.addresses && user.addresses.length > 0 ? (
                  user.addresses.map((addr) => (
                    <label
                      key={addr.id}
                      className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition ${
                        selectedAddressId === addr.id
                          ? 'border-[#542813] bg-[#faf6f2] ring-1 ring-[#542813]/20 shadow-sm'
                          : 'border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="delivery_address"
                        checked={selectedAddressId === addr.id}
                        onChange={() => setSelectedAddressId(addr.id)}
                        className="mt-1 accent-[#542813]"
                      />
                      <div className="text-xs">
                        <div className="font-bold text-gray-900 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#8a5332]" />
                          <span>{addr.title}</span>
                          {addr.isDefault && (
                            <span className="text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-stone-700 mt-0.5 font-medium">{addr.street}, {addr.district}</p>
                        {addr.instructions && (
                          <p className="text-stone-400 italic mt-0.5">Note: {addr.instructions}</p>
                        )}
                      </div>
                    </label>
                  ))
                ) : (
                  <p className="text-xs text-stone-500">No saved addresses yet. Add one below:</p>
                )}
              </div>
            ) : (
              <form onSubmit={handleAddNewAddress} className="p-4 bg-stone-50 rounded-2xl space-y-3 border border-stone-200">
                <div className="font-bold text-xs text-stone-800">Add New Delivery Location</div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Label (e.g. Home, Work)"
                    className="p-2.5 text-xs rounded-xl border border-stone-200 bg-white outline-none focus:border-[#542813]"
                  />
                  <select
                    value={newDistrict}
                    onChange={(e) => setNewDistrict(e.target.value)}
                    className="p-2.5 text-xs rounded-xl border border-stone-200 bg-white outline-none focus:border-[#542813]"
                  >
                    <option value="Kimironko, Gasabo">Kimironko, Gasabo</option>
                    <option value="Remera, Gasabo">Remera, Gasabo</option>
                    <option value="Nyarutarama, Gasabo">Nyarutarama, Gasabo</option>
                    <option value="Kiyovu, Nyarugenge">Kiyovu, Nyarugenge</option>
                    <option value="Kacyiru, Gasabo">Kacyiru, Gasabo</option>
                    <option value="Gisozi, Gasabo">Gisozi, Gasabo</option>
                  </select>
                </div>
                <input
                  type="text"
                  value={newStreet}
                  onChange={(e) => setNewStreet(e.target.value)}
                  placeholder="Street / Landmark (e.g. KG 11 Ave, near Simba Supermarket)"
                  className="w-full p-2.5 text-xs rounded-xl border border-stone-200 bg-white outline-none focus:border-[#542813]"
                />
                <input
                  type="text"
                  value={newInstructions}
                  onChange={(e) => setNewInstructions(e.target.value)}
                  placeholder="Delivery instructions for rider (e.g. Gate color, floor number)"
                  className="w-full p-2.5 text-xs rounded-xl border border-stone-200 bg-white outline-none focus:border-[#542813]"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-[#2b1206] to-[#542813] text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95"
                  >
                    Save Address
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewAddressForm(false)}
                    className="px-4 py-2 bg-stone-200 text-stone-700 rounded-xl text-xs font-bold hover:bg-stone-300 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* 2. Timing confirmation */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#faf6f2] text-[#542813] border border-[#ebd7c5] flex items-center justify-center font-black text-xs">
                2
              </div>
              <h3 className="font-extrabold text-gray-900 text-base">
                Delivery Schedule
              </h3>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#faf6f2] border border-[#ebd7c5] flex items-center gap-3">
              <Clock className="w-5 h-5 text-[#8a5332] flex-shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-[#3d1b0c]">
                  {orderType === 'immediate' ? 'Immediate Delivery' : 'Scheduled Pre-Order'}
                </span>
                <p className="text-stone-600 mt-0.5">
                  {orderType === 'immediate'
                    ? 'Estimated delivery time: 25–35 minutes after kitchen preparation'
                    : `Scheduled to arrive: ${scheduledDate} at ${scheduledTime}`}
                </p>
              </div>
            </div>
            {apiEnabled && orderType === 'scheduled' && (
              <p role="alert" className="text-xs font-semibold text-amber-800">
                Scheduled orders are not supported by the connected API. Switch to immediate delivery in your basket.
              </p>
            )}
            {apiEnabled && orderType === 'scheduled' && (
              <p role="alert" className="text-xs font-semibold text-amber-800">
                Scheduled orders are not supported by the connected API. Switch to immediate delivery in your basket.
              </p>
            )}
          </div>

          {/* 3. Payment Method */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#faf6f2] text-[#542813] border border-[#ebd7c5] flex items-center justify-center font-black text-xs">
                3
              </div>
              <h3 className="font-extrabold text-gray-900 text-base">
                Payment Method
              </h3>
            </div>

            <div className="space-y-2.5">
              {PAYMENT_METHODS.map((method) => {
                const Icon = method.icon;
                const selected = paymentMethod === method.code;
                const inputClass =
                  'w-full text-xs p-3 rounded-xl border border-stone-200 bg-white text-gray-900 outline-none focus:border-[#542813] focus:ring-2 focus:ring-[#542813]/15 transition';
                return (
                  <div
                    key={method.code}
                    className={`rounded-2xl border transition ${
                      selected
                        ? 'border-[#542813] bg-[#faf6f2] ring-1 ring-[#542813]/20 shadow-sm'
                        : 'border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    <label className="flex items-center justify-between p-4 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="pay_method"
                          checked={selected}
                          onChange={() => setPaymentMethod(method.code)}
                          className="accent-[#542813]"
                        />
                        <div>
                          <div className="font-bold text-xs text-gray-900">{method.label}</div>
                          <p className="text-[11px] text-stone-500">{method.hint}</p>
                        </div>
                      </div>
                      <Icon className="w-5 h-5 text-stone-400" />
                    </label>

                    {selected && (
                      <div className="px-4 pb-4 space-y-2">
                        {method.code === 'card' ? (
                          <>
                            <input
                              type="text"
                              inputMode="numeric"
                              autoComplete="cc-number"
                              value={paymentInputs.card.card_number}
                              onChange={(e) =>
                                setPaymentInput('card', 'card_number', formatCardNumber(e.target.value))
                              }
                              placeholder="Card number"
                              className={inputClass}
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                inputMode="numeric"
                                autoComplete="cc-exp"
                                value={paymentInputs.card.card_expiry}
                                onChange={(e) =>
                                  setPaymentInput('card', 'card_expiry', formatCardExpiry(e.target.value))
                                }
                                placeholder="Expiry (MM/YY)"
                                className={inputClass}
                              />
                              <input
                                type="password"
                                inputMode="numeric"
                                autoComplete="cc-csc"
                                value={paymentInputs.card.card_cvv}
                                onChange={(e) =>
                                  setPaymentInput(
                                    'card',
                                    'card_cvv',
                                    e.target.value.replace(/[^\d]/g, '').slice(0, 4)
                                  )
                                }
                                placeholder="CVV"
                                className={inputClass}
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <input
                              type="tel"
                              inputMode="tel"
                              value={paymentInputs[method.code].phone}
                              onChange={(e) => setPaymentInput(method.code, 'phone', e.target.value)}
                              placeholder={
                                method.code === 'mobile_money'
                                  ? 'Phone number e.g. +250788123456'
                                  : 'Phone number e.g. 0788123456'
                              }
                              className={inputClass}
                            />
                            {method.code === 'mobile_money' && (
                              <p className="text-[10px] font-medium text-stone-500">
                                Supported networks: MTN (+25078, +25079) and Airtel (+25073).
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Notes for Kitchen or Rider */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-sm space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">
              Order Notes / Delivery Instructions
            </label>
            <textarea
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              placeholder="Any special notes for the kitchen or delivery driver..."
              rows={2}
              className="w-full text-xs p-3 rounded-xl border border-stone-200 outline-none focus:border-[#542813] focus:ring-2 focus:ring-[#542813]/15 transition resize-none"
            />
          </div>

        </div>

        {/* Right Column: Order Summary & Placement */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xl sticky top-24 space-y-6">
            
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
                <span>Delivery fee (free over 15,000 RWF)</span>
                <span className="font-bold">{deliveryFee.toLocaleString()} RWF</span>
              </div>
              <div className="flex justify-between text-base font-black text-gray-900 pt-3 border-t border-gray-200">
                <span>Total Due</span>
                <span className="text-[#4e2410]">{grandTotal.toLocaleString()} RWF</span>
              </div>
            </div>

            {/* Submit Button */}
            {(errorMsg || apiError || cartApiError) && (
              <div role="alert" className="mb-3 rounded-xl border border-red-100 bg-red-50 p-3 text-xs font-semibold text-red-700">
                {errorMsg || apiError || cartApiError}
              </div>
            )}
            <button
              onClick={handleConfirmOrder}
              disabled={isSubmitting || isSyncing}
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
        </div>

      </div>

    </div>
  );
}
