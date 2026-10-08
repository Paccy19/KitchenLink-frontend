import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';

const ToastContext = createContext(null);

const STYLES = {
  success: 'bg-forest-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-gray-900 text-white',
};

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

/**
 * Lightweight toast notifications for network failures and confirmations.
 * Rendered in an `aria-live` region so screen readers announce them.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (message, { type = 'info', duration = 4000 } = {}) => {
      const id = ++counter.current;
      setToasts((prev) => [...prev.slice(-3), { id, message, type }]);
      if (duration > 0) setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      push,
      dismiss,
      success: (message, options) => push(message, { ...options, type: 'success' }),
      error: (message, options) => push(message, { ...options, type: 'error' }),
      info: (message, options) => push(message, { ...options, type: 'info' }),
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed z-[60] bottom-24 sm:bottom-6 inset-x-0 flex flex-col items-center gap-2 px-4 pointer-events-none"
        role="status"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type] ?? Info;
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto w-full max-w-md flex items-start gap-3 px-4 py-3 rounded-2xl shadow-xl text-sm font-semibold ${STYLES[toast.type] ?? STYLES.info}`}
            >
              <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="flex-1">{toast.message}</span>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
                className="opacity-70 hover:opacity-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within <ToastProvider>');
  return context;
}
