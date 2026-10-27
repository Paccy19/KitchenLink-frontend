import React, { useState } from 'react';
import { CalendarClock, CheckCircle2, Loader2 } from 'lucide-react';
import { payEventBalance } from '../../api/endpoints';

const rwf = (value) => `${Math.round(Number(value) || 0).toLocaleString()} RWF`;
const when = (value) =>
  new Date(value).toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/**
 * Big events are paid in two parts: half when ordering (the deposit) and the
 * balance a day before the event. Shows what is paid, what is still due and
 * by when, and lets the customer pay the balance (with the method they used
 * for the deposit). Paying it sends the customer their handover code; the
 * kitchen hands the food over only once it is paid.
 *
 * @param {{orderId:string, deposit:Object, paymentLabel?:string, onPaid:Function}} props deposit: raw API shape
 */
export default function EventBalanceCard({ orderId, deposit, paymentLabel = '', onPaid }) {
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const paid = Boolean(deposit.balance_paid_at);

  const pay = async () => {
    setPaying(true);
    setError('');
    try {
      await payEventBalance(orderId);
      await onPaid?.();
    } catch (err) {
      setError(err.message || 'The payment did not go through. Please try again.');
    } finally {
      setPaying(false);
    }
  };

  if (paid) {
    return (
      <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-start gap-3 text-sm">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
        <p className="text-emerald-900">
          <span className="font-black">Fully paid.</span> Deposit {rwf(deposit.deposit_rwf)} and balance {rwf(deposit.balance_rwf)} received.
          Your code is below — give it to the kitchen when the food is handed over.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`mt-6 rounded-2xl border px-4 py-4 space-y-3 ${
        deposit.overdue ? 'border-red-200 bg-red-50' : 'border-[#ebd7c5] bg-[#faf6f2]'
      }`}
    >
      <div className="flex items-start gap-3">
        <CalendarClock className={`w-5 h-5 flex-shrink-0 mt-0.5 ${deposit.overdue ? 'text-red-600' : 'text-[#8a5332]'}`} />
        <div className="text-sm">
          <p className={`font-black ${deposit.overdue ? 'text-red-800' : 'text-[#3d1b0c]'}`}>
            {deposit.overdue ? 'Your balance is overdue' : 'Pay the balance before your event'}
          </p>
          <p className="text-stone-700 mt-0.5">
            Deposit paid: <strong>{rwf(deposit.amount_paid_rwf)}</strong>. Balance <strong>{rwf(deposit.balance_rwf)}</strong>{' '}
            {deposit.overdue ? 'was due' : 'is due by'} <strong>{when(deposit.balance_due_at)}</strong>.
          </p>
          <p className="text-[11px] text-stone-500 mt-1">
            Once the balance is paid you'll get your 6-digit code. The kitchen hands over your food when you give it to them.
          </p>
        </div>
      </div>
      {deposit.can_pay_balance && (
        <button
          type="button"
          onClick={pay}
          disabled={paying}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#542813] text-white text-sm font-black hover:bg-[#2b1206] transition disabled:opacity-60 inline-flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          {paying && <Loader2 className="w-4 h-4 animate-spin" />}
          {paying ? 'Paying…' : `Pay balance · ${rwf(deposit.balance_rwf)}`}
        </button>
      )}
      {paymentLabel && deposit.can_pay_balance && (
        <p className="text-[11px] text-stone-500">Paid with {paymentLabel}, like your deposit.</p>
      )}
      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
}
