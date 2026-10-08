import React from 'react';
import clsx from 'clsx';
import { AlertTriangle, RotateCcw } from 'lucide-react';

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
        'text-center py-14 px-6 bg-white rounded-3xl border border-gray-200/80 space-y-4',
        className,
      )}
    >
      <div className="w-16 h-16 rounded-full bg-orange-50 text-orange-500 mx-auto flex items-center justify-center">
        {icon ?? <span className="text-3xl" aria-hidden="true">🍽️</span>}
      </div>
      <h3 className="text-lg font-black text-gray-900">{title}</h3>
      {message && <p className="text-sm text-gray-500 max-w-sm mx-auto">{message}</p>}
      {children}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="px-5 py-2.5 rounded-xl bg-orange-600 text-white font-bold text-sm hover:bg-orange-700 focus:ring-4 focus:ring-orange-500/20 transition"
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
      className="text-center py-14 px-6 bg-white rounded-3xl border border-red-100 space-y-4"
    >
      <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 mx-auto flex items-center justify-center">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-black text-gray-900">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm mx-auto">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 text-white font-bold text-sm hover:bg-gray-800 disabled:opacity-60 transition"
        >
          <RotateCcw className={clsx('w-4 h-4', isRetrying && 'animate-spin')} />
          {isRetrying ? 'Retrying…' : 'Try again'}
        </button>
      )}
    </div>
  );
}
