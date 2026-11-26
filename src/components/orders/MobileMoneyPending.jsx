import React, { useEffect, useState } from 'react';
import { Loader2, Smartphone } from 'lucide-react';
import { checkOrderPayment, payRemoteOrder } from '../../api/endpoints';

/**
 * Mobile money (Paypack): the order waits until the customer approves the
 * prompt on their phone. While it is out, the payment is checked every 5
 * seconds; a declined prompt can be sent again.
 *
 * @param {{order:Object, onChanged:Function}} props order: normalized
 */
export default function MobileMoneyPending({ order, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const waiting = order.payment.attempt === 'processing';

  useEffect(() => {
    if (!waiting) return undefined;
    const timer = setInterval(() => {
      checkOrderPayment(order.id).then(() => onChanged?.()).catch(() => {});
    }, 5000);
    return () => clearInterval(timer);
  }, [waiting, order.id, onChanged]);

  const retry = async () => {
    setBusy(true);
    setError('');
    try {
      await payRemoteOrder(order.id);
      await onChanged?.();
    } catch (err) {
      setError(err.message || 'The prompt could not be sent. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3 text-sm text-amber-900">
      {waiting ? <Loader2 className="w-5 h-5 animate-spin flex-shrink-0 mt-0.5" /> : <Smartphone className="w-5 h-5 flex-shrink-0 mt-0.5" />}
      <div className="space-y-2">
        <p className="font-semibold">
          {waiting
            ? `Approve the payment on your phone${order.payment.details?.phone ? ` (${order.payment.details.phone})` : ''}.`
            : 'The payment was not approved.'}
        </p>
        <p>{waiting ? 'Enter your mobile money PIN when the prompt appears. The kitchen gets your order as soon as it is paid.' : 'Your order waits until it is paid.'}</p>
        {!waiting && (
          <button type="button" onClick={retry} disabled={busy} className="rounded-xl bg-amber-900 px-4 py-2 font-bold text-white disabled:opacity-60">
            {busy ? 'Sending…' : 'Send the prompt again'}
          </button>
        )}
        {error && <p className="text-red-700">{error}</p>}
      </div>
    </div>
  );
}
