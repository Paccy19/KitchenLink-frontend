import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, CheckCircle2, XCircle } from 'lucide-react';
import { useVendor } from '../../context/VendorContext';
import { vendorApi } from '../../api/vendorApi';
import { useToast } from '../common/Toast';
import VendorTypeBadge from '../common/VendorTypeBadge';
import { formatLead, orderingRulesFor } from '../../data/vendorTypes';

/**
 * How this kitchen takes orders, set by its vendor type and enforced at
 * checkout: order-now or advance-only, notice, days ahead, minimum order,
 * dishes per order and the daily order limit. The kitchen may change its
 * daily limit and minimum order within its type's range.
 */
export default function OrderingRulesCard({ compact = false }) {
  const { vendor } = useVendor();
  const toast = useToast();
  const [rules, setRules] = useState(() => orderingRulesFor(vendor?.ordering, vendor?.typeCode || vendor?.type));
  const [limit, setLimit] = useState('');
  const [minOrder, setMinOrder] = useState('');
  const [busy, setBusy] = useState(false);

  const apply = useCallback((raw) => {
    const next = orderingRulesFor(raw, vendor?.typeCode || vendor?.type);
    setRules(next);
    setLimit(next.dailyOrderLimit ? String(next.dailyOrderLimit) : '');
    setMinOrder(String(next.minOrderRwf || 0));
  }, [vendor?.typeCode, vendor?.type]);

  useEffect(() => {
    let alive = true;
    apply(vendor?.ordering);
    vendorApi
      .ordering()
      .then((raw) => alive && raw && apply(raw))
      .catch(() => {
        /* type defaults are shown when the API is unavailable */
      });
    return () => {
      alive = false;
    };
  }, [apply, vendor?.ordering, vendor?.typeCode]);

  if (!vendor) return null;

  const save = async (event) => {
    event.preventDefault();
    const payload = { min_order_rwf: Number(minOrder) || 0 };
    if (rules.limitRange) payload.daily_order_limit = Number(limit);
    setBusy(true);
    try {
      apply(await vendorApi.saveOrdering(payload));
      toast.success('Ordering limits saved.');
    } catch (error) {
      toast.error(error.message || 'Could not save your limits.');
    } finally {
      setBusy(false);
    }
  };

  const items = [
    {
      ok: rules.orderNow,
      text: rules.orderNow ? 'Customers can order for right now' : 'Advance orders only — no orders for right now',
    },
    { ok: true, text: `Scheduled orders need at least ${formatLead(rules.minLeadMinutes)} notice` },
    {
      ok: true,
      text: rules.maxDaysAhead === 1 ? 'Customers can book for today or tomorrow' : `Customers can book up to ${rules.maxDaysAhead} days ahead`,
    },
    ...(rules.minOrderRwf ? [{ ok: true, text: `Minimum order ${rules.minOrderRwf.toLocaleString()} RWF` }] : []),
    ...(rules.maxItemsPerOrder ? [{ ok: true, text: `Up to ${rules.maxItemsPerOrder} dishes per order` }] : []),
  ];

  const limitUsed = rules.dailyOrderLimit && rules.ordersToday != null;

  return (
    <div className="rounded-3xl bg-white border border-stone-200/80 shadow-sm p-5 sm:p-6 space-y-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
          <CalendarClock className="w-3.5 h-3.5" /> How you take orders
        </p>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <VendorTypeBadge type={rules.vendorType} size="xs" />
          <span className="text-[11px] text-stone-500">These rules come from your kitchen type and apply at checkout.</span>
        </div>
      </div>

      {limitUsed && (
        <div className={`rounded-2xl border px-3.5 py-3 ${rules.fullyBookedToday ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
          <p className={`text-sm font-black ${rules.fullyBookedToday ? 'text-amber-800' : 'text-emerald-800'}`}>
            Today: {rules.ordersToday} of {rules.dailyOrderLimit} orders
          </p>
          <p className={`text-[11px] ${rules.fullyBookedToday ? 'text-amber-700' : 'text-emerald-700'}`}>
            {rules.fullyBookedToday
              ? 'Fully booked — customers can only schedule for another day.'
              : `${rules.dailyOrderLimit - rules.ordersToday} more can be booked for today.`}
          </p>
        </div>
      )}

      {(
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li key={item.text} className="flex items-start gap-2 text-xs text-stone-700">
              {item.ok ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
              )}
              {item.text}
            </li>
          ))}
        </ul>
      )}

      {compact ? (
        <Link to="/vendor-dashboard/profile" className="inline-block text-xs font-bold text-[#542813] hover:underline">
          Change your daily limit or minimum order
        </Link>
      ) : (
        <form onSubmit={save} className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-3 pt-1 border-t border-stone-100">
          {rules.limitRange && (
            <label className="block pt-3">
              <span className="text-[11px] font-bold text-stone-500 uppercase">Orders per day</span>
              <input
                type="number"
                min={rules.limitRange[0]}
                max={rules.limitRange[1]}
                value={limit}
                onChange={(event) => setLimit(event.target.value)}
                className="mt-1 w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200 focus:border-[#542813] outline-none"
              />
              <span className="text-[10px] text-stone-400">
                {rules.limitRange[0]}–{rules.limitRange[1]} for your type
              </span>
            </label>
          )}
          <label className="block pt-3">
            <span className="text-[11px] font-bold text-stone-500 uppercase">Minimum order (RWF)</span>
            <input
              type="number"
              min={rules.minOrderRange[0]}
              max={rules.minOrderRange[1]}
              step={500}
              value={minOrder}
              onChange={(event) => setMinOrder(event.target.value)}
              className="mt-1 w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200 focus:border-[#542813] outline-none"
            />
            <span className="text-[10px] text-stone-400">
              {rules.minOrderRange[0].toLocaleString()}–{rules.minOrderRange[1].toLocaleString()} RWF for your type
            </span>
          </label>
          <div className="min-[420px]:col-span-2">
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] text-white text-xs font-bold disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Save limits'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
