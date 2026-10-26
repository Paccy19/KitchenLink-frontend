import React, { useState } from 'react';
import { Bike, MapPin, Plus, Store } from 'lucide-react';
import StepCard from './StepCard';
import { KIGALI_AREAS } from '../../utils/kigaliAreas';

const FULFILLMENT_OPTIONS = [
  { id: 'delivery', label: 'Deliver to me', hint: 'A delivery worker brings it', icon: Bike },
  { id: 'pickup', label: "I'll pick it up", hint: 'Collect at the kitchen · no delivery fee', icon: Store },
];

/**
 * Checkout step 1: delivery or pickup, then the saved delivery address (or a
 * form to add one). Pickup shows where to collect and how the code works.
 */
export default function FulfillmentSection({
  fulfillment,
  onFulfillmentChange,
  activeVendor,
  addresses,
  selectedAddressId,
  onSelectAddress,
  onAddAddress,
  onError,
}) {
  const isPickup = fulfillment === 'pickup';

  // New address form state
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [newTitle, setNewTitle] = useState('Home');
  const [newStreet, setNewStreet] = useState('');
  const [newDistrict, setNewDistrict] = useState('');
  const [newInstructions, setNewInstructions] = useState('');

  const handleAddNewAddress = (e) => {
    e.preventDefault();
    if (!newStreet) {
      onError('Please specify your street address');
      return;
    }
    if (!newDistrict.trim()) {
      onError('Please enter your area (e.g. Kicukiro, Nyamirambo)');
      return;
    }
    onAddAddress({
      title: newTitle,
      street: newStreet,
      district: newDistrict.trim(),
      city: 'Kigali',
      instructions: newInstructions
    });
    setShowNewAddressForm(false);
    onError('');
  };

  return (
    <StepCard
      step={1}
      title={isPickup ? 'Pickup at the kitchen' : 'Delivery Destination'}
      action={
        !isPickup && !showNewAddressForm && (
          <button
            onClick={() => setShowNewAddressForm(true)}
            className="text-xs font-bold text-[#542813] hover:underline flex items-center gap-1 whitespace-nowrap flex-shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Location</span>
          </button>
        )
      }
    >
      <div role="radiogroup" aria-label="How do you want to get your order?" className="grid grid-cols-2 gap-2.5">
        {FULFILLMENT_OPTIONS.map((option) => {
          const Icon = option.icon;
          const selected = fulfillment === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onFulfillmentChange(option.id)}
              className={`flex items-start gap-2.5 p-3.5 rounded-2xl border text-left transition ${
                selected
                  ? 'border-[#542813] bg-[#faf6f2] ring-1 ring-[#542813]/20 shadow-sm'
                  : 'border-stone-200 hover:bg-stone-50'
              }`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${selected ? 'text-[#542813]' : 'text-stone-400'}`} />
              <span className="min-w-0">
                <span className="block font-bold text-xs text-gray-900">{option.label}</span>
                <span className="block text-[11px] text-stone-500 mt-0.5">{option.hint}</span>
              </span>
            </button>
          );
        })}
      </div>

      {isPickup ? (
        <div className="p-3.5 rounded-2xl bg-[#faf6f2] border border-[#ebd7c5] flex items-start gap-3 text-xs">
          <Store className="w-5 h-5 text-[#8a5332] flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-[#3d1b0c]">
              Collect from {activeVendor?.name || 'the kitchen'}
              {activeVendor?.location ? ` · ${activeVendor.location}` : ''}
            </p>
            <p className="text-stone-600 mt-0.5">
              When your food is ready we'll send you a 6-digit pickup code (it also shows on your order page).
              Give it to the kitchen when you collect your order.
            </p>
          </div>
        </div>
      ) : !showNewAddressForm ? (
        <div className="space-y-2.5">
          {addresses && addresses.length > 0 ? (
            addresses.map((addr) => (
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
                  onChange={() => onSelectAddress(addr.id)}
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
            <input
              list="checkout-kigali-areas"
              value={newDistrict}
              onChange={(e) => setNewDistrict(e.target.value.slice(0, 80))}
              placeholder="Area (any part of Kigali)"
              className="p-2.5 text-xs rounded-xl border border-stone-200 bg-white outline-none focus:border-[#542813]"
            />
            <datalist id="checkout-kigali-areas">
              {KIGALI_AREAS.map((area) => <option key={area} value={area} />)}
            </datalist>
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
            placeholder="Delivery instructions for the delivery worker (e.g. Gate color, floor number)"
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
    </StepCard>
  );
}
