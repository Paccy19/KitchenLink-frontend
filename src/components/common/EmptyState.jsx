import React from 'react';
import clsx from 'clsx';
import { AlertTriangle, RotateCcw, UtensilsCrossed } from 'lucide-react';

/**
 * Friendly empty state with optional call-to-action.
 *
 * @param {{icon?:React.ReactNode, title:string, message?:string,
 *          actionLabel?:string, onAction?:() => void,
 *          children?:React.ReactNode, className?:string}} props
 */
export default function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  children,
  className,
}) {
  return (
    <div
      role="status"
      className={clsx(
        'text-center py-14 px-6 bg-white rounded-3xl border border-stone-200/80 space-y-4 shadow-sm animate-fade-in',
        className,
      )}
    >
      <div className="w-16 h-16 rounded-2xl bg-[#faf6f2] text-[#542813] border border-[#ebd7c5] mx-auto flex items-center justify-center shadow-sm">
        {icon ?? <UtensilsCrossed className="w-8 h-8 text-[#542813]" aria-hidden="true" />}
      </div>
      <h3 className="text-lg font-black text-gray-900">{title}</h3>
      {message && <p className="text-sm text-stone-500 max-w-sm mx-auto">{message}</p>}
      {children}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] hover:from-[#3d1b0c] hover:via-[#5c2810] hover:to-[#2c1206] text-white font-bold text-sm shadow-md shadow-[#2b1206]/20 focus:ring-4 focus:ring-[#542813]/20 transition-all active:scale-95"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/**
 * Network / API error state with a retry affordance.
 *
 * @param {{title?:string, message?:string, onRetry?:() => void, isRetrying?:boolean}} props
 */
export function ErrorState({
  title = 'Something went wrong',
  message = 'We could not load this section. Check your connection and try again.',
  onRetry,
  isRetrying = false,
}) {
  return (
    <div
      role="alert"
      className="text-center py-14 px-6 bg-white rounded-3xl border border-red-100 space-y-4 shadow-sm animate-fade-in"
    >
      <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-500 mx-auto flex items-center justify-center">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-black text-gray-900">{title}</h3>
      <p className="text-sm text-stone-500 max-w-sm mx-auto">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 text-white font-bold text-sm hover:bg-stone-800 disabled:opacity-60 transition shadow-sm active:scale-95"
        >
          <RotateCcw className={clsx('w-4 h-4', isRetrying && 'animate-spin')} />
          {isRetrying ? 'Retrying…' : 'Try again'}
        </button>
      )}
    </div>
  );
}
