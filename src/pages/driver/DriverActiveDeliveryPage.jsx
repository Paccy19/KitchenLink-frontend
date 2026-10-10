import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Store,
  User,
  PackageOpen,
  Phone,
  Navigation,
  ArrowRight,
  Camera,
  X,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { useDriver } from '../../context/DriverContext';
import { CONTEXT_ACTIONS } from '../../data/driverOptions';
import DriverStatusStepper from '../../components/driver-dashboard/DriverStatusStepper';
import RoutePanel from '../../components/driver-dashboard/RoutePanel';
import EmptyState from '../../components/common/EmptyState';
import { useToast } from '../../components/common/Toast';

function ConfirmDeliveryModal({ delivery, onClose }) {
  const toast = useToast();
  const { confirmDelivery } = useDriver();
  const [otpCode, setOtpCode] = useState('');
  const [photoBase64, setPhotoBase64] = useState('');
  const [busy, setBusyState] = useState(false);

  const handlePhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoBase64(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    if (!/^\d{6}$/.test(otpCode)) {
      toast.error('Enter the 6-digit delivery code from the customer');
      return;
    }
    setBusyState(true);
    try {
      await confirmDelivery(delivery.id, { otpCode, photoBase64 });
      onClose();
    } finally {
      setBusyState(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-white sm:rounded-3xl rounded-t-3xl p-6 shadow-2xl space-y-4 animate-fade-in">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-gray-900">Confirm delivery</h3>
            <p className="text-xs text-stone-500 font-medium">
              Ask the customer for their 6-digit delivery code.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full text-stone-500 hover:bg-stone-100 flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-[#f5f8f2] border border-[#d9e5d0] p-3">
          <ShieldCheck className="w-5 h-5 text-[#3b5327]" />
          <p className="text-xs text-stone-600 font-medium">
            This code proves the order reached the right customer and releases your earnings.
          </p>
        </div>

        {delivery.otpCode && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 font-medium">
            Development code: <strong>{delivery.otpCode}</strong>
          </p>
        )}

        <div>
          <label className="text-xs font-bold text-stone-500 block mb-1.5">Delivery code</label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={otpCode}
            onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="6-digit code"
            className="w-full px-3 py-3 text-center tracking-[0.5em] text-lg rounded-xl border border-stone-200 focus:border-[#3b5327] focus:ring-2 focus:ring-[#3b5327]/10 outline-none"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-stone-500 block mb-1.5">
            Delivery photo <span className="font-medium text-stone-400">(optional)</span>
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-dashed border-stone-300 px-4 py-3 cursor-pointer hover:bg-stone-50 transition">
            <Camera className="w-5 h-5 text-[#3b5327]" />
            <span className="text-sm font-bold text-stone-600">
              {photoBase64 ? 'Photo attached' : 'Tap to capture a proof photo'}
            </span>
            <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
          </label>
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-[#1c2b12] text-white font-black text-sm shadow-md transition active:scale-95 disabled:opacity-60"
        >
          <CheckCircle2 className="w-5 h-5" />
          {busy ? 'Confirming…' : 'Complete delivery & release earnings'}
        </button>
      </div>
    </div>
  );
}

export default function DriverActiveDeliveryPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { activeDelivery, updateStatus } = useDriver();
  const [busy, setBusy] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const action = useMemo(
    () => (activeDelivery ? CONTEXT_ACTIONS[activeDelivery.status] : null),
    [activeDelivery],
  );

  if (!activeDelivery) {
    return (
      <EmptyState
        icon={<PackageOpen className="w-8 h-8 text-[#3b5327]" />}
        title="No active delivery"
        message="You have no delivery in progress. Accept a nearby offer from the dashboard to begin."
        actionLabel="Back to dashboard"
        onAction={() => navigate('/driver-dashboard')}
      />
    );
  }

  const handleAction = async () => {
    if (!action) return;
    if (activeDelivery.status === 'out_for_delivery') {
      setShowModal(true);
      return;
    }
    setBusy(true);
    try {
      await updateStatus(activeDelivery.id, action.to);
      toast.success(action.to === 'picked_up' ? 'Pickup confirmed — thanks!' : 'Status updated');
    } catch {
      /* toast handles errors */
    } finally {
      setBusy(false);
    }
  };

  const googleMapsVendor = activeDelivery.vendor.latitude != null
    ? `https://www.google.com/maps/dir/?api=1&destination=${activeDelivery.vendor.latitude},${activeDelivery.vendor.longitude}&travelmode=driving`
    : '';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Order {activeDelivery.orderNumber}
          </h1>
          <p className="text-sm font-medium text-stone-500">
            Status: <span className="font-black text-[#3b5327]">{activeDelivery.statusLabel}</span>
          </p>
        </div>
        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-black">
          <Navigation className="w-4 h-4" />
          {activeDelivery.promisedEarnings.toLocaleString()} RWF your payout
        </span>
      </div>

      <DriverStatusStepper status={activeDelivery.status} />

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          {/* Vendor */}
          <div className="rounded-3xl bg-white border border-stone-200/80 shadow-sm p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Pickup · Vendor</p>
              {activeDelivery.vendor.phone && (
                <a href={`tel:${activeDelivery.vendor.phone}`} className="inline-flex items-center gap-1.5 text-xs font-bold text-[#3b5327]">
                  <Phone className="w-3.5 h-3.5" /> Call vendor
                </a>
              )}
            </div>
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                <Store className="w-5 h-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-extrabold text-gray-900 truncate">{activeDelivery.vendor.name}</p>
                <p className="text-sm text-stone-500">{activeDelivery.pickup.address || 'Vendor location'}</p>
                <p className="text-xs text-stone-400">{activeDelivery.pickup.neighborhood}</p>
              </div>
              {googleMapsVendor && (
                <a
                  href={googleMapsVendor}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-stone-100 text-stone-600 text-xs font-bold hover:bg-stone-200 transition"
                >
                  <Navigation className="w-3.5 h-3.5" /> Navigate
                </a>
              )}
            </div>
          </div>

          {/* Customer */}
          <div className="rounded-3xl bg-white border border-stone-200/80 shadow-sm p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Drop-off · Customer</p>
              {activeDelivery.customer.phone && (
                <a href={`tel:${activeDelivery.customer.phone}`} className="inline-flex items-center gap-1.5 text-xs font-bold text-[#3b5327]">
                  <Phone className="w-3.5 h-3.5" /> Call customer
                </a>
              )}
            </div>
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-extrabold text-gray-900 truncate">{activeDelivery.customer.name}</p>
                <p className="text-sm text-stone-500">{activeDelivery.dropoff.address || 'Customer location'}</p>
                <p className="text-xs text-stone-400">{activeDelivery.dropoff.neighborhood}</p>
              </div>
              {activeDelivery.routeDistanceKm != null && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-stone-100 text-stone-600 text-xs font-bold">
                  {activeDelivery.routeDistanceKm.toFixed(1)} km
                </span>
              )}
            </div>
          </div>

          {/* Items */}
          <div className="rounded-3xl bg-white border border-stone-200/80 shadow-sm p-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-3">Order contents</p>
            {activeDelivery.items.length === 0 ? (
              <p className="text-sm text-stone-500">No item details available.</p>
            ) : (
              <ul className="divide-y divide-stone-100">
                {activeDelivery.items.map((item, index) => (
                  <li key={`${item.name}-${index}`} className="py-2.5 flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-stone-100 text-stone-700 text-xs font-black flex items-center justify-center flex-shrink-0">
                      {item.quantity}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-gray-800 truncate">{item.name}</p>
                      {item.options && <p className="text-xs text-stone-400 truncate">{item.options}</p>}
                    </div>
                    <span className="text-sm font-bold text-stone-600">{(item.price * item.quantity).toLocaleString()} RWF</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <RoutePanel
            pickup={{
              lat: activeDelivery.vendor.latitude,
              lng: activeDelivery.vendor.longitude,
            }}
            dropoff={{
              lat: activeDelivery.dropoff.latitude,
              lng: activeDelivery.dropoff.longitude,
            }}
          />

          {action ? (
            <div className="rounded-3xl bg-white border border-stone-200/80 shadow-sm p-5 space-y-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Next step</p>
                <p className="mt-1 text-sm font-bold text-stone-600">{action.hint}</p>
              </div>
              <button
                type="button"
                onClick={handleAction}
                disabled={busy}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-[#1c2b12] via-[#3b5327] to-[#12200b] text-white font-black text-sm shadow-md transition active:scale-95 disabled:opacity-60"
              >
                <ArrowRight className="w-4 h-4" />
                {busy ? 'Updating…' : action.label}
              </button>
              {activeDelivery.status === 'out_for_delivery' && (
                <p className="text-xs text-stone-400 font-medium text-center">
                  A delivery code + optional photo are required to finish.
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-3xl bg-emerald-50 border border-emerald-200 p-5 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
              <p className="text-sm font-bold text-emerald-800">
                {activeDelivery.status === 'completed'
                  ? 'This delivery is completed. See your payout in Earnings.'
                  : 'This delivery is finished.'}
              </p>
            </div>
          )}

          <Link
            to="/driver-dashboard"
            className="block text-center text-xs font-bold text-stone-500 hover:text-[#3b5327]"
          >
            ← Back to dashboard
          </Link>
        </div>
      </div>

      {showModal && (
        <ConfirmDeliveryModal
          delivery={activeDelivery}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}