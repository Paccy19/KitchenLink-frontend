import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { fetchNotifications, markNotificationRead as markReadRequest, markAllNotificationsRead as markAllReadRequest } from '../api/endpoints';
import { useAuth } from './AuthContext';
import useAutoRefresh from '../hooks/useAutoRefresh';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { accessToken } = useAuth();
  const apiEnabled = Boolean(accessToken);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [apiError, setApiError] = useState('');

  const refresh = useCallback(async () => {
    if (!apiEnabled) return;
    try {
      const response = await fetchNotifications({ limit: 30 });
      setNotifications(response.notifications ?? []);
      setUnreadCount(response.unread_count ?? 0);
      setApiError('');
    } catch (error) {
      setApiError(error.message);
    }
  }, [apiEnabled]);

  useEffect(() => {
    if (!apiEnabled) {
      setNotifications([]);
      setUnreadCount(0);
      return undefined;
    }
    refresh();
    return undefined;
  }, [apiEnabled, refresh]);

  useAutoRefresh(refresh, { enabled: apiEnabled, intervalMs: 10000 });

  const markRead = async (notificationId) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId ? { ...notification, read: true } : notification,
      ),
    );
    setUnreadCount((current) => Math.max(0, current - 1));
    try {
      await markReadRequest(notificationId);
    } catch (error) {
      setApiError(error.message);
    }
  };

  const markAllRead = async () => {
    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
    setUnreadCount(0);
    try {
      await markAllReadRequest();
    } catch (error) {
      setApiError(error.message);
    }
  };

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    apiError,
    refresh,
    markRead,
    markAllRead,
    apiEnabled,
  }), [notifications, unreadCount, apiError, refresh, apiEnabled]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);