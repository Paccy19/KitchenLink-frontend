import React, { useState } from 'react';
import { CalendarClock, Clock, Megaphone, Trash2 } from 'lucide-react';
import { useVendor } from '../../context/VendorContext';
import { useToast } from '../common/Toast';
import { formatScheduledFor } from '../../utils/schedule';

const pad = (value) => String(value).padStart(2, '0');

/** Date → value for an <input type="datetime-local"> (local time, no seconds). */
const toLocalInput = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

const defaultCutoff = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(10, 0, 0, 0);
  return toLocalInput(date);
};

const defaultDelivery = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(12, 30, 0, 0);
  return toLocalInput(date);
};

/**
 * "Tomorrow's Special" composer for the vendor dashboard. Publishing an
 * announcement makes the kitchen appear in the customer pre-order feed until
 * the order-before time passes.
 */
export default function SpecialComposer() {
  const { special, saveSpecial, clearSpecial } = useVendor();
  const toast = useToast();

  const [text, setText] = useState('');
  const [cutoffAt, setCutoffAt] = useState(defaultCutoff);
  const [deliveryAt, setDeliveryAt] = useState(defaultDelivery);
  const [busy, setBusy] = useState(false);

  const handleSave = async (event) => {
    event.preventDefault();
    if (text.trim().length < 2) {
      toast.error('Describe your special in a few words.');
      return;
    }
    setBusy(true);
    try {
      await saveSpecial({
        text: text.trim(),
        cutoffAt: new Date(cutoffAt).toISOString(),
        deliveryAt: new Date(deliveryAt).toISOString(),
      });
      setText('');
      toast.success('Special published — customers can pre-order it now.');
    } catch (error) {
      toast.error(error.message || 'Could not publish your special.');
    } finally {
      setBusy(false);
    }
  };

  const handleClear = async () => {
    setBusy(true);
    try {
      await clearSpecial();
      toast.info('Special removed from the feed.');
    } catch (error) {
      toast.error(error.message || 'Could not remove your special.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-xl bg-[#f5f6e9] border border-[#d9dcc0] flex items-center justify-center">
          <Megaphone className="w-4 h-4 text-[#6b6f3a]" />
        </div>
        <h3 className="font-black text-base text-gray-900">Tomorrow's Special</h3>
      </div>
      <p className="text-[11px] text-stone-400 font-medium mb-4">
        Announce a dish or deal. Customers pre-order it and pay now; it appears in their
        feed until your order-before time.
      </p>

      {special && (
        <div className="mb-4 rounded-2xl bg-gradient-to-br from-[#f5f6e9] to-[#eef0dc] border border-[#d9dcc0] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-[#2b3317]">{special.text}</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-[11px] font-semibold text-stone-600">
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#8a5332]" />
                  Before {formatScheduledFor(special.cutoffAt)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="w-3.5 h-3.5 text-[#8a5332]" />
                  Arrives {formatScheduledFor(special.deliveryAt)}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClear}
              disabled={busy}
              className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white border border-rose-100 text-rose-600 text-xs font-bold hover:bg-rose-50 transition disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove
            </button>
          </div>
          {!special.isOrderable && (
            <p className="text-[11px] font-bold text-amber-700 mt-2">
              The order-before time has passed — publish a new special to re-appear in the feed.
            </p>
          )}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-3">
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
            What are you offering?
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={160}
            rows={2}
            placeholder="e.g. Fresh tilapia with plantain — limited plates!"
            className="mt-1 w-full text-sm rounded-xl border border-stone-200 p-3 outline-none focus:border-[#542813] resize-none"
          />
          <p className="text-[10px] text-stone-400 mt-1 text-right">{text.length}/160</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Order before
            </span>
            <input
              type="datetime-local"
              value={cutoffAt}
              onChange={(e) => setCutoffAt(e.target.value)}
              className="mt-1 w-full text-sm rounded-xl border border-stone-200 p-2.5 outline-none focus:border-[#542813]"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Delivered by
            </span>
            <input
              type="datetime-local"
              value={deliveryAt}
              onChange={(e) => setDeliveryAt(e.target.value)}
              className="mt-1 w-full text-sm rounded-xl border border-stone-200 p-2.5 outline-none focus:border-[#542813]"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] text-white font-bold text-sm shadow-md shadow-[#2b1206]/20 transition active:scale-95 disabled:opacity-60"
        >
          {busy ? 'Publishing…' : special ? 'Update special' : 'Publish special'}
        </button>
      </form>
    </div>
  );
}