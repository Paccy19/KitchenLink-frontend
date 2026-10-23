import React from 'react';
import clsx from 'clsx';
import { CalendarClock, CheckCircle2, Info, MinusCircle } from 'lucide-react';
import { getVendorType, orderingRuleLines, orderingRulesFor } from '../../data/vendorTypes';

/**
 * A kitchen type's profile: what it does well, what it's less suited for, a
 * short note and the type's ordering rules (enforced at checkout). Used at
 * sign-up and in the kitchen's profile.
 */
export default function VendorTypeProfile({ type, compact = false, className }) {
  const profile = getVendorType(type);
  return (
    <div className={clsx('grid gap-3', compact ? 'sm:grid-cols-2' : 'sm:grid-cols-2', className)}>
      <div>
        <p className="text-[11px] font-black uppercase tracking-wider text-emerald-700 mb-1">Great for</p>
        <ul className="space-y-0.5">
          {profile.strengths.map((item) => (
            <li key={item} className="flex items-start gap-1.5 text-xs text-stone-700">
              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-emerald-600" />
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-[11px] font-black uppercase tracking-wider text-amber-700 mb-1">Less suited for</p>
        {profile.lessSuited.length ? (
          <ul className="space-y-0.5">
            {profile.lessSuited.map((item) => (
              <li key={item} className="flex items-start gap-1.5 text-xs text-stone-600">
                <MinusCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-600" />
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-stone-500">Nothing — fully open.</p>
        )}
      </div>
      <div className="sm:col-span-2">
        <p className="text-[11px] font-black uppercase tracking-wider text-stone-600 mb-1">How you take orders</p>
        <div className="flex flex-wrap gap-1.5">
          {orderingRuleLines(orderingRulesFor(null, profile.code)).map((line) => (
            <span
              key={line}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-stone-200 text-[11px] font-semibold text-stone-600"
            >
              <CalendarClock className="w-3 h-3" aria-hidden="true" />
              {line}
            </span>
          ))}
        </div>
      </div>
      <p className="sm:col-span-2 flex items-start gap-1.5 text-[11px] text-stone-500">
        <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-stone-400" />
        <span>
          {profile.note} You can sell any kind of food. The order rules above apply at checkout; a daily limit and
          minimum order can be adjusted later in your profile.
        </span>
      </p>
    </div>
  );
}
