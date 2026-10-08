import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  MapPin, 
  CreditCard, 
  Smartphone, 
  Clock, 
  CheckCircle2, 
  ShieldCheck, 
  AlertCircle,
  Plus,
  Wallet
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useOrders } from '../context/OrderContext';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { 
    cartItems, 
    activeVendor, 
    subtotal, 
    deliveryFee, 
    platformFee, 
    grandTotal, 
    clearCart,
    orderType,
    scheduledDate,
    scheduledTime
  } = useCart();
  const { user, isAuthenticated, openAuthModal, addAddress } = useAuth();
  const { placeOrder } = useOrders();

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
  const [paymentMethod, setPaymentMethod] = useState('mtn_momo');
  const [momoPhone, setMomoPhone] = useState(user.phone || '+250 788 123 456');
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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

  const handleConfirmOrder = () => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }

    const currentAddr = user.addresses.find((a) => a.id === selectedAddressId) || user.addresses[0] || {
      title: 'Current Delivery Location',
      street: 'KG 11 Ave, Kimironko',
      district: 'Kimironko',
      city: 'Kigali'
    };

    setIsSubmitting(true);

    setTimeout(() => {
      const placedOrder = placeOrder({
        vendorId: activeVendor?.id || 'vendor-1',
        vendorName: activeVendor?.name || 'Mama Grace Kitchen',
        vendorType: activeVendor?.type || 'Home Cook',
        vendorLocation: activeVendor?.location || 'Kimironko, Kigali',
        items: cartItems.map((ci) => ({
          dishId: ci.id,
          name: ci.name,
          price: ci.price,
          quantity: ci.quantity,
          selectedOptions: ci.selectedOptions || {},
          image: ci.image
        })),
        pricing: {
          subtotal,
          deliveryFee,
          platformFee,
          total: grandTotal
        },
        deliveryAddress: currentAddr,
        orderType,
        scheduledDetails: orderType === 'scheduled' ? { date: scheduledDate, time: scheduledTime } : null,
        payment: {
          method: paymentMethod === 'mtn_momo' ? 'MTN MoMo' : paymentMethod === 'airtel_money' ? 'Airtel Money' : 'Card',
          phone: momoPhone,
          status: 'Authorized Escrow'
        },
        notes: orderNotes
      });

      clearCart();
      setIsSubmitting(false);
      navigate(`/track/${placedOrder.id}`);
    }, 1200);
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
              {/* MTN MoMo */}
              <label
                className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition ${
                  paymentMethod === 'mtn_momo'
                    ? 'border-[#542813] bg-[#faf6f2] ring-1 ring-[#542813]/20 shadow-sm'
                    : 'border-stone-200 hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="pay_method"
                    checked={paymentMethod === 'mtn_momo'}
                    onChange={() => setPaymentMethod('mtn_momo')}
                    className="accent-[#542813]"
                  />
                  <div>
                    <div className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block"></span>
                      <span>MTN Mobile Money</span>
                      <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1.5 py-0.2 rounded font-bold">Recommended</span>
                    </div>
                    <p className="text-[11px] text-stone-500">Instant push prompt on your Rwandan phone</p>
                  </div>
                </div>
                <Smartphone className="w-5 h-5 text-stone-400" />
              </label>

              {/* Airtel Money */}
              <label
                className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition ${
                  paymentMethod === 'airtel_money'
                    ? 'border-[#542813] bg-[#faf6f2] ring-1 ring-[#542813]/20 shadow-sm'
                    : 'border-stone-200 hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="pay_method"
                    checked={paymentMethod === 'airtel_money'}
                    onChange={() => setPaymentMethod('airtel_money')}
                    className="accent-[#542813]"
                  />
                  <div>
                    <div className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
                      <span>Airtel Money</span>
                    </div>
                    <p className="text-[11px] text-stone-500">Pay via Airtel Money wallet</p>
                  </div>
                </div>
                <Smartphone className="w-5 h-5 text-stone-400" />
              </label>

              {/* Debit / Credit Card */}
              <label
                className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition ${
                  paymentMethod === 'card'
                    ? 'border-[#542813] bg-[#faf6f2] ring-1 ring-[#542813]/20 shadow-sm'
                    : 'border-stone-200 hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="pay_method"
                    checked={paymentMethod === 'card'}
                    onChange={() => setPaymentMethod('card')}
                    className="accent-[#542813]"
                  />
                  <div>
                    <div className="font-bold text-xs text-gray-900">Visa / Mastercard</div>
                    <p className="text-[11px] text-stone-500">Debit or Credit Card</p>
                  </div>
                </div>
                <CreditCard className="w-5 h-5 text-stone-400" />
              </label>

              {/* eKash / Wallet */}
              <label
                className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition ${
                  paymentMethod === 'ekash'
                    ? 'border-[#542813] bg-[#faf6f2] ring-1 ring-[#542813]/20 shadow-sm'
                    : 'border-stone-200 hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="pay_method"
                    checked={paymentMethod === 'ekash'}
                    onChange={() => setPaymentMethod('ekash')}
                    className="accent-[#542813]"
                  />
                  <div>
                    <div className="font-bold text-xs text-gray-900">eKash Rwanda / Platform Wallet</div>
                    <p className="text-[11px] text-stone-500">Interoperable instant mobile wallet</p>
                  </div>
                </div>
                <Wallet className="w-5 h-5 text-stone-400" />
              </label>
            </div>

            {/* Mobile Money Phone Input if momo chosen */}
            {(paymentMethod === 'mtn_momo' || paymentMethod === 'airtel_money') && (
              <div className="pt-2">
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Payment Phone Number
                </label>
                <input
                  type="tel"
                  value={momoPhone}
                  onChange={(e) => setMomoPhone(e.target.value)}
                  placeholder="+250 788 123 456"
                  className="w-full p-3 rounded-xl border border-stone-200 text-xs font-bold outline-none focus:border-[#542813] focus:ring-2 focus:ring-[#542813]/15 transition"
                />
                <span className="text-[11px] text-stone-400 mt-1 block">
                  A USSD prompt will be sent to this phone to enter PIN and authorize {grandTotal.toLocaleString()} RWF.
                </span>
              </div>
            )}
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
              <div className="flex justify-between text-stone-600">
                <span>Rider Delivery Fee</span>
                <span className="font-bold">{deliveryFee.toLocaleString()} RWF</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Platform Service Fee</span>
                <span className="font-bold">{platformFee.toLocaleString()} RWF</span>
              </div>
              <div className="flex justify-between text-base font-black text-gray-900 pt-3 border-t border-stone-200">
                <span>Total Due</span>
                <span className="text-[#4e2410]">{grandTotal.toLocaleString()} RWF</span>
              </div>
            </div>

            {/* Trust badge */}
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 text-[11px] text-emerald-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Payments held safely in escrow until your food is delivered.</span>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleConfirmOrder}
              disabled={isSubmitting}
              className={`w-full py-4 rounded-2xl bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] hover:from-[#3d1b0c] hover:via-[#5c2810] hover:to-[#2c1206] text-white font-black text-sm shadow-xl shadow-[#2b1206]/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-95 ${
                isSubmitting ? 'opacity-75 cursor-wait' : ''
              }`}
            >
              {isSubmitting ? (
                <span>Authorizing Payment & Sending Order...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 text-[#d9bda6]" />
                  <span>Confirm & Pay {grandTotal.toLocaleString()} RWF</span>
                </>
              )}
            </button>

          </div>
        </div>

      </div>

    </div>
  );
}
