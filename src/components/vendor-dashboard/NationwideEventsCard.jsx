import React, { useCallback, useEffect, useState } from 'react';
import { Globe2 } from 'lucide-react';
import { vendorApi } from '../../api/vendorApi';
import { useToast } from '../common/Toast';

/**
 * Nationwide events: whether customers anywhere in Rwanda can order from this
 * kitchen (Caterers by type, others when an admin switches it on), and the
 * kitchen's own travel fee for orders beyond the delivery workers' range,
 * which it brings itself and keeps in full.
 */
export default function NationwideEventsCard() {
  const toast = useToast();
  const [info, setInfo] = useState(null);
  const [base, setBase] = useState('');
  const [perKm, setPerKm] = useState('');
  const [busy, setBusy] = useState(false);

  const apply = useCallback((next) => {
    if (!next) return;
    setInfo(next);
    setBase(String(next.travel_base_fee_rwf ?? 0));
    setPerKm(String(next.travel_per_km_rwf ?? 0));
  }, []);

  useEffect(() => {
    let alive = true;
    vendorApi
      .nationwide()
      .then((next) => alive && apply(next))
      .catch(() => {
        /* the card stays hidden when the API is unavailable */
      });
    return () => {
      alive = false;
    };
  }, [apply]);

  if (!info) return null;

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      apply(await vendorApi.saveNationwide({ travel_base_fee_rwf: Number(base) || 0, travel_per_km_rwf: Number(perKm) || 0 }));
      toast.success('Travel fee saved.');
    } catch (error) {
      toast.error(error.message || 'Could not save your travel fee.');
    } finally {
      setBusy(false);
    }
  };

  const maxKm = info.platform_delivery_max_km;
  const exampleKm = Math.max(100, Math.ceil((maxKm || 0) / 10) * 10 + 50);
  const example = (Number(base) || 0) + (Number(perKm) || 0) * exampleKm;
  const inputClass = 'mt-1 w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200 focus:border-[#542813] outline-none';

  return (
    <div className="rounded-3xl bg-white border border-stone-200/80 shadow-sm p-5 sm:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
          <Globe2 className="w-3.5 h-3.5" /> Nationwide events
        </p>
        <span
          className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
            info.enabled ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-stone-100 text-stone-600 border-stone-200'
          }`}
        >
          {info.enabled ? 'On' : 'Off'}
        </span>
      </div>

      {info.enabled ? (
        <p className="text-sm text-stone-700">
          Customers anywhere in Rwanda can order from you. Within <strong>{maxKm} km</strong> of your kitchen a KitchenLink delivery worker
          brings the order as usual. Farther away, <strong>you bring it yourself</strong>: the customer pays your travel fee, you keep all of
          it, and you finish the order by entering the customer's code when you hand the food over. Far orders are always scheduled ahead.
        </p>
      ) : (
        <p className="text-sm text-stone-700">
          You deliver within <strong>{maxKm} km</strong> of your kitchen. Kitchens that cater big events (Caterers, or kitchens approved by
          KitchenLink) can take orders anywhere in Rwanda. Contact support if your kitchen handles big events and you want this switched on.
        </p>
      )}

      {info.enabled && (
        <form onSubmit={save} className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-3 pt-1 border-t border-stone-100">
          <label className="block pt-3">
            <span className="text-[11px] font-bold text-stone-500 uppercase">Travel fee: fixed part (RWF)</span>
            <input
              type="number"
              min={info.ranges.base_fee_rwf[0]}
              max={info.ranges.base_fee_rwf[1]}
              step={500}
              value={base}
              onChange={(event) => setBase(event.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block pt-3">
            <span className="text-[11px] font-bold text-stone-500 uppercase">Plus per km (RWF)</span>
            <input
              type="number"
              min={info.ranges.per_km_rwf[0]}
              max={info.ranges.per_km_rwf[1]}
              step={50}
              value={perKm}
              onChange={(event) => setPerKm(event.target.value)}
              className={inputClass}
            />
          </label>
          <p className="min-[420px]:col-span-2 text-xs text-stone-500">
            Example: an event {exampleKm} km away pays <strong className="text-gray-900">{example.toLocaleString()} RWF</strong> travel fee, on
            top of the food.
          </p>
          <div className="min-[420px]:col-span-2">
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] text-white text-xs font-bold disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Save travel fee'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
