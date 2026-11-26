import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarCheck, Users, Clock, MapPin, Loader2, XCircle } from 'lucide-react';
import { fetchBooking, cancelBooking } from '../api/bookingApi';

const STATUS = {
  pending: ['Waiting for the kitchen to confirm', 'bg-amber-50 text-amber-800 border-amber-200'],
  confirmed: ['Confirmed', 'bg-emerald-50 text-emerald-700 border-emerald-200'],
  arrived: ['You have arrived', 'bg-emerald-50 text-emerald-700 border-emerald-200'],
  seated: ['Enjoy your meal', 'bg-emerald-50 text-emerald-700 border-emerald-200'],
  completed: ['Thank you for coming', 'bg-stone-100 text-stone-600 border-stone-200'],
  cancelled: ['Cancelled', 'bg-red-50 text-red-700 border-red-200'],
  rejected: ['The kitchen could not take this booking', 'bg-red-50 text-red-700 border-red-200'],
  no_show: ['Missed', 'bg-stone-100 text-stone-600 border-stone-200'],
};
const money = (n) => `RWF ${Math.round(Number(n) || 0).toLocaleString('en-US')}`;
const when = (d) => new Date(d).toLocaleString('en-GB', { timeZone: 'Africa/Kigali', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

/** A guest's own booking, opened from the private link they got when booking. */
export default function BookingPage() {
  const { token } = useParams();
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchBooking(token).then(setBooking).catch((err) => setError(err.message));
  }, [token]);

  const cancel = async () => {
    if (!window.confirm('Cancel this booking?')) return;
    setBusy(true);
    try {
      setBooking(await cancelBooking(token));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!booking && !error) return <div className="min-h-[60vh] flex items-center justify-center text-stone-400"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  return (
    <div className="kl-page min-h-screen bg-[#fbf6ee] px-4 py-10">
      <div className="max-w-lg mx-auto kl-rise">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#b5652b] text-center">Your table</p>
        <h1 className="font-display text-4xl text-[#2b1206] text-center mt-2">{booking?.kitchen?.name || 'Booking'}</h1>
        {error && <p className="mt-6 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold px-4 py-3 text-center">{error}</p>}
        {booking && (
          <div className="mt-8 rounded-[2rem] bg-white border border-[#ecdcc8] shadow-[0_20px_60px_-30px_rgba(43,18,6,0.35)] p-6 space-y-5">
            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${STATUS[booking.status]?.[1]}`}>{STATUS[booking.status]?.[0] || booking.status}</span>
            <div className="space-y-3 text-[#3b2416]">
              <p className="flex items-center gap-3"><CalendarCheck className="w-5 h-5 text-[#b5652b]" /> {when(booking.starts_at)}</p>
              <p className="flex items-center gap-3"><Users className="w-5 h-5 text-[#b5652b]" /> {booking.party_size} guest{booking.party_size === 1 ? '' : 's'}</p>
              <p className="flex items-center gap-3"><Clock className="w-5 h-5 text-[#b5652b]" /> About {booking.duration_minutes} minutes</p>
              {booking.kitchen?.address && <p className="flex items-center gap-3"><MapPin className="w-5 h-5 text-[#b5652b]" /> {booking.kitchen.address}</p>}
            </div>
            {booking.preorder_items?.length > 0 && (
              <div className="rounded-2xl bg-[#fbf6ee] p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-[#8a5a3b]">Ordered ahead</p>
                <p className="text-sm mt-1">{booking.preorder_items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}</p>
                <p className="text-[11px] text-stone-500 mt-1">Prepared when you are seated.</p>
              </div>
            )}
            {booking.deposit?.required_rwf > 0 && (
              <p className="text-sm text-stone-600">
                Deposit: <b>{money(booking.deposit.required_rwf)}</b>{' '}
                {booking.deposit.status === 'paid' ? '(paid, taken off your bill)' : booking.deposit.status === 'required' ? '(to pay at the kitchen)' : `(${booking.deposit.status})`}. Cancel at least {booking.refund_deposit_hours} hours before to get it back.
              </p>
            )}
            {booking.special_requests && <p className="text-sm text-stone-600">“{booking.special_requests}”</p>}
            <p className="text-[11px] text-stone-400">Keep this link: it is the only way to view or cancel your booking.</p>
            <div className="flex gap-3">
              <Link to={`/vendor/${booking.kitchen.id}`} className="flex-1 text-center px-4 py-3 rounded-full border border-[#2b1206] text-[#2b1206] font-bold text-sm hover:bg-[#2b1206] hover:text-white transition">View the menu</Link>
              {booking.can_cancel && (
                <button type="button" disabled={busy} onClick={cancel} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-white border border-red-200 text-red-600 font-bold text-sm hover:bg-red-50 disabled:opacity-50">
                  <XCircle className="w-4 h-4" /> Cancel booking
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
