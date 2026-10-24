import React, { useState } from 'react';
import { PackageCheck } from 'lucide-react';
import { useVendor } from '../../context/VendorContext';

/**
 * Pickup orders (the customer is at the counter) and orders the kitchen
 * brings itself (it is with the customer at the drop-off). The vendor enters the
 * 6-digit code the customer received, which completes the order and credits
 * the vendor's wallet.
 */
export default function ConfirmPickupForm({ order, onDone, className = '' }) {
  const { confirmPickup } = useVendor();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!order.canConfirmPickup) {
    return order.usesCode && order.status === 'Ready' && order.pickupAttemptsLeft === 0 ? (
      <p className={`text-[11px] font-semibold text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2 ${className}`}>
        Too many wrong codes. Contact support to complete this order.
      </p>
    ) : null;
  }

  const submit = async (event) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from the customer's phone.");
      return;
    }
    setBusy(true);
    setError('');
    try {
      await confirmPickup(order.id, code);
      setCode('');
      onDone?.();
    } catch (err) {
      setError(err?.message || 'Could not confirm the handover.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className={`rounded-2xl bg-emerald-50 border border-emerald-200 p-3 space-y-2 ${className}`}>
      <p className="text-[11px] font-bold text-emerald-900">
        {order.kitchenDelivers
          ? 'Handing the food over? Enter the code the customer received.'
          : 'Customer here to collect? Enter the pickup code they received.'}
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={code}
          onChange={(event) => {
            setCode(event.target.value.replace(/\D/g, '').slice(0, 6));
            setError('');
          }}
          placeholder="6-digit code"
          aria-label="Customer pickup code"
          className="flex-1 min-w-0 px-3 py-2 text-center tracking-[0.35em] font-mono text-sm rounded-xl border border-emerald-200 bg-white outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15"
        />
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition active:scale-95 disabled:opacity-60"
        >
          <PackageCheck className="w-4 h-4" />
          {busy ? 'Checking…' : order.kitchenDelivers ? 'Confirm delivered' : 'Confirm collected'}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-[11px] font-semibold text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}
