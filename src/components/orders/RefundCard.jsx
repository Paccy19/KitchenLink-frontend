import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { RotateCcw, CheckCircle2, AlertTriangle, Clock, Smartphone, CreditCard } from 'lucide-react';
import { changeRefundDestination } from '../../api/endpoints';

const formatRwf = (amount) => `${Number(amount || 0).toLocaleString('en-US')} RWF`;

const TONE = {
  pending: { box: 'border-sky-200 bg-sky-50', text: 'text-sky-900', icon: Clock },
  completed: { box: 'border-emerald-200 bg-emerald-50', text: 'text-emerald-900', icon: CheckCircle2 },
  failed: { box: 'border-rose-200 bg-rose-50', text: 'text-rose-900', icon: AlertTriangle },
};

/**
 * The refund of a cancelled paid order: where the money goes, its progress,
 * and (until it is sent) a way to give another mobile money number.
 */
export default function RefundCard({ orderId, refund, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!refund) return null;

  const tone = TONE[refund.status] || TONE.pending;
  const Icon = tone.icon;
  const DestIcon = refund.destination.type === 'card' ? CreditCard : Smartphone;

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await changeRefundDestination(orderId, phone.trim());
      setEditing(false);
      setPhone('');
      await onChanged?.();
    } catch (failure) {
      setError(failure?.message || 'Could not save the number.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`mt-4 rounded-2xl border px-4 py-4 ${tone.box}`}>
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-xl bg-white/70 flex items-center justify-center flex-shrink-0">
          <Icon className={`w-5 h-5 ${tone.text}`} />
        </span>
        <div className={`min-w-0 flex-1 ${tone.text}`}>
          <p className="text-sm font-black flex items-center gap-1.5">
            <RotateCcw className="w-4 h-4" /> {refund.status_label}: {formatRwf(refund.amount_rwf)}
          </p>
          <p className="text-xs mt-1 flex items-center gap-1.5">
            <DestIcon className="w-3.5 h-3.5" />
            {refund.status === 'completed' ? 'Sent to' : 'Going back to'} your {refund.destination.label}
          </p>
          {refund.status === 'pending' && (
            <p className="text-xs mt-1">
              Your money is on its way back. It usually arrives within {refund.expected_within_hours} hours.
            </p>
          )}
          {refund.status === 'completed' && (
            <p className="text-xs mt-1">
              Sent {refund.completed_at ? new Date(refund.completed_at).toLocaleString() : ''}
              {refund.reference ? ` · Transaction ref ${refund.reference}` : ''}
            </p>
          )}
          {refund.status === 'failed' && (
            <p className="text-xs mt-1 font-semibold">
              We could not send it{refund.failure_reason ? `: ${refund.failure_reason}` : '.'} Give us another mobile
              money number below.
            </p>
          )}

          {refund.can_change_destination && !editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="mt-2 text-xs font-bold underline underline-offset-2"
            >
              {refund.status === 'failed' ? 'Send it to another number' : 'Send it to a different mobile money number'}
            </button>
          )}
          {editing && (
            <form onSubmit={save} className="mt-3 flex flex-col sm:flex-row gap-2">
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                inputMode="tel"
                placeholder="MTN or Airtel number, e.g. 0788123456"
                required
                className="flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-gray-900"
              />
              <div className="flex gap-2">
                <button type="submit" disabled={busy} className="px-4 py-2 rounded-xl bg-[#542813] text-white text-xs font-bold disabled:opacity-60">
                  {busy ? 'Saving…' : 'Save number'}
                </button>
                <button type="button" onClick={() => setEditing(false)} className="px-3 py-2 rounded-xl bg-white border border-stone-200 text-xs font-bold text-stone-700">
                  Cancel
                </button>
              </div>
            </form>
          )}
          {error && <p className="mt-2 text-xs font-semibold text-rose-700">{error}</p>}
          <Link to={`/support?order=${orderId}`} className="mt-2 block text-[11px] font-bold opacity-80 hover:opacity-100">
            Problem with this refund? Contact support →
          </Link>
        </div>
      </div>
    </div>
  );
}
