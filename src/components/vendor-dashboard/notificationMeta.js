import { Bell, ShoppingBag, Wallet, BadgeCheck, ClipboardList, LifeBuoy } from 'lucide-react';

/** Icon + colour for a vendor notification type. */
const META = {
  order_placed: { icon: ShoppingBag, tone: 'bg-emerald-50 text-emerald-600', label: 'New order' },
  order_update: { icon: ClipboardList, tone: 'bg-sky-50 text-sky-600', label: 'Order update' },
  payout_update: { icon: Wallet, tone: 'bg-violet-50 text-violet-600', label: 'Payout' },
  account_update: { icon: BadgeCheck, tone: 'bg-amber-50 text-amber-600', label: 'Account' },
  support_message: { icon: LifeBuoy, tone: 'bg-rose-50 text-rose-600', label: 'Support' },
  general: { icon: Bell, tone: 'bg-stone-100 text-stone-600', label: 'General' },
};

export const notificationMeta = (type) => META[type] || META.general;

export const timeAgo = (iso) => {
  if (!iso) return '';
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
};
