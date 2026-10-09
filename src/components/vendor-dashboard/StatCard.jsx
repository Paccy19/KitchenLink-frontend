import React from 'react';
import clsx from 'clsx';

const TONES = {
  brown: 'from-[#2b1206] via-[#481f0d] to-[#200d05] text-white',
  cream: 'from-[#faf6f2] to-[#f5ebe1] text-[#3d1b0c] border border-[#ebd7c5]',
  emerald: 'from-emerald-50 to-emerald-100 text-emerald-900 border border-emerald-200',
  amber: 'from-amber-50 to-amber-100 text-amber-900 border border-amber-200',
  rose: 'from-rose-50 to-rose-100 text-rose-900 border border-rose-200',
  sky: 'from-sky-50 to-sky-100 text-sky-900 border border-sky-200',
};

const ICON_TONES = {
  brown: 'bg-white/15 text-[#f5ebe1]',
  cream: 'bg-white/70 text-[#6d391d]',
  emerald: 'bg-white/70 text-emerald-700',
  amber: 'bg-white/70 text-amber-700',
  rose: 'bg-white/70 text-rose-700',
  sky: 'bg-white/70 text-sky-700',
};

/**
 * Compact metric card used across the vendor overview.
 *
 * @param {{icon?: any, label: string, value: React.ReactNode, hint?: string,
 *          tone?: keyof typeof TONES, className?: string}} props
 */
export default function StatCard({ icon: Icon, label, value, hint, tone = 'cream', className }) {
  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-3xl p-5 shadow-sm border border-transparent bg-gradient-to-br',
        TONES[tone],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider opacity-80">{label}</p>
          <p className="mt-2 text-2xl font-black tracking-tight truncate">{value}</p>
          {hint && <p className="mt-1 text-[11px] font-medium opacity-75 truncate">{hint}</p>}
        </div>
        {Icon && (
          <span className={clsx('w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0', ICON_TONES[tone])}>
            <Icon className="w-5 h-5" />
          </span>
        )}
      </div>
    </div>
  );
}
