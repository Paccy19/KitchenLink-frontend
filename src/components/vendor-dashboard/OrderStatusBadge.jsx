import React from 'react';
import clsx from 'clsx';

const TONES = {
  New: 'bg-amber-100 text-amber-800 border-amber-200',
  Accepted: 'bg-sky-100 text-sky-800 border-sky-200',
  Preparing: 'bg-orange-100 text-orange-800 border-orange-200',
  Ready: 'bg-violet-100 text-violet-800 border-violet-200',
  Completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
};

export default function OrderStatusBadge({ status, className }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border',
        TONES[status] || 'bg-stone-100 text-stone-700 border-stone-200',
        className,
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  );
}
