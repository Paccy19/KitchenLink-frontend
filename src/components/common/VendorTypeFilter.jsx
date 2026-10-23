import React from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { VENDOR_TYPES } from '../../data/vendorTypes';

/**
 * Pick one or more kitchen types as chips (scrolls sideways on phones).
 * `value` is an array of type codes; an empty array means "all types".
 * `counts` (optional) maps a code to how many kitchens have it; types with
 * a count of 0 are hidden when `hideEmpty` is set.
 */
export default function VendorTypeFilter({ value = [], onChange, counts = null, hideEmpty = false, className, label = 'Kitchen type' }) {
  const selected = new Set(value);
  const toggle = (code) => {
    const next = new Set(selected);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    onChange(VENDOR_TYPES.map((type) => type.code).filter((c) => next.has(c)));
  };
  const types = VENDOR_TYPES.filter((type) => !hideEmpty || !counts || (counts[type.code] || 0) > 0 || selected.has(type.code));

  return (
    <div className={clsx('min-w-0', className)}>
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1" role="group" aria-label={label}>
        <button
          type="button"
          onClick={() => onChange([])}
          aria-pressed={selected.size === 0}
          className={clsx(
            'flex-shrink-0 px-3.5 py-2 rounded-2xl text-xs font-bold border transition whitespace-nowrap active:scale-95',
            selected.size === 0
              ? 'bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] text-white border-transparent shadow-md'
              : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100',
          )}
        >
          All types
        </button>
        {types.map((type) => {
          const Icon = type.icon;
          const active = selected.has(type.code);
          const count = counts ? counts[type.code] || 0 : null;
          return (
            <button
              key={type.code}
              type="button"
              onClick={() => toggle(type.code)}
              aria-pressed={active}
              title={type.description}
              className={clsx(
                'flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold border transition whitespace-nowrap active:scale-95',
                active
                  ? 'bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] text-white border-transparent shadow-md'
                  : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100',
              )}
            >
              <Icon className="w-3.5 h-3.5" aria-hidden="true" />
              {type.label}
              {count != null && <span className={clsx('text-[10px] font-black', active ? 'text-white/80' : 'text-stone-400')}>{count}</span>}
              {active && <X className="w-3 h-3" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
