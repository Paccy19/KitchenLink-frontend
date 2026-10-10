import React from 'react';
import { Check, Bike, Store, Package, MapPin, Flag } from 'lucide-react';

const STEPS = [
  { key: 'assigned', label: 'Assigned', icon: Bike },
  { key: 'heading', label: 'Heading to vendor', icon: Store },
  { key: 'picked_up', label: 'Picked up', icon: Package },
  { key: 'out_for_delivery', label: 'Out for delivery', icon: MapPin },
  { key: 'delivered', label: 'Delivered', icon: Flag },
];

const STATUS_INDEX = {
  assigned_to_driver: 1,
  picked_up: 2,
  out_for_delivery: 3,
  delivered: 4,
  completed: 4,
};

/**
 * Prominent delivery progress stepper.
 * @param {{status: string, className?: string}} props
 */
export default function DriverStatusStepper({ status, className }) {
  const currentIndex = STATUS_INDEX[status] ?? 0;

  return (
    <div className={`rounded-3xl bg-white border border-stone-200/80 shadow-sm p-5 ${className || ''}`}>
      <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-4">Delivery progress</p>
      <ol className="flex items-start gap-1">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const done = index < currentIndex;
          const active = index === currentIndex;
          return (
            <li key={step.key} className="flex-1 flex flex-col items-center text-center">
              <span
                className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-2 transition-all ${
                  done || active
                    ? 'bg-gradient-to-br from-emerald-600 to-[#1c2b12] text-white shadow-md'
                    : 'bg-stone-100 text-stone-400'
                }`}
              >
                {done ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
              </span>
              <span
                className={`text-[10px] sm:text-[11px] leading-tight font-bold px-0.5 ${
                  active ? 'text-[#3b5327]' : done ? 'text-stone-600' : 'text-stone-400'
                }`}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-xs font-medium text-stone-500 text-center">
        {STEPS[currentIndex]?.label || 'Preparing'}
      </p>
    </div>
  );
}