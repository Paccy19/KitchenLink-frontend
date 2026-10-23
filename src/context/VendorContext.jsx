import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  vendorApi,
  BLOCKED_VENDOR_CODES,
  buildMenuItemPayload,
  clearVendorToken,
  getVendorToken,
  mapMenuItem,
  mapOrder,
  mapSpecial,
  mapStats,
  mapVendorAccount,
  mapWallet,
  setVendorToken,
  titleToStatus,
} from '../api/vendorApi';
import { clearAllSessions } from '../api/session';
import useAutoRefresh from '../hooks/useAutoRefresh';

const VendorContext = createContext(null);

const STORAGE = {
  registered: 'ofk_vendor_registered',
};

const readFlag = (key, fallback = false) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
};

const EMPTY_STATS = mapStats({});

export function VendorProvider({ children }) {
  const queryClient = useQueryClient();
  const [vendor, setVendor] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [special, setSpecial] = useState(null);
  const [wallet, setWallet] = useState({ withdrawn: 0, baseSales: 0, withdrawalHistory: [] });
  const [dashboard, setDashboard] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  // True once notifications have loaded, so only later arrivals pop up.
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);
  const [categories, setCategories] = useState([]);
  const [isRegistered, setIsRegistered] = useState(() => readFlag(STORAGE.registered));
  const [lastSyncedAt, setLastSyncedAt] = useState(() => new Date().toISOString());
  const [authToken, setAuthToken] = useState(() => getVendorToken());
  const [marketplaceMode, setMarketplaceMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [error, setError] = useState('');
  const [pendingLoginPhone, setPendingLoginPhone] = useState('');
  const [loginOtpPreview, setLoginOtpPreview] = useState('');
  // Set when the API reports this vendor as suspended/rejected: { status, reason, support_phone, ... }.
  const [accountBlock, setAccountBlock] = useState(null);
  // 'idle' | 'saving' while opening/closing the store.
  const [storeStatus, setStoreStatus] = useState('idle');
  const [storeError, setStoreError] = useState('');
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const markSynced = useCallback(() => setLastSyncedAt(new Date().toISOString()), []);
  const refreshPublicCatalog = useCallback(
    () => Promise.all([
      queryClient.invalidateQueries({ queryKey: ['home'] }),
      queryClient.invalidateQueries({ queryKey: ['vendor'] }),
    ]),
    [queryClient],
  );

  /* ------------------------------ loaders ------------------------------ */

  const refreshMenu = useCallback(async () => {
    const data = await vendorApi.listMenu({ limit: 100 });
    if (!mounted.current) return [];
    const mapped = (data.items || []).map(mapMenuItem);
    setMenuItems(mapped);
    return mapped;
  }, []);

  const refreshOrders = useCallback(async () => {
    const data = await vendorApi.listOrders({ limit: 50 });
    if (!mounted.current) return [];
    const mapped = (data.orders || []).map(mapOrder);
    setOrders(mapped);
    return mapped;
  }, []);

  const refreshSpecial = useCallback(async () => {
    const mapped = await vendorApi.special();
    if (!mounted.current) return mapped;
    setSpecial(mapped);
    return mapped;
  }, []);

  const refreshWallet = useCallback(async () => {
    const data = await vendorApi.wallet();
    if (!mounted.current) return data;
    setWallet(mapWallet(data));
    return data;
  }, []);

  const refreshDashboard = useCallback(async () => {
    const data = await vendorApi.dashboard();
    if (!mounted.current) return data;
    setDashboard(data);
    return data;
  }, []);

  const refreshProfile = useCallback(async () => {
    const { vendor: raw } = await vendorApi.me();
    if (!mounted.current) return raw;
    const mapped = mapVendorAccount(raw);
    setVendor(mapped);
    return mapped;
  }, []);

  /* ---------------------------- notifications --------------------------- */

  const refreshNotifications = useCallback(async () => {
    const data = await vendorApi.notifications({ limit: 50 });
    if (!mounted.current) return;
    setNotifications(data.notifications || []);
    setNotificationsLoaded(true);
    setUnreadNotifications(data.unread_count ?? 0);
  }, []);

  const markNotificationRead = useCallback(async (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadNotifications((count) => Math.max(0, count - 1));
    await vendorApi.markNotificationRead(id).catch(() => null);
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadNotifications(0);
    await vendorApi.markAllNotificationsRead().catch(() => null);
  }, []);

  const refreshAll = useCallback(async () => {
    if (!getVendorToken()) return;
    setLoading(true);
    setError('');
    try {
      await refreshProfile();
      await Promise.all([refreshDashboard(), refreshMenu(), refreshOrders(), refreshWallet(), refreshSpecial(), refreshNotifications().catch(() => null)]);
      markSynced();
    } catch (err) {
      if (mounted.current) setError(err.message || 'Failed to load your dashboard.');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [refreshProfile, refreshDashboard, refreshMenu, refreshOrders, refreshWallet, refreshSpecial, refreshNotifications, markSynced]);

  // Quiet refresh (no loading spinner) for automatic updates: orders a
  // delivery worker completed, new orders, wallet changes, notifications...
  const refreshQuietly = useCallback(async () => {
    if (!getVendorToken()) return;
    await Promise.all([
      refreshProfile(),
      refreshDashboard(),
      refreshOrders(),
      refreshWallet(),
      refreshMenu(),
      refreshSpecial(),
      refreshNotifications(),
    ]);
    markSynced();
  }, [refreshProfile, refreshDashboard, refreshOrders, refreshWallet, refreshMenu, refreshSpecial, refreshNotifications, markSynced]);
  useAutoRefresh(refreshQuietly, { enabled: Boolean(authToken), intervalMs: 10000 });

  const loadCategories = useCallback(async () => {
    try {
      const data = await vendorApi.menuCategories();
      if (mounted.current) setCategories(data.categories || []);
    } catch {
      /* categories are best-effort */
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (authToken) {
      refreshAll();
    } else {
      setVendor(null);
      setMenuItems([]);
      setOrders([]);
      setSpecial(null);
      setWallet({ withdrawn: 0, baseSales: 0, withdrawalHistory: [] });
      setDashboard(null);
      setMarketplaceMode(false);
    }
  }, [authToken, refreshAll]);

  useEffect(() => {
    const onUnauthorized = () => {
      clearVendorToken();
      setAuthToken('');
      setMarketplaceMode(false);
      setError('Your vendor session has expired. Please log in again.');
    };
    const onSignedOut = () => {
      clearVendorToken();
      setAuthToken('');
      setVendor(null);
      setMarketplaceMode(false);
    };
    const onBlocked = (event) => {
      onSignedOut();
      setLoginOtpPreview('');
      setAccountBlock(event.detail || { status: 'suspended' });
    };
    window.addEventListener('ofk:vendor-unauthorized', onUnauthorized);
    window.addEventListener('ofk:vendor-signed-out', onSignedOut);
    window.addEventListener('ofk:sessions-cleared', onSignedOut);
    window.addEventListener('ofk:vendor-blocked', onBlocked);
    return () => {
      window.removeEventListener('ofk:vendor-blocked', onBlocked);
      window.removeEventListener('ofk:vendor-unauthorized', onUnauthorized);
      window.removeEventListener('ofk:vendor-signed-out', onSignedOut);
      window.removeEventListener('ofk:sessions-cleared', onSignedOut);
    };
  }, []);

  /* ------------------------------- auth -------------------------------- */

  const requestLoginOtp = useCallback(
    async (phone) => {
      setAuthBusy(true);
      setError('');
      setAccountBlock(null);
      try {
        const result = await vendorApi.sendLoginOtp(phone);
        setPendingLoginPhone(result.phone_number);
        setLoginOtpPreview(result.dev_otp || '');
        return result;
      } catch (err) {
        if (!BLOCKED_VENDOR_CODES.includes(err.code)) {
          setError(err.message || 'Could not send a verification code.');
        }
        throw err;
      } finally {
        if (mounted.current) setAuthBusy(false);
      }
    },
    [],
  );

  const verifyLoginOtp = useCallback(
    async (code) => {
      setAuthBusy(true);
      setError('');
      try {
        const result = await vendorApi.verifyLoginOtp(pendingLoginPhone, code);
        clearAllSessions();
        setVendorToken(result.token);
        setAuthToken(result.token);
        setVendor(mapVendorAccount(result.vendor));
        setLoginOtpPreview('');
        return result;
      } catch (err) {
        if (!BLOCKED_VENDOR_CODES.includes(err.code)) {
          setError(err.message || 'Could not verify the code.');
        }
        throw err;
      } finally {
        if (mounted.current) setAuthBusy(false);
      }
    },
    [pendingLoginPhone],
  );

  const logout = useCallback(() => {
    clearAllSessions();
    setAuthToken('');
    setVendor(null);
    setMarketplaceMode(false);
    setError('');
  }, []);

  const clearAccountBlock = useCallback(() => setAccountBlock(null), []);

  const enterMarketplace = useCallback(() => setMarketplaceMode(true), []);
  const exitMarketplace = useCallback(() => setMarketplaceMode(false), []);

  const registerVendor = useCallback(async (data, files = []) => {
    const form = new FormData();
    form.append('name', data.name);
    form.append('owner_name', data.ownerName);
    form.append('vendor_type', data.type);
    form.append('phone', data.phone);
    if (data.email) form.append('email', data.email);
    form.append('description', data.description);
    form.append(
      'location',
      JSON.stringify({
        neighborhood: data.location,
        address: data.address || data.location,
        latitude: data.latitude,
        longitude: data.longitude,
      }),
    );
    form.append('food_categories', JSON.stringify(data.foodCategories || []));
    const day = 'monday';
    form.append(
      'operating_hours',
      JSON.stringify([
        { day, open_time: data.openTime || '08:00', close_time: data.closeTime || '20:00' },
      ]),
    );
    form.append(
      'payment_information',
      JSON.stringify(
        data.payoutMethod === 'Bank Transfer'
          ? {
              payout_method: 'bank_transfer',
              account_name: data.ownerName,
              account_number: data.payoutNumber,
            }
          : {
              payout_method: 'mobile_money',
              account_name: data.ownerName,
              mobile_money_number: data.payoutNumber || data.phone,
            },
      ),
    );
    (files || []).forEach((file) => form.append('documents', file));

    const result = await vendorApi.register(form);
    setIsRegistered(true);
    localStorage.setItem(STORAGE.registered, JSON.stringify(true));
    return mapVendorAccount(result.vendor);
  }, []);

  /* ------------------------------ profile ------------------------------ */

  const updateVendorProfile = useCallback(
    async (patch) => {
      const payload = {};
      if (patch.name !== undefined) payload.name = patch.name;
      if (patch.ownerName !== undefined) payload.owner_name = patch.ownerName;
      if (patch.description !== undefined) payload.description = patch.description;
      if (patch.phone !== undefined) payload.phone = patch.phone;
      if (patch.avatar !== undefined && patch.avatar !== '') {
        payload.profile_image_base64 = patch.avatar;
      }
      if (patch.bannerImage !== undefined && patch.bannerImage !== '') {
        payload.banner_image_base64 = patch.bannerImage;
      }
      // Registered kitchen location: { latitude, longitude, address, neighborhood }.
      if (patch.location) payload.location = patch.location;
      if (Object.keys(payload).length === 0) return;
      const { vendor: raw } = await vendorApi.updateProfile(payload);
      if (mounted.current) setVendor(mapVendorAccount(raw));
    },
    [],
  );

  /** Asks an admin to change the vendor type (code); the type changes only when approved. */
  const requestTypeChange = useCallback(async (vendorType, reason = '') => {
    const { vendor: raw } = await vendorApi.requestTypeChange({ vendor_type: vendorType, reason });
    if (mounted.current) setVendor(mapVendorAccount(raw));
  }, []);

  const cancelTypeChange = useCallback(async () => {
    const { vendor: raw } = await vendorApi.cancelTypeChange();
    if (mounted.current) setVendor(mapVendorAccount(raw));
  }, []);

  /**
   * Opens or closes the store. An open store shows on the map at the kitchen's
   * registered coordinates; the vendor's own position is never read.
   * Errors are surfaced through `storeError` rather than thrown.
   */
  const setStoreOpen = useCallback(async (open) => {
    setStoreError('');
    setStoreStatus('saving');
    try {
      const { vendor: raw } = await vendorApi.setAvailability({ is_open: Boolean(open) });
      if (mounted.current) setVendor(mapVendorAccount(raw));
      return true;
    } catch (err) {
      if (mounted.current) setStoreError(err.message);
      return false;
    } finally {
      if (mounted.current) setStoreStatus('idle');
    }
  }, []);

  const toggleStoreOpen = useCallback(
    () => setStoreOpen(!(vendor?.isLive ?? vendor?.isOpen)),
    [vendor?.isLive, vendor?.isOpen, setStoreOpen],
  );

  const clearStoreError = useCallback(() => setStoreError(''), []);

  /* ------------------------------ special ------------------------------ */

  const saveSpecial = useCallback(
    async ({ text, cutoffAt, deliveryAt }) => {
      const mapped = await vendorApi.saveSpecial({
        text,
        cutoff_at: cutoffAt,
        delivery_at: deliveryAt,
      });
      if (mounted.current) setSpecial(mapped);
      await refreshPublicCatalog();
      return mapped;
    },
    [refreshPublicCatalog],
  );

  const clearSpecial = useCallback(async () => {
    const mapped = await vendorApi.clearSpecial();
    if (mounted.current) setSpecial(mapped);
    await refreshPublicCatalog();
    return mapped;
  }, [refreshPublicCatalog]);

  /* -------------------------------- menu ------------------------------- */

  const categoriesByName = useMemo(() => {
    const map = {};
    categories.forEach((category) => {
      map[category.name] = category.id;
    });
    return map;
  }, [categories]);

  const addMenuItem = useCallback(
    async (data) => {
      const payload = buildMenuItemPayload(data, categoriesByName);
      await vendorApi.createMenuItem(payload);
      const mapped = await refreshMenu();
      await refreshPublicCatalog();
      return mapped[0];
    },
    [categoriesByName, refreshMenu, refreshPublicCatalog],
  );

  const updateMenuItem = useCallback(
    async (id, data) => {
      const payload = buildMenuItemPayload(data, categoriesByName);
      await vendorApi.updateMenuItem(id, payload);
      const mapped = await refreshMenu();
      await refreshPublicCatalog();
      return mapped;
    },
    [categoriesByName, refreshMenu, refreshPublicCatalog],
  );

  const deleteMenuItem = useCallback(
    async (id) => {
      await vendorApi.deleteMenuItem(id, true);
      const mapped = await refreshMenu();
      await refreshPublicCatalog();
      return mapped;
    },
    [refreshMenu, refreshPublicCatalog],
  );

  const toggleItemAvailability = useCallback(
    async (id) => {
      const current = menuItems.find((item) => item.id === id);
      if (!current) return;
      setMenuItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isAvailable: !item.isAvailable } : item)),
      );
      try {
        await vendorApi.setMenuAvailability(id, !current.isAvailable);
        await refreshPublicCatalog();
      } catch (err) {
        setMenuItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, isAvailable: current.isAvailable } : item)),
        );
        throw err;
      }
    },
    [menuItems, refreshPublicCatalog],
  );

  /* ------------------------------- orders ------------------------------ */

  const updateOrderStatus = useCallback(
    async (orderId, statusLabel) => {
      const target = orders.find((order) => order.id === orderId);
      const backendId = target?.backendId || orderId;
      const status = titleToStatus[statusLabel] || statusLabel.toLowerCase();
      await vendorApi.updateOrderStatus(backendId, status);
      await Promise.all([refreshOrders(), refreshDashboard(), refreshWallet()]);
      markSynced();
    },
    [orders, refreshOrders, refreshDashboard, refreshWallet, markSynced],
  );

  /** Pickup orders: the customer collected it; completes the order with their code. */
  const confirmPickup = useCallback(
    async (orderId, pickupCode) => {
      const target = orders.find((order) => order.id === orderId);
      await vendorApi.confirmPickup(target?.backendId || orderId, pickupCode);
      await Promise.all([refreshOrders(), refreshDashboard(), refreshWallet()]);
      markSynced();
    },
    [orders, refreshOrders, refreshDashboard, refreshWallet, markSynced],
  );

  const acceptOrder = useCallback((orderId) => updateOrderStatus(orderId, 'Accepted'), [updateOrderStatus]);
  const rejectOrder = useCallback((orderId) => updateOrderStatus(orderId, 'Cancelled'), [updateOrderStatus]);

  /* ------------------------------- wallet ------------------------------ */

  const requestWithdrawal = useCallback(
    async (amount, method = 'MTN Mobile Money') => {
      const result = await vendorApi.requestWithdrawal({ amount_rwf: amount, method });
      await Promise.all([refreshWallet(), refreshDashboard()]);
      return {
        id: result.withdrawal?.id,
        amount,
        method: result.withdrawal?.method_label || method,
        status: result.withdrawal?.status ? 'Processing' : 'Processing',
      };
    },
    [refreshWallet, refreshDashboard],
  );

  const stats = useMemo(
    () => (dashboard ? mapStats(dashboard) : EMPTY_STATS),
    [dashboard],
  );

  // Stable reference so consumers that depend on the array in effects
  // (e.g. the menu form) are not reset on every background refresh.
  const categoryNames = useMemo(
    () => categories.map((category) => category.name),
    [categories],
  );

  const isAuthenticated = Boolean(authToken && vendor);
  const hasToken = Boolean(authToken);

  const value = useMemo(
    () => ({
      vendor,
      rawVendor: vendor,
      menuItems,
      orders,
      special,
      wallet,
      categories,
      categoryNames,
      stats,
      isRegistered,
      isAuthenticated,
      hasToken,
      marketplaceMode,
      enterMarketplace,
      exitMarketplace,
      loading,
      authBusy,
      error,
      lastSyncedAt,
      markSynced,
      refreshAll,
      loadCategories,
      requestLoginOtp,
      verifyLoginOtp,
      pendingLoginPhone,
      loginOtpPreview,
      accountBlock,
      clearAccountBlock,
      logout,
      updateVendorProfile,
      requestTypeChange,
      cancelTypeChange,
      toggleStoreOpen,
      registerVendor,
      saveSpecial,
      clearSpecial,
      addMenuItem,
      updateMenuItem,
      deleteMenuItem,
      toggleItemAvailability,
      updateOrderStatus,
      confirmPickup,
      acceptOrder,
      rejectOrder,
      requestWithdrawal,
      notifications,
      unreadNotifications,
      notificationsLoaded,
      refreshNotifications,
      markNotificationRead,
      markAllNotificationsRead,
      setStoreOpen,
      storeStatus,
      storeError,
      clearStoreError,
    }),
    [
      vendor,
      menuItems,
      orders,
      special,
      wallet,
      categories,
      categoryNames,
      stats,
      isRegistered,
      isAuthenticated,
      hasToken,
      marketplaceMode,
      enterMarketplace,
      exitMarketplace,
      loading,
      authBusy,
      error,
      lastSyncedAt,
      markSynced,
      refreshAll,
      loadCategories,
      requestLoginOtp,
      verifyLoginOtp,
      pendingLoginPhone,
      loginOtpPreview,
      accountBlock,
      clearAccountBlock,
      logout,
      updateVendorProfile,
      requestTypeChange,
      cancelTypeChange,
      toggleStoreOpen,
      registerVendor,
      saveSpecial,
      clearSpecial,
      addMenuItem,
      updateMenuItem,
      deleteMenuItem,
      toggleItemAvailability,
      updateOrderStatus,
      confirmPickup,
      acceptOrder,
      rejectOrder,
      requestWithdrawal,
      notifications,
      unreadNotifications,
      notificationsLoaded,
      refreshNotifications,
      markNotificationRead,
      markAllNotificationsRead,
      setStoreOpen,
      storeStatus,
      storeError,
      clearStoreError,
    ],
  );

  return <VendorContext.Provider value={value}>{children}</VendorContext.Provider>;
}

export function useVendor() {
  const context = useContext(VendorContext);
  if (!context) throw new Error('useVendor must be used within <VendorProvider>');
  return context;
}
