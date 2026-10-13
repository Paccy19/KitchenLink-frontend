import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, ChevronRight } from 'lucide-react';
import { useVendor } from '../../context/VendorContext';
import { notificationLink } from '../../utils/notificationLink';
import { notificationMeta, timeAgo } from '../../components/vendor-dashboard/notificationMeta';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'order_placed', label: 'New orders' },
  { id: 'order_update', label: 'Order updates' },
  { id: 'payout_update', label: 'Payouts' },
  { id: 'account_update', label: 'Account' },
  { id: 'support_message', label: 'Support' },
];

/** Every vendor notification; tapping one opens the page it is about. */
export default function VendorNotificationsPage() {
  const { notifications, unreadNotifications, markNotificationRead, markAllNotificationsRead } = useVendor();
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();

  const visible = notifications.filter((notification) => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notification.read;
    return notification.type === filter;
  });

  const open = (notification) => {
    if (!notification.read) markNotificationRead(notification.id);
    navigate(notificationLink(notification, 'vendor'));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Notifications</h2>
          <p className="text-xs text-stone-500 font-medium">
            {unreadNotifications > 0 ? `${unreadNotifications} unread` : 'You are all caught up'} · new orders, deliveries, payouts and account updates
          </p>
        </div>
        {unreadNotifications > 0 && (
          <button
            type="button"
            onClick={markAllNotificationsRead}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-stone-200 text-xs font-bold text-stone-700 hover:bg-stone-50 transition"
          >
            <CheckCheck className="w-4 h-4" /> Mark all as read
          </button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            aria-pressed={filter === item.id}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition ${
              filter === item.id ? 'bg-[#2b1206] text-white border-[#2b1206]' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
            }`}
          >
            {item.label}
            {item.id === 'unread' && unreadNotifications > 0 ? ` · ${unreadNotifications}` : ''}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm overflow-hidden">
        {visible.length === 0 ? (
          <div className="py-14 text-center">
            <Bell className="w-8 h-8 text-stone-300 mx-auto" />
            <p className="mt-2 text-sm text-stone-500">No notifications here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-stone-100">
            {visible.map((notification) => {
              const meta = notificationMeta(notification.type);
              const Icon = meta.icon;
              return (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => open(notification)}
                    className={`w-full text-left flex items-start gap-3 px-5 py-4 hover:bg-[#faf6f2] transition ${notification.read ? '' : 'bg-[#fffbf5]'}`}
                  >
                    <span className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${meta.tone}`}>
                      <Icon className="w-5 h-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="text-sm font-black text-gray-900">{notification.title}</span>
                        {!notification.read && <span className="w-2 h-2 rounded-full bg-[#542813]" aria-label="unread" />}
                      </span>
                      <span className="block text-sm text-stone-600 mt-0.5">{notification.body}</span>
                      <span className="block text-[11px] text-stone-400 mt-1">
                        {meta.label} · {timeAgo(notification.created_at)}
                      </span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-stone-300 mt-3 flex-shrink-0" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
