import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Bike, Camera, MapPin, Plus, QrCode, Store, UtensilsCrossed } from 'lucide-react';
import TableQrScanner from './TableQrScanner';
import StepCard from './StepCard';
import KitchenLocationFields from '../vendor-dashboard/KitchenLocationFields';

const FULFILLMENT_OPTIONS = [
  { id: 'delivery', label: 'Deliver to me', hint: 'A delivery worker brings it', icon: Bike },
  { id: 'pickup', label: "I'll pick it up", hint: 'Collect at the kitchen · no delivery fee', icon: Store },
  { id: 'dine_in', label: "I'm at the restaurant", hint: 'Served at your table', icon: UtensilsCrossed },
];

/** The table token from a scanned table link (…/menu/<token>) or a bare code. */
const tableToken = (text) => {
  const value = String(text || '').trim();
  const match = value.match(/\/menu\/([A-Za-z0-9_-]+)/);
  if (match) return match[1];
  return /^[A-Za-z0-9_-]{6,}$/.test(value) ? value : '';
};

/**
 * Eating in: the table's QR code is what tells the kitchen where you sit, so
 * the order is placed from the table's menu. The basket comes along.
 */
function DineInPanel({ activeVendor }) {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const open = (text) => {
    const token = tableToken(text);
    if (!token) {
      setError("That isn't a table code. Scan the QR code on your table.");
      return false;
    }
    navigate(`/menu/${token}`);
    return true;
  };
  const onScanned = useCallback((text) => {
    setScanning(false);
    open(text);
  }, []);
  return (
    <div className="p-4 rounded-2xl bg-[#faf6f2] border border-[#ebd7c5] space-y-3 text-xs">
      <div className="flex items-start gap-3">
        <QrCode className="w-6 h-6 text-[#8a5332] flex-shrink-0" />
        <div>
          <p className="font-bold text-sm text-[#3d1b0c]">Scan the QR code on your table</p>
          <p className="text-stone-600 mt-0.5">
            It opens {activeVendor?.name || 'the kitchen'}'s menu for your table, with your basket.
          </p>
        </div>
      </div>
      <button type="button" onClick={() => { setError(''); setScanning(true); }} className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#2b1206] text-white text-sm font-bold">
          <Camera className="w-4 h-4" /> Scan with camera
        </button>
      <form onSubmit={(e) => { e.preventDefault(); open(code); }} className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => { setCode(e.target.value); setError(''); }}
          placeholder="Or paste the table link"
          className={inputClass(Boolean(error))}
        />
        <button type="submit" className="px-3 rounded-xl border border-[#2b1206] text-[#2b1206] font-bold inline-flex items-center gap-1 flex-shrink-0">
          Open <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </form>
      {error && <p className="text-red-600 font-semibold">{error}</p>}
      {scanning && <TableQrScanner onResult={onScanned} onClose={() => setScanning(false)} />}
    </div>
  );
}

/** The map pin of a saved address ({ lat, lng } numbers), or null when it has none. */
export const addressPoint = (address) => {
  const lat = Number(address?.lat);
  const lng = Number(address?.lng);
  return address?.lat != null && address?.lng != null && Number.isFinite(lat) && Number.isFinite(lng)
    ? { lat, lng }
    : null;
};

const EMPTY_FORM = { title: 'Home', area: '', street: '', coords: { lat: '', lng: '' }, instructions: '' };

const inputClass = (error) =>
  `w-full p-2.5 text-xs rounded-xl border bg-white outline-none focus:border-[#542813] ${
    error ? 'border-red-300' : 'border-stone-200'
  }`;

/**
 * Checkout step 1: delivery, pickup or eating in, then where to deliver. Each delivery
 * address has a map pin (searched or tapped), and the delivery fee is priced
 * by road from the kitchen to that pin — not to wherever the customer's phone
 * is right now. Addresses saved before pins existed ask for one.
 */
export default function FulfillmentSection({
  fulfillment,
  onFulfillmentChange,
  activeVendor,
  addresses,
  selectedAddressId,
  onSelectAddress,
  onAddAddress,
  onUpdateAddress,
  onError,
}) {
  const isPickup = fulfillment === 'pickup';
  const isDineIn = fulfillment === 'dine_in';

  // The address form: a new address, or `editingId` when pinning a saved one.
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const openNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setShowForm(true);
  };

  const openPin = (address) => {
    setEditingId(address.id);
    setForm({
      title: address.title || 'Home',
      area: address.district || '',
      street: address.street || '',
      coords: { lat: '', lng: '' },
      instructions: address.instructions || '',
    });
    setErrors({});
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setErrors({});
  };

  const handleSave = (e) => {
    e.preventDefault();
    const next = {};
    if (!form.area.trim()) next.area = 'Enter your area (e.g. Kicukiro, Nyamirambo).';
    if (!form.street.trim()) next.address = 'Enter your street or a landmark.';
    const lat = Number(form.coords.lat);
    const lng = Number(form.coords.lng);
    if (form.coords.lat === '' || form.coords.lng === '' || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      next.coords = 'Put the pin on your delivery spot: search your street, tap the map, or use your current location.';
    }
    setErrors(next);
    if (Object.keys(next).length) {
      onError(Object.values(next)[0]);
      return;
    }

    const saved = {
      title: form.title.trim() || 'Home',
      street: form.street.trim(),
      district: form.area.trim(),
      city: 'Kigali',
      instructions: form.instructions.trim(),
      lat,
      lng,
    };
    if (editingId) {
      onUpdateAddress(editingId, saved);
      onSelectAddress(editingId);
    } else {
      const created = onAddAddress(saved);
      if (created?.id) onSelectAddress(created.id);
    }
    closeForm();
    onError('');
  };

  return (
    <StepCard
      step={1}
      title={isDineIn ? 'At the restaurant' : isPickup ? 'Pickup at the kitchen' : 'Delivery Destination'}
      action={
        !isPickup && !isDineIn && !showForm && (
          <button
            onClick={openNew}
            className="text-xs font-bold text-[#542813] hover:underline flex items-center gap-1 whitespace-nowrap flex-shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Location</span>
          </button>
        )
      }
    >
      <div role="radiogroup" aria-label="How do you want to get your order?" className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
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

      {isDineIn ? (
        <DineInPanel activeVendor={activeVendor} />
      ) : isPickup ? (
        <div className="p-3.5 rounded-2xl bg-[#faf6f2] border border-[#ebd7c5] flex items-start gap-3 text-xs">
          <Store className="w-5 h-5 text-[#8a5332] flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-[#3d1b0c]">
              Collect from {activeVendor?.name || 'the kitchen'}
              {activeVendor?.location ? ` · ${activeVendor.location}` : ''}
            </p>
            <p className="text-stone-600 mt-0.5">
              Your 6-digit pickup code shows on your order page as soon as you order. We tell you when the food
              is ready; give the code at the counter to collect it.
            </p>
          </div>
        </div>
      ) : !showForm ? (
        <div className="space-y-2.5">
          {addresses && addresses.length > 0 ? (
            addresses.map((addr) => {
              const pinned = Boolean(addressPoint(addr));
              const selected = selectedAddressId === addr.id;
              return (
                <label
                  key={addr.id}
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition ${
                    selected
                      ? 'border-[#542813] bg-[#faf6f2] ring-1 ring-[#542813]/20 shadow-sm'
                      : 'border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="delivery_address"
                    checked={selected}
                    onChange={() => onSelectAddress(addr.id)}
                    className="mt-1 accent-[#542813]"
                  />
                  <div className="text-xs min-w-0">
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
                    {!pinned && (
                      <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-amber-800 font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>No map pin yet, so the delivery fee can't be calculated.</span>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            openPin(addr);
                          }}
                          className="underline font-bold"
                        >
                          Add the pin
                        </button>
                      </p>
                    )}
                  </div>
                </label>
              );
            })
          ) : (
            <div className="text-xs text-stone-500 space-y-2">
              <p>No saved addresses yet. Add where we should deliver:</p>
              <button
                type="button"
                onClick={openNew}
                className="inline-flex items-center gap-1 font-bold text-[#542813] hover:underline"
              >
                <Plus className="w-3.5 h-3.5" /> Add a delivery location
              </button>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSave} className="p-4 bg-stone-50 rounded-2xl space-y-3 border border-stone-200">
          <div className="font-bold text-xs text-stone-800">
            {editingId ? 'Pin this address on the map' : 'Add New Delivery Location'}
          </div>
          <p className="text-[11px] text-stone-500">
            The delivery fee is calculated by road from the kitchen to this pin, so put it where the food should arrive.
          </p>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value.slice(0, 40) }))}
            placeholder="Label (e.g. Home, Work)"
            className={inputClass(false)}
          />
          <KitchenLocationFields
            area={form.area}
            address={form.street}
            coords={form.coords}
            onChange={(patch) => {
              setErrors({});
              setForm((prev) => ({
                ...prev,
                ...(patch.area !== undefined ? { area: patch.area } : {}),
                ...(patch.address !== undefined ? { street: patch.address } : {}),
                ...(patch.coords !== undefined ? { coords: patch.coords } : {}),
              }));
            }}
            errors={errors}
            inputClass={inputClass}
            areaLabel="Area"
            addressLabel="Street / landmark"
            place="the delivery spot"
            placeSpot="the exact spot where the food should arrive"
            currentLocationHint="At the delivery address right now? Detect it. Ordering for somewhere else? Search the area and street, or tap the map."
          />
          <input
            type="text"
            value={form.instructions}
            onChange={(e) => setForm((prev) => ({ ...prev, instructions: e.target.value }))}
            placeholder="Delivery instructions for the delivery worker (e.g. Gate color, floor number)"
            className={inputClass(false)}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-gradient-to-r from-[#2b1206] to-[#542813] text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95"
            >
              {editingId ? 'Save Pin' : 'Save Address'}
            </button>
            <button
              type="button"
              onClick={closeForm}
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
