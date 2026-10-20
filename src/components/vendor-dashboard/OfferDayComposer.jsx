import React, { useCallback, useEffect, useState } from 'react';
import { BellRing, CalendarDays, Gift, Trash2 } from 'lucide-react';
import { vendorApi } from '../../api/vendorApi';
import { useToast } from '../common/Toast';
import { dayFromToday, formatOfferDay, offerCountdown } from '../../utils/offerDays';

const MAX_UPCOMING = 3;

/**
 * "Offer Day" composer for the vendor dashboard — a second kind of special,
 * separate from Tomorrow's Special: the vendor picks any future day and
 * announces a deal for it. Clients are alerted when it is published and again
 * the day before.
 */
export default function OfferDayComposer() {
  const toast = useToast();
  const [offers, setOffers] = useState([]);
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [offerDate, setOfferDate] = useState(() => dayFromToday(1));
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setOffers(await vendorApi.offers());
    } catch {
      /* the list is best-effort; the form still works */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (event) => {
    event.preventDefault();
    if (title.trim().length < 2) {
      toast.error('Describe your offer in a few words.');
      return;
    }
    setBusy(true);
    try {
      await vendorApi.createOffer({ title: title.trim(), details: details.trim(), offerDate });
      setTitle('');
      setDetails('');
      await load();
      toast.success(`Offer set for ${formatOfferDay(offerDate, { long: true })} — your clients are being alerted.`);
    } catch (error) {
      toast.error(error.message || 'Could not save your offer.');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (offer) => {
    setBusy(true);
    try {
      await vendorApi.cancelOffer(offer.id);
      setOffers((current) => current.filter((item) => item.id !== offer.id));
      toast.info('Offer removed.');
    } catch (error) {
      toast.error(error.message || 'Could not remove this offer.');
    } finally {
      setBusy(false);
    }
  };

  const full = offers.length >= MAX_UPCOMING;

  return (
    <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
          <Gift className="w-4 h-4 text-amber-700" />
        </div>
        <h3 className="font-black text-base text-gray-900">Offer Day</h3>
      </div>
      <p className="text-[11px] text-stone-400 font-medium mb-4">
        Pick a day and announce a deal for your clients. It shows in Tomorrow's Specials, and your
        clients get an alert now and again the day before.
      </p>

      {offers.length > 0 && (
        <ul className="mb-4 space-y-2">
          {offers.map((offer) => (
            <li
              key={offer.id}
              className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-3.5 flex items-start justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-wide text-amber-800 flex items-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5" />
                  {formatOfferDay(offer.offer_date, { long: true })} · {offerCountdown(offer.offer_date)}
                </p>
                <p className="text-sm font-extrabold text-gray-900 mt-0.5">{offer.title}</p>
                {offer.details && <p className="text-xs text-stone-600 mt-0.5">{offer.details}</p>}
              </div>
              <button
                type="button"
                onClick={() => handleRemove(offer)}
                disabled={busy}
                className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white border border-rose-100 text-rose-600 text-xs font-bold hover:bg-rose-50 transition disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {full ? (
        <p className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          You have {MAX_UPCOMING} upcoming offer days. Remove one to add another.
        </p>
      ) : (
        <form onSubmit={handleSave} className="space-y-3">
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Offer day</span>
            <input
              type="date"
              value={offerDate}
              min={dayFromToday(1)}
              max={dayFromToday(60)}
              onChange={(e) => setOfferDate(e.target.value)}
              required
              className="mt-1 w-full text-sm rounded-xl border border-stone-200 p-2.5 outline-none focus:border-[#542813]"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">The offer</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              placeholder="e.g. 20% off all brochettes"
              className="mt-1 w-full text-sm rounded-xl border border-stone-200 p-2.5 outline-none focus:border-[#542813]"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Details <span className="normal-case font-medium text-stone-400">(optional)</span>
            </span>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={300}
              rows={2}
              placeholder="e.g. All day, dine-in and delivery. Free juice with every family platter."
              className="mt-1 w-full text-sm rounded-xl border border-stone-200 p-3 outline-none focus:border-[#542813] resize-none"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] text-white font-bold text-sm shadow-md shadow-[#2b1206]/20 transition active:scale-95 disabled:opacity-60"
          >
            <BellRing className="w-4 h-4" />
            {busy ? 'Saving…' : 'Set offer day & alert clients'}
          </button>
        </form>
      )}
    </div>
  );
}
