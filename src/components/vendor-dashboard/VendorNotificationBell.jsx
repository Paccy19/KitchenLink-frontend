import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { useVendor } from '../../context/VendorContext';
import { notificationLink } from '../../utils/notificationLink';
import { notificationMeta, timeAgo } from './notificationMeta';
import NotificationPopups from '../common/NotificationPopups';

/** Header bell: the latest vendor notifications; each opens its own page. */
export default function VendorNotificationBell() {
  const { notifications, unreadNotifications, notificationsLoaded, markNotificationRead, markAllNotificationsRead } = useVendor();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const openItem = (notification) => {
    if (!notification.read) markNotificationRead(notification.id);
    setOpen(false);
    navigate(notificationLink(notification, 'vendor'));
  };

  return (
    <div className="relative" ref={ref}>
      <NotificationPopups
        notifications={notifications}
        loaded={notificationsLoaded}
        linkFor={(notification) => notificationLink(notification, 'vendor')}
        onRead={(notification) => !notification.read && markNotificationRead(notification.id)}
      />
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={`Notifications${unreadNotifications ? `, ${unreadNotifications} unread` : ''}`}
        className="relative w-10 h-10 rounded-full bg-white border border-stone-200 flex items-center justify-center text-stone-600 hover:bg-stone-50 transition"
      >
        <Bell className="w-5 h-5" />
        {unreadNotifications > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
            {unreadNotifications > 9 ? '9+' : unreadNotifications}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] bg-white rounded-2xl border border-stone-200 shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
            <p className="text-sm font-black text-gray-900">Notifications</p>
            {unreadNotifications > 0 && (
              <button type="button" onClick={markAllNotificationsRead} className="inline-flex items-center gap-1 text-[11px] font-bold text-[#542813] hover:underline">
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-stone-500">No notifications yet.</p>
            ) : (
              notifications.slice(0, 8).map((notification) => {
                const meta = notificationMeta(notification.type);
                const Icon = meta.icon;
                return (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => openItem(notification)}
                    className={`w-full text-left flex gap-3 px-4 py-3 border-b border-stone-50 hover:bg-[#faf6f2] transition ${notification.read ? '' : 'bg-[#fffbf5]'}`}
                  >
                    <span className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.tone}`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-gray-900 truncate">{notification.title}</span>
                        {!notification.read && <span className="w-1.5 h-1.5 rounded-full bg-[#542813] flex-shrink-0" />}
                      </span>
                      <span className="block text-[11px] text-stone-600 line-clamp-2">{notification.body}</span>
                      <span className="block text-[10px] text-stone-400 mt-0.5">{timeAgo(notification.created_at)}</span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
          <Link
            to="/vendor-dashboard/notifications"
            onClick={() => setOpen(false)}
            className="block text-center px-4 py-2.5 text-xs font-bold text-[#542813] hover:bg-[#faf6f2] border-t border-stone-100"
          >
            See all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
