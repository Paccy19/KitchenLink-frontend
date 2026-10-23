import React, { useEffect, useState } from 'react';
import { Check, Copy, Phone, X } from 'lucide-react';
import { toLocalRwandaPhone } from '../../utils/validation';
import ModalPortal from '../common/ModalPortal';

/** "+250788888888" → "0788 888 888" (the way it's dialled locally). */
const localDisplay = (phone) => {
  const local = toLocalRwandaPhone(phone);
  return local.length === 10 ? `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}` : phone;
};

/**
 * "Call kitchen" / "Call delivery worker": shows the person's phone number in
 * local form so the customer can see it and dial it, with a one-tap call and a
 * copy button. `label` is the button text, `kitchenName` who is being called.
 */
export default function CallKitchenButton({ phone, kitchenName = 'the kitchen', label = 'Call kitchen', className = '' }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const local = toLocalRwandaPhone(phone);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => event.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(local);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* the number is still shown to copy by hand */
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#faf6f2] hover:bg-[#f5ebe1] text-[#3d1b0c] border border-[#ebd7c5] font-bold text-xs transition ${className}`}
      >
        <Phone className="w-3.5 h-3.5 text-[#6d391d]" /> {label}
      </button>

      {open && (
        <ModalPortal>
        <div
          className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(event) => event.target === event.currentTarget && setOpen(false)}
        >
          <div role="dialog" aria-modal="true" aria-label={`Call ${kitchenName}`} className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4">
            <div className="flex justify-end -mt-2 -mr-2">
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="w-8 h-8 rounded-xl flex items-center justify-center text-stone-500 hover:bg-stone-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <span className="w-14 h-14 mx-auto -mt-4 rounded-2xl bg-[#faf6f2] border border-[#ebd7c5] flex items-center justify-center">
              <Phone className="w-6 h-6 text-[#6d391d]" />
            </span>
            <div>
              <p className="text-xs font-bold text-stone-500">Call {kitchenName}</p>
              <p className="mt-1 text-3xl font-black tracking-wide text-gray-900 select-all">{localDisplay(phone)}</p>
              <p className="text-[11px] text-stone-400 mt-1">A normal local call — standard rates from your network apply.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <a
                href={`tel:${local}`}
                className="inline-flex items-center justify-center gap-1.5 py-3 rounded-xl bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] text-white font-bold text-sm"
              >
                <Phone className="w-4 h-4" /> Call now
              </a>
              <button
                type="button"
                onClick={copy}
                className="inline-flex items-center justify-center gap-1.5 py-3 rounded-xl border border-stone-200 text-sm font-bold text-stone-700 hover:bg-stone-100"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy number'}
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </>
  );
}
