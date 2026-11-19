import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ShieldCheck, AlertTriangle } from 'lucide-react';
import { resendDeliveryCode } from '../../api/endpoints';

/**
 * Where the customer's delivery confirmation code went. The code itself is
 * never shown in the app: it is sent only to the customer's verified email
 * (or by SMS), and the customer gives it to the delivery worker once their
 * food is in their hands. "Send my delivery code" sends a new one.
 */
export default function DeliveryCodeCard({ order }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sentTo, setSentTo] = useState('');

  if (order.deliveryConfirmed || !order.deliveryCodeIssued) return null;
  const needsChannel = order.deliveryCodeNeedsChannel && !sentTo;
  const where = sentTo || order.deliveryCodeSentTo;

  const resend = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await resendDeliveryCode(order.id);
      setSentTo(result.sent_to || '');
      setMessage(`A new code was sent${result.sent_to ? ` to ${result.sent_to}` : ''}. The previous code no longer works.`);
    } catch (err) {
      setError(err?.message || 'Could not send the code.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`mb-8 rounded-3xl border-2 border-dashed p-6 sm:p-8 relative overflow-hidden ${needsChannel ? 'border-amber-300 bg-amber-50' : 'border-[#6d391d]/40 bg-gradient-to-br from-[#fff7ee] to-[#faf6f2]'}`}>
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#2b1206] via-[#8a5332] to-[#2b1206]" />
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-[#6d391d]">
        <ShieldCheck className="w-3.5 h-3.5" />
        Delivery confirmation code
      </div>
      {needsChannel ? (
        <div className="mt-3 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-stone-700 font-medium leading-relaxed">
            We couldn&apos;t send your code: your account has no verified email.{' '}
            <Link to="/profile" className="font-bold underline text-[#542813]">Add and verify your email</Link>, then tap
            &quot;Send my delivery code&quot;.
          </p>
        </div>
      ) : (
        <div className="mt-3 flex items-start gap-3">
          <Mail className="w-5 h-5 text-[#6d391d] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-stone-700 font-medium leading-relaxed">
            We sent your code {order.deliveryCodeSentVia === 'sms' && !sentTo ? 'by SMS' : 'by email'}
            {where ? <> to <strong className="text-gray-900">{where}</strong></> : null}. Give it to the delivery worker only after you
            receive your food. Never share it before.
          </p>
        </div>
      )}
      {message && <p className="mt-3 text-xs font-semibold text-emerald-700">{message}</p>}
      {error && <p className="mt-3 text-xs font-semibold text-red-600">{error}</p>}
      {order.canResendDeliveryCode && (
        <button
          type="button"
          onClick={resend}
          disabled={busy}
          className="mt-4 px-4 py-2 rounded-xl bg-white border border-[#ebd7c5] text-[#3d1b0c] font-bold text-xs hover:bg-[#faf6f2] transition active:scale-95 disabled:opacity-60"
        >
          {busy ? 'Sending…' : 'Send my delivery code'}
        </button>
      )}
    </div>
  );
}
