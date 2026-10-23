import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { MessageCircle } from 'lucide-react';
import { chatApi } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';

/**
 * "Message kitchen": opens (or starts) the customer's chat with this kitchen.
 * Signed-out customers are asked to sign in first.
 */
export default function MessageKitchenButton({ vendorId, className, label = 'Message kitchen' }) {
  const { isAuthenticated, openAuthModal } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const start = async () => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    setBusy(true);
    try {
      const { conversation } = await chatApi.openWithVendor(vendorId);
      navigate(`/messages?chat=${encodeURIComponent(conversation.id)}`);
    } catch (error) {
      toast.error(error?.message || 'Could not open the chat.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={start}
      disabled={busy || !vendorId}
      className={clsx(
        'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-stone-200 bg-white text-stone-700 hover:bg-stone-100 transition active:scale-95 disabled:opacity-60',
        className,
      )}
    >
      <MessageCircle className="w-4 h-4" aria-hidden="true" />
      {busy ? 'Opening…' : label}
    </button>
  );
}
