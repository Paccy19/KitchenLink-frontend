import React from 'react';
import { Bike, Check, ChefHat, ClipboardList, Flag, Package, ShoppingBag, ThumbsUp } from 'lucide-react';

// The same steps the customer follows on their order tracking page.
const STEPS = [
  { id: 'placed', label: 'Order placed', icon: ClipboardList },
  { id: 'confirmed', label: 'Accepted by kitchen', icon: ThumbsUp },
  { id: 'preparing', label: 'Preparing', icon: ChefHat },
  { id: 'ready', label: 'Ready for pickup', icon: ShoppingBag },
  { id: 'picked_up', label: 'Picked up', icon: Package },
  { id: 'out_for_delivery', label: 'On the way', icon: Bike },
  { id: 'delivered', label: 'Delivered', icon: Flag },
];

// "assigned" is ready + a driver; the driver is already shown as assigned.
const STEP_OF_STATUS = { assigned: 'ready' };

const timeOf = (iso) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

/**
 * The order as the customer sees it — kitchen accepted, preparing, ready,
 * picked up, on the way, delivered — for the delivery worker who took it.
 */
export default function OrderProgressPanel({ progress }) {
  if (!progress) return null;
  const current = STEP_OF_STATUS[progress.status] || progress.status;
  const currentIndex = Math.max(0, STEPS.findIndex((step) => step.id === current));
  const cancelled = progress.status === 'cancelled';
  const history = [...progress.history].reverse().slice(0, 8);

  return (
    <div className="rounded-3xl bg-white border border-stone-200/80 shadow-sm p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Order progress</p>
        <span
          className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${
            cancelled ? 'bg-red-50 text-red-700' : 'bg-[#f5f8f2] text-[#3b5327]'
          }`}
        >
          {progress.label}
        </span>
      </div>

      {!cancelled && (
        <ol className="grid grid-cols-7 gap-1">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const done = index < currentIndex;
            const active = index === currentIndex;
            return (
              <li key={step.id} className="flex flex-col items-center text-center">
                <span
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center mb-1.5 ${
                    done
                      ? 'bg-emerald-600 text-white'
                      : active
                        ? 'bg-gradient-to-br from-emerald-600 to-[#1c2b12] text-white ring-4 ring-emerald-100'
                        : 'bg-stone-100 text-stone-400'
                  }`}
                >
                  {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </span>
                <span
                  className={`text-[9px] sm:text-[10px] leading-tight font-bold ${
                    active ? 'text-[#3b5327]' : done ? 'text-stone-600' : 'text-stone-400'
                  }`}
                >
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {history.length > 0 && (
        <ul className="mt-4 border-t border-stone-100 pt-3 space-y-1.5">
          {history.map((entry, index) => (
            <li key={`${entry.at}-${index}`} className="flex items-start gap-2 text-xs">
              <span className="w-12 flex-shrink-0 font-mono text-stone-400">{timeOf(entry.at)}</span>
              <span className="text-stone-600 font-medium">{entry.note || entry.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
