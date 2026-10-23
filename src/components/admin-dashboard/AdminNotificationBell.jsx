import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  CheckCheck,
  Store,
  Bike,
  MessageSquareWarning,
  Wallet,
  ShoppingBag,
  CreditCard,
  Inbox,
  Landmark,
  RotateCcw,
  Shapes,
} from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import { useAdmin } from '../../context/AdminContext';
import { formatRelative } from './ui';
import NotificationPopups from '../common/NotificationPopups';

const TYPE_META = {
  vendor_application: { icon: Store, tone: 'bg-amber-50 text-amber-600' },
  vendor_type_request: { icon: Shapes, tone: 'bg-orange-50 text-orange-600' },
  category_added: { icon: Shapes, tone: 'bg-amber-50 text-amber-600' },
  driver_application: { icon: Bike, tone: 'bg-sky-50 text-sky-600' },
  complaint_opened: { icon: MessageSquareWarning, tone: 'bg-rose-50 text-rose-600' },
  payout_requested: { icon: Wallet, tone: 'bg-violet-50 text-violet-600' },
  order_placed: { icon: ShoppingBag, tone: 'bg-emerald-50 text-emerald-600' },
  payment_failed: { icon: CreditCard, tone: 'bg-red-50 text-red-600' },
  owner_finance: { icon: Landmark, tone: 'bg-violet-50 text-violet-600' },
  payout_update: { icon: Wallet, tone: 'bg-violet-50 text-violet-600' },
  refund_update: { icon: RotateCcw, tone: 'bg-sky-50 text-sky-600' },
  late_pickup: { icon: Bike, tone: 'bg-red-50 text-red-600' },
  general: { icon: Bell, tone: 'bg-stone-100 text-stone-600' },
};

const FALLBACK_LINK = {
  vendor_application: '/admin-dashboard/vendors',
  vendor_type_request: '/admin-dashboard/vendors',
  category_added: '/admin-dashboard/categories',
  driver_application: '/admin-dashboard/drivers',
  complaint_opened: '/admin-dashboard/complaints',
  payout_requested: '/admin-dashboard/payouts',
  order_placed: '/admin-dashboard/orders',
  payment_failed: '/admin-dashboard/payments',
  owner_finance: '/admin-dashboard/platform',
  refund_update: '/admin-dashboard/refunds',
  late_pickup: '/admin-dashboard/deliveries?tab=late',
};

export default function AdminNotificationBell() {
  const { hasToken } = useAdmin();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  const listQuery = useQuery({
    queryKey: ['admin', 'notifications'],
    queryFn: () => adminApi.listNotifications({ limit: 20 }),
    enabled: Boolean(hasToken),
    refetchInterval: 15000,
  });

  const markRead = useMutation({
    mutationFn: (id) => adminApi.markNotificationRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'notifications'] }),
  });

  const markAll = useMutation({
    mutationFn: () => adminApi.markAllNotificationsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'notifications'] }),
  });

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const notifications = listQuery.data?.notifications || [];
  const unread = listQuery.data?.unread_count || 0;

  const handleOpenItem = (item) => {
    if (!item.read) markRead.mutate(item.id);
    setOpen(false);
    const link = item.data?.link || FALLBACK_LINK[item.type] || '/admin-dashboard';
    navigate(link);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <NotificationPopups
        notifications={notifications}
        loaded={listQuery.isSuccess}
        linkFor={(item) => item.data?.link || FALLBACK_LINK[item.type] || '/admin-dashboard'}
        onRead={(item) => !item.read && markRead.mutate(item.id)}
      />
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Notifications"
        className="relative w-10 h-10 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center transition"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[88vw] max-w-sm bg-white rounded-2xl shadow-2xl border border-stone-100 z-50 animate-fade-in overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
            <p className="text-sm font-black text-gray-900">Notifications</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1f2937] hover:underline disabled:opacity-50"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[65vh] overflow-y-auto">
            {listQuery.isLoading ? (
              <div className="p-6 flex justify-center">
                <div className="w-6 h-6 rounded-full border-2 border-stone-200 border-t-[#1f2937] animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-stone-400">
                <Inbox className="w-7 h-7" />
                <p className="text-sm font-bold">You are all caught up</p>
              </div>
            ) : (
              notifications.map((item) => {
                const meta = TYPE_META[item.type] || TYPE_META.general;
                const Icon = meta.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleOpenItem(item)}
                    className={`w-full text-left flex gap-3 px-4 py-3 border-b border-stone-50 hover:bg-stone-50 transition ${
                      item.read ? '' : 'bg-amber-50/40'
                    }`}
                  >
                    <span
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.tone}`}
                    >
                      <Icon className="w-[18px] h-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900 truncate">
                          {item.title}
                        </span>
                        {!item.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                        )}
                      </span>
                      <span className="block text-xs text-stone-500 mt-0.5 line-clamp-2">
                        {item.body}
                      </span>
                      <span className="block text-[10px] text-stone-400 mt-1">
                        {formatRelative(item.created_at)}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
