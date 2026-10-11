import React from 'react';
import clsx from 'clsx';
import { AlertCircle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

/* ------------------------------- formatting ------------------------------- */

export const formatRwf = (value) => `${Number(value || 0).toLocaleString()} RWF`;

export function formatDate(iso, { withTime = true } = {}) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

export function formatRelative(iso) {
  if (!iso) return '';
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

const toTitle = (value) =>
  String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

/* --------------------------------- badges --------------------------------- */

const TONE_CLASS = {
  slate: 'bg-stone-100 text-stone-700 border-stone-200',
  stone: 'bg-stone-100 text-stone-700 border-stone-200',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  blue: 'bg-sky-50 text-sky-700 border-sky-200',
  violet: 'bg-violet-50 text-violet-700 border-violet-200',
  orange: 'bg-orange-50 text-orange-700 border-orange-200',
};

const STATUS_TONES = {
  pending: 'amber',
  processing: 'blue',
  in_review: 'blue',
  open: 'amber',
  approved: 'green',
  active: 'green',
  successful: 'green',
  completed: 'green',
  delivered: 'green',
  resolved: 'green',
  online: 'green',
  rejected: 'red',
  failed: 'red',
  suspended: 'red',
  cancelled: 'red',
  offline: 'slate',
  refunded: 'violet',
};

export const statusTone = (status) => STATUS_TONES[status] || 'slate';

export function Badge({ tone = 'slate', children, className }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border whitespace-nowrap',
        TONE_CLASS[tone] || TONE_CLASS.slate,
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }) {
  return <Badge tone={statusTone(status)}>{toTitle(status)}</Badge>;
}

/* --------------------------------- layout --------------------------------- */

export function PageHeader({ title, description, action }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">{title}</h1>
        {description && <p className="text-xs sm:text-sm text-stone-500 mt-0.5">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ title, description, action, children, className, bodyClassName }) {
  return (
    <section className={clsx('bg-white rounded-2xl border border-stone-200/80 shadow-sm', className)}>
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 border-b border-stone-100">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-black text-gray-900">{title}</h2>}
            {description && <p className="text-[11px] text-stone-500">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={clsx('p-4 sm:p-5', bodyClassName)}>{children}</div>
    </section>
  );
}

export function StatCard({ label, value, hint, icon: Icon, tone = 'slate' }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">{label}</p>
        {Icon && (
          <span className={clsx('w-8 h-8 rounded-xl flex items-center justify-center border', TONE_CLASS[tone])}>
            <Icon className="w-4 h-4" />
          </span>
        )}
      </div>
      <p className="mt-2 text-xl sm:text-2xl font-black text-gray-900 truncate" title={typeof value === 'string' || typeof value === 'number' ? String(value) : undefined}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-stone-500 truncate">{hint}</p>}
    </div>
  );
}

export function Spinner({ className }) {
  return <Loader2 className={clsx('w-5 h-5 animate-spin text-stone-400', className)} />;
}

export function LoadingBlock({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm font-bold text-stone-500">
      <Spinner />
      {label}
    </div>
  );
}

export function ErrorNote({ error, className }) {
  const message = typeof error === 'string' ? error : error?.message;
  if (!message) return null;
  return (
    <div
      role="alert"
      className={clsx(
        'flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700',
        className,
      )}
    >
      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      {Icon && (
        <span className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mb-3">
          <Icon className="w-6 h-6" />
        </span>
      )}
      <p className="text-sm font-bold text-gray-900">{title}</p>
      {description && <p className="text-xs text-stone-500 mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ------------------------------- form controls ------------------------------- */

export function Button({ variant = 'primary', size = 'md', className, children, ...props }) {
  const variants = {
    primary:
      'bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] hover:from-[#3d1b0c] text-white shadow-sm',
    secondary: 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm',
    ghost: 'text-stone-600 hover:bg-stone-100',
  };
  const sizes = {
    sm: 'px-2.5 py-1.5 text-[11px]',
    md: 'px-4 py-2 text-xs',
    lg: 'px-5 py-2.5 text-sm',
  };
  return (
    <button
      type="button"
      className={clsx(
        'inline-flex items-center justify-center gap-1.5 rounded-xl font-bold transition active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none',
        variants[variant] || variants.primary,
        sizes[size] || sizes.md,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

const CONTROL_CLASS =
  'w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white focus:border-[#542813] focus:ring-2 focus:ring-[#542813]/10 outline-none transition';

export function Input({ className, ...props }) {
  return <input className={clsx(CONTROL_CLASS, className)} {...props} />;
}

export function Select({ className, children, ...props }) {
  return (
    <select className={clsx(CONTROL_CLASS, 'pr-8', className)} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }) {
  return <textarea className={clsx(CONTROL_CLASS, 'min-h-[90px] resize-y', className)} {...props} />;
}

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      {label && <span className="text-xs font-bold text-stone-500 block mb-1.5">{label}</span>}
      {children}
      {hint && <span className="text-[11px] text-stone-400 mt-1 block">{hint}</span>}
    </label>
  );
}

/* --------------------------------- modal ---------------------------------- */

export function Modal({ open, title, onClose, children, footer, width = 'max-w-lg' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={clsx('bg-white rounded-2xl shadow-2xl w-full overflow-hidden', width)}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100">
          <h3 className="text-sm font-black text-gray-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="p-5 max-h-[70vh] overflow-y-auto">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-stone-100 bg-stone-50/60">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/* --------------------------------- table ---------------------------------- */

export function Table({ columns, children }) {
  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <table className="w-full text-sm min-w-[640px]">
        <thead>
          <tr className="text-left text-[11px] font-black uppercase tracking-wider text-stone-400 border-b border-stone-100">
            {columns.map((column) => (
              <th
                key={column.key}
                className={clsx('px-4 py-2.5 whitespace-nowrap', column.className)}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-50">{children}</tbody>
      </table>
    </div>
  );
}

export function Pagination({ page, limit, total, onPage }) {
  const pageCount = Math.max(1, Math.ceil((total || 0) / (limit || 1)));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total || 0);
  return (
    <div className="flex items-center justify-between gap-3 pt-4 text-xs text-stone-500">
      <span>
        {from}–{to} of {total || 0}
      </span>
      <div className="flex items-center gap-1.5">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>
        <span className="font-bold text-stone-600 px-1">
          {page} / {pageCount}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => onPage(page + 1)}
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

export { toTitle };
