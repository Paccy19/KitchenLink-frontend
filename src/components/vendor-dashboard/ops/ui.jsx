import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import ModalPortal from '../../common/ModalPortal';
import useAutoRefresh from '../../../hooks/useAutoRefresh';

/**
 * Small building blocks shared by the kitchen operations pages (departments,
 * staff, tables, preparation, service, invoices, stock, reports), in the
 * dashboard's own look.
 */

export const money = (value) => `RWF ${Math.round(Number(value) || 0).toLocaleString('en-US')}`;
export const when = (value) =>
  value ? new Date(value).toLocaleString('en-GB', { timeZone: 'Africa/Kigali', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
export const minutesAgo = (value) => {
  if (!value) return '';
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min ago`;
};

/** Loads `load()` now, again after any change in the app, and every `intervalMs`. */
export function useLoad(load, deps = [], { intervalMs = 15000 } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const alive = useRef(true);
  // Set on every mount: React's StrictMode mounts, unmounts and mounts again
  // in development, and a flag only cleared would stay "unmounted" for good.
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(async () => {
    try {
      const result = await load();
      if (alive.current) {
        setData(result);
        setError('');
      }
    } catch (err) {
      if (alive.current) setError(err.message || 'Could not load this page.');
    } finally {
      if (alive.current) setLoading(false);
    }
  }, deps);
  useEffect(() => {
    setLoading(true);
    run();
  }, [run]);
  useAutoRefresh(run, { intervalMs });
  return { data, error, loading, reload: run, setData };
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-stone-500 font-medium mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = '' }) {
  return <div className={`rounded-3xl bg-white border border-stone-200/80 shadow-sm p-5 ${className}`}>{children}</div>;
}

export function Button({ children, variant = 'primary', busy = false, className = '', ...props }) {
  const styles = {
    primary: 'bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] hover:from-[#3d1b0c] text-white shadow-md',
    secondary: 'bg-white border border-stone-200 text-stone-700 hover:bg-[#faf6f2] hover:text-[#542813]',
    soft: 'bg-[#faf6f2] border border-[#ebd7c5] text-[#542813] hover:bg-[#f5ebe1]',
    danger: 'bg-white border border-red-200 text-red-600 hover:bg-red-50',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md',
  };
  return (
    <button
      type="button"
      {...props}
      disabled={busy || props.disabled}
      className={`inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition active:scale-95 disabled:opacity-50 disabled:active:scale-100 ${styles[variant]} ${className}`}
    >
      {busy && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}

const TONES = {
  stone: 'bg-stone-100 text-stone-600 border-stone-200',
  amber: 'bg-amber-50 text-amber-800 border-amber-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  blue: 'bg-sky-50 text-sky-700 border-sky-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  brown: 'bg-[#faf6f2] text-[#6d391d] border-[#ebd7c5]',
};
export function Badge({ children, tone = 'stone', className = '' }) {
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${TONES[tone]} ${className}`}>{children}</span>;
}

export const inputClass =
  'w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#c08a63]/40 focus:border-[#c08a63]';

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-stone-500 block mb-1.5">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-stone-400 block mt-1">{hint}</span>}
    </label>
  );
}

export function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className={`relative w-full ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'} max-h-[92vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 sm:p-6`}>
          <div className="flex items-start justify-between gap-3 mb-4">
            <h3 className="font-black text-lg text-gray-900">{title}</h3>
            <button type="button" onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full text-stone-500 hover:bg-stone-100 flex items-center justify-center">
              <X className="w-5 h-5" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </ModalPortal>
  );
}

export function ErrorNote({ message }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold px-3 py-2">
      {message}
    </p>
  );
}

export function Empty({ icon: Icon, title, children }) {
  return (
    <div className="text-center py-12 px-4">
      {Icon && (
        <div className="w-12 h-12 rounded-2xl bg-[#faf6f2] border border-[#ebd7c5] mx-auto flex items-center justify-center mb-3">
          <Icon className="w-6 h-6 text-[#6d391d]" />
        </div>
      )}
      <p className="font-black text-gray-900">{title}</p>
      {children && <div className="text-sm text-stone-500 mt-1 max-w-md mx-auto">{children}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, tone }) {
  return (
    <div className={`rounded-2xl border p-4 ${tone === 'warn' ? 'bg-amber-50 border-amber-200' : 'bg-white border-stone-200/80'}`}>
      <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wide">{label}</p>
      <p className="text-xl font-black text-gray-900 mt-1">{value}</p>
      {hint && <p className="text-[11px] text-stone-400 mt-0.5">{hint}</p>}
    </div>
  );
}

export function Loading() {
  return (
    <div className="flex items-center justify-center py-16 text-stone-400">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>
  );
}

/** Runs an action with a busy flag and an error message the page shows. */
export function useAction() {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const run = useCallback(async (key, fn) => {
    setBusy(key);
    setError('');
    try {
      return await fn();
    } catch (err) {
      setError(err.message || 'Something went wrong.');
      return null;
    } finally {
      setBusy('');
    }
  }, []);
  return { busy, error, setError, run };
}

/** Department chip filter: All / each department / "No department". */
export function DepartmentTabs({ departments = [], value, onChange, includeNone = false, allLabel = 'All' }) {
  const tabs = [{ id: '', name: allLabel }, ...departments.map((d) => ({ id: d.id, name: d.name })), ...(includeNone ? [{ id: 'main', name: 'Kitchen (no department)' }] : [])];
  if (tabs.length <= 2 && !includeNone) return null;
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      {tabs.map((tab) => (
        <button
          key={tab.id || 'all'}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`flex-shrink-0 px-3.5 py-2 rounded-full text-xs font-bold border transition ${
            value === tab.id ? 'bg-[#2b1206] text-white border-[#2b1206]' : 'bg-white text-stone-600 border-stone-200 hover:bg-[#faf6f2]'
          }`}
        >
          {tab.name}
        </button>
      ))}
    </div>
  );
}
