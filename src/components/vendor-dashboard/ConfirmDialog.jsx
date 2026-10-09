import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

/**
 * Accessible confirmation dialog for critical vendor actions
 * (reject/cancel an order, delete a menu item, etc.).
 *
 * @param {{isOpen: boolean, title: string, message?: string,
 *          confirmLabel?: string, cancelLabel?: string,
 *          tone?: 'danger' | 'default', onConfirm?: () => void,
 *          onCancel?: () => void}} props
 */
export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  const isDanger = tone === 'danger';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-stone-100 p-6 animate-scale-in"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close dialog"
          className="absolute top-4 right-4 w-8 h-8 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 flex items-center justify-center transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${
            isDanger ? 'bg-red-50 text-red-600' : 'bg-[#faf6f2] text-[#542813]'
          }`}
        >
          <AlertTriangle className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-black text-gray-900">{title}</h3>
        {message && <p className="mt-2 text-sm text-stone-500 leading-relaxed">{message}</p>}

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-sm transition active:scale-95"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm text-white transition active:scale-95 shadow-md ${
              isDanger
                ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                : 'bg-gradient-to-r from-[#2b1206] to-[#542813] hover:from-[#3d1b0c] shadow-[#2b1206]/20'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
