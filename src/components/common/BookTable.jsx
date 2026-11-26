import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Loader2, Minus, Plus, X } from 'lucide-react';
import ModalPortal from './ModalPortal';
import { fetchBookingSlots, createBooking } from '../../api/bookingApi';

const kigaliDay = (offset = 0) => new Date(Date.now() + 2 * 3600000 + offset * 86400000).toISOString().slice(0, 10);
const time = (d) => new Date(d).toLocaleTimeString('en-GB', { timeZone: 'Africa/Kigali', hour: '2-digit', minute: '2-digit' });
const dayLabel = (iso, i) => (i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }));
const money = (n) => `RWF ${Math.round(Number(n) || 0).toLocaleString('en-US')}`;

/**
 * Book a table at a kitchen: guests, day, a free time (the kitchen's real
 * free tables), name and phone. The guest is sent to their private booking
 * page, whose link lets them view or cancel it.
 */
export default function BookTable({ vendorId, kitchenName, onClose }) {
  const navigate = useNavigate();
  const [party, setParty] = useState(2);
  const [day, setDay] = useState(kigaliDay());
  const [slots, setSlots] = useState(null);
  const [slot, setSlot] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', special_requests: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const days = Array.from({ length: 7 }, (_, i) => kigaliDay(i));

  useEffect(() => {
    let alive = true;
    setSlots(null);
    setSlot('');
    fetchBookingSlots(vendorId, { date: day, party_size: party })
      .then((data) => alive && (setSlots(data), setError('')))
      .catch((err) => alive && (setSlots({ slots: [] }), setError(err.message)));
    return () => {
      alive = false;
    };
  }, [vendorId, day, party]);

  const book = async () => {
    setBusy(true);
    setError('');
    try {
      const booked = await createBooking(vendorId, { ...form, party_size: party, starts_at: slot });
      navigate(`/booking/${booked.token}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const max = slots?.rules?.max_party || 12;
  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Book a table">
        <div className="absolute inset-0 bg-[#1a0b04]/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full sm:max-w-lg max-h-[94vh] overflow-y-auto bg-[#fbf6ee] rounded-t-[2rem] sm:rounded-[2rem] p-6 kl-sheet">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#b5652b]">Reserve</p>
              <h3 className="font-display text-3xl text-[#2b1206]">A table at {kitchenName}</h3>
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full hover:bg-black/5 flex items-center justify-center"><X className="w-5 h-5" /></button>
          </div>

          <div className="mt-5 flex items-center justify-between rounded-2xl bg-white border border-[#ecdcc8] px-4 py-3">
            <span className="font-bold text-[#3b2416]">Guests</span>
            <div className="flex items-center gap-3">
              <button type="button" aria-label="Fewer guests" disabled={party <= 1} onClick={() => setParty(party - 1)} className="w-9 h-9 rounded-full border border-[#ecdcc8] flex items-center justify-center disabled:opacity-30"><Minus className="w-4 h-4" /></button>
              <span className="w-6 text-center font-black text-lg">{party}</span>
              <button type="button" aria-label="More guests" disabled={party >= max} onClick={() => setParty(party + 1)} className="w-9 h-9 rounded-full bg-[#2b1206] text-white flex items-center justify-center disabled:opacity-30"><Plus className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {days.map((d, i) => (
              <button key={d} type="button" onClick={() => setDay(d)} className={`flex-shrink-0 px-4 py-2.5 rounded-full text-sm font-bold border transition ${day === d ? 'bg-[#2b1206] text-white border-[#2b1206]' : 'bg-white text-[#3b2416] border-[#ecdcc8]'}`}>
                {dayLabel(d, i)}
              </button>
            ))}
          </div>

          <div className="mt-4 min-h-[88px]">
            {!slots ? (
              <div className="flex justify-center py-6 text-stone-400"><Loader2 className="w-5 h-5 animate-spin" /></div>
            ) : !slots.open ? (
              <p className="text-sm text-stone-500 text-center py-6">Closed that day.</p>
            ) : !slots.slots.some((s) => s.available) ? (
              <p className="text-sm text-stone-500 text-center py-6"><CalendarDays className="w-5 h-5 mx-auto mb-1" /> No table free for {party} that day. Try another day.</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {slots.slots.map((s) => (
                  <button key={s.starts_at} type="button" disabled={!s.available} onClick={() => setSlot(s.starts_at)} className={`py-2.5 rounded-xl text-sm font-bold border transition ${slot === s.starts_at ? 'bg-[#b5652b] text-white border-[#b5652b]' : s.available ? 'bg-white border-[#ecdcc8] text-[#3b2416] hover:border-[#b5652b]' : 'bg-transparent border-transparent text-stone-300 line-through'}`}>
                    {time(s.starts_at)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {slot && (
            <div className="mt-4 space-y-3 kl-rise">
              <input className="w-full px-4 py-3 rounded-2xl border border-[#ecdcc8] bg-white text-sm" placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={80} />
              <input className="w-full px-4 py-3 rounded-2xl border border-[#ecdcc8] bg-white text-sm" placeholder="Phone number" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={20} />
              <input className="w-full px-4 py-3 rounded-2xl border border-[#ecdcc8] bg-white text-sm" placeholder="Anything we should know? (optional)" value={form.special_requests} onChange={(e) => setForm({ ...form, special_requests: e.target.value })} maxLength={300} />
              {slots?.rules?.deposit_rwf > 0 && <p className="text-xs text-stone-600">A deposit of {money(slots.rules.deposit_rwf)} is asked, taken off your bill. Cancel at least {slots.rules.refund_deposit_hours} hours before to get it back.</p>}
              {slots?.rules?.requires_confirmation && <p className="text-xs text-stone-500">The kitchen confirms your booking; you can follow it on the next page.</p>}
            </div>
          )}

          {error && <p className="mt-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold px-3 py-2">{error}</p>}
          <button type="button" disabled={!slot || busy || form.name.trim().length < 2 || form.phone.trim().length < 9} onClick={book} className="mt-5 w-full py-3.5 rounded-full bg-[#2b1206] text-white font-bold disabled:opacity-40 inline-flex items-center justify-center gap-2 transition hover:bg-[#4a2210]">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Book the table
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}
