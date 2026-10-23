import React, { useState } from 'react';
import { Clock, Shapes } from 'lucide-react';
import { useVendor } from '../../context/VendorContext';
import VendorTypeBadge from '../common/VendorTypeBadge';
import { VENDOR_TYPES, getVendorType } from '../../data/vendorTypes';

/**
 * Vendor profile: the kitchen's current type and a request to change it. The
 * type only changes when an admin approves the request.
 */
export default function VendorTypeCard() {
  const { vendor, requestTypeChange, cancelTypeChange } = useVendor();
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!vendor) return null;
  const current = getVendorType(vendor.typeCode || vendor.type);
  const pending = vendor.typeRequest;

  const run = async (action) => {
    setBusy(true);
    setError('');
    try {
      await action();
      setOpen(false);
      setChoice('');
      setReason('');
    } catch (err) {
      setError(err?.message || 'Could not send your request.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-3xl bg-white border border-stone-200/80 shadow-sm p-5 sm:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
            <Shapes className="w-3.5 h-3.5" /> Vendor type
          </p>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <VendorTypeBadge type={current.code} size="md" />
            <span className="text-xs text-stone-500">{current.description}</span>
          </div>
          <p className="text-[11px] text-stone-400 mt-2">
            Customers can filter kitchens by type. You can still sell any kind of food.
          </p>
        </div>
        {!pending && !open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="px-4 py-2 rounded-xl border border-stone-200 bg-white text-xs font-bold text-stone-700 hover:bg-stone-100 transition"
          >
            Request a type change
          </button>
        )}
      </div>

      {pending && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3.5 flex items-start justify-between gap-3 flex-wrap">
          <div className="text-xs text-amber-900">
            <p className="font-bold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Waiting for an admin
            </p>
            <p className="mt-1 flex items-center gap-1.5 flex-wrap">
              You asked to become <VendorTypeBadge type={pending.code} size="xs" />
            </p>
            {pending.reason && <p className="mt-1 text-amber-800">“{pending.reason}”</p>}
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => cancelTypeChange())}
            className="px-3 py-1.5 rounded-xl bg-white border border-amber-200 text-xs font-bold text-amber-800 hover:bg-amber-100 transition disabled:opacity-60"
          >
            Withdraw request
          </button>
        </div>
      )}

      {open && !pending && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-2" role="radiogroup" aria-label="New vendor type">
            {VENDOR_TYPES.filter((type) => type.code !== current.code).map((type) => {
              const Icon = type.icon;
              const selected = choice === type.code;
              return (
                <button
                  key={type.code}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setChoice(type.code)}
                  className={`flex items-start gap-2.5 rounded-2xl border p-2.5 text-left transition ${
                    selected ? 'border-[#542813] bg-[#faf6f2] ring-2 ring-[#542813]/20' : 'border-stone-200 bg-white hover:bg-stone-50'
                  }`}
                >
                  <span className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center border ${type.badge}`}>
                    <Icon className="w-4 h-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-extrabold text-gray-900">{type.label}</span>
                    <span className="block text-[11px] text-stone-500 leading-snug">{type.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value.slice(0, 300))}
            rows={2}
            placeholder="Why are you changing? (optional)"
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200 focus:border-[#542813] outline-none"
          />
          {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!choice || busy}
              onClick={() => run(() => requestTypeChange(choice, reason.trim()))}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] text-white text-xs font-bold disabled:opacity-50"
            >
              {busy ? 'Sending…' : 'Send request'}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setError('');
              }}
              className="px-4 py-2 rounded-xl border border-stone-200 bg-white text-xs font-bold text-stone-700 hover:bg-stone-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && !open && <p className="text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
}
