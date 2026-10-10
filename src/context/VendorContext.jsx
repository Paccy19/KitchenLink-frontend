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
  buildMenuItemPayload,
  clearVendorToken,
  getVendorToken,
  mapMenuItem,
  mapOrder,
  mapStats,
  mapVendorAccount,
  mapWallet,
  setVendorToken,
  titleToStatus,
} from '../api/vendorApi';

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
  const [wallet, setWallet] = useState({ withdrawn: 0, baseSales: 0, withdrawalHistory: [] });
  const [dashboard, setDashboard] = useState(null);
  const [categories, setCategories] = useState([]);
  const [isRegistered, setIsRegistered] = useState(() => readFlag(STORAGE.registered));
  const [lastSyncedAt, setLastSyncedAt] = useState(() => new Date().toISOString());
  const [authToken, setAuthToken] = useState(() => getVendorToken());
  const [loading, setLoading] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [error, setError] = useState('');
  const [pendingLoginPhone, setPendingLoginPhone] = useState('');
  const [loginOtpPreview, setLoginOtpPreview] = useState('');
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

  const refreshAll = useCallback(async () => {
    if (!getVendorToken()) return;
    setLoading(true);
    setError('');
    try {
      await refreshProfile();
      await Promise.all([refreshDashboard(), refreshMenu(), refreshOrders(), refreshWallet()]);
      markSynced();
    } catch (err) {
      if (mounted.current) setError(err.message || 'Failed to load your dashboard.');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [refreshProfile, refreshDashboard, refreshMenu, refreshOrders, refreshWallet, markSynced]);

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
      setWallet({ withdrawn: 0, baseSales: 0, withdrawalHistory: [] });
      setDashboard(null);
    }
  }, [authToken, refreshAll]);

  useEffect(() => {
    const onUnauthorized = () => {
      clearVendorToken();
      setAuthToken('');
      setError('Your vendor session has expired. Please log in again.');
    };
    window.addEventListener('ofk:vendor-unauthorized', onUnauthorized);
    return () => window.removeEventListener('ofk:vendor-unauthorized', onUnauthorized);
  }, []);

  /* ------------------------------- auth -------------------------------- */

  const requestLoginOtp = useCallback(
    async (phone) => {
      setAuthBusy(true);
      setError('');
      try {
        const result = await vendorApi.sendLoginOtp(phone);
        setPendingLoginPhone(result.phone_number);
        setLoginOtpPreview(result.dev_otp || '');
        return result;
      } catch (err) {
        setError(err.message || 'Could not send a verification code.');
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
        setVendorToken(result.token);
        setAuthToken(result.token);
        setVendor(mapVendorAccount(result.vendor));
        setLoginOtpPreview('');
        return result;
      } catch (err) {
        setError(err.message || 'Could not verify the code.');
        throw err;
      } finally {
        if (mounted.current) setAuthBusy(false);
      }
    },
    [pendingLoginPhone],
  );

  const logout = useCallback(() => {
    clearVendorToken();
    setAuthToken('');
    setVendor(null);
    setError('');
  }, []);

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
        latitude: data.latitude ?? -1.9441,
        longitude: data.longitude ?? 30.0619,
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
      JSON.stringify({
        payout_method: 'mobile_money',
        account_name: data.ownerName,
        mobile_money_number: data.payoutNumber || data.phone,
      }),
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
      if (patch.isOpen !== undefined) payload.is_open = patch.isOpen;
      if (patch.avatar !== undefined && patch.avatar !== '') {
        payload.profile_image_base64 = patch.avatar;
      }
      if (patch.bannerImage !== undefined && patch.bannerImage !== '') {
        payload.banner_image_base64 = patch.bannerImage;
      }
      if (Object.keys(payload).length === 0) return;
      const { vendor: raw } = await vendorApi.updateProfile(payload);
      if (mounted.current) setVendor(mapVendorAccount(raw));
    },
    [],
  );

  const toggleStoreOpen = useCallback(async () => {
    const next = !(vendor?.isOpen);
    setVendor((prev) => (prev ? { ...prev, isOpen: next } : prev));
    try {
      await updateVendorProfile({ isOpen: next });
    } catch (err) {
      setVendor((prev) => (prev ? { ...prev, isOpen: !next } : prev));
      throw err;
    }
  }, [vendor?.isOpen, updateVendorProfile]);

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

  const acceptOrder = useCallback((orderId) => updateOrderStatus(orderId, 'Accepted'), [updateOrderStatus]);
  const rejectOrder = useCallback((orderId) => updateOrderStatus(orderId, 'Cancelled'), [updateOrderStatus]);
  const completeOrder = useCallback((orderId) => updateOrderStatus(orderId, 'Completed'), [updateOrderStatus]);

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

  const isAuthenticated = Boolean(authToken && vendor);
  const hasToken = Boolean(authToken);

  const value = useMemo(
    () => ({
      vendor,
      rawVendor: vendor,
      menuItems,
      orders,
      wallet,
      categories,
      categoryNames: categories.map((category) => category.name),
      stats,
      isRegistered,
      isAuthenticated,
      hasToken,
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
      logout,
      updateVendorProfile,
      toggleStoreOpen,
      registerVendor,
      addMenuItem,
      updateMenuItem,
      deleteMenuItem,
      toggleItemAvailability,
      updateOrderStatus,
      acceptOrder,
      rejectOrder,
      completeOrder,
      requestWithdrawal,
    }),
    [
      vendor,
      menuItems,
      orders,
      wallet,
      categories,
      stats,
      isRegistered,
      isAuthenticated,
      hasToken,
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
      logout,
      updateVendorProfile,
      toggleStoreOpen,
      registerVendor,
      addMenuItem,
      updateMenuItem,
      deleteMenuItem,
      toggleItemAvailability,
      updateOrderStatus,
      acceptOrder,
      rejectOrder,
      completeOrder,
      requestWithdrawal,
    ],
  );

  return <VendorContext.Provider value={value}>{children}</VendorContext.Provider>;
}

export function useVendor() {
  const context = useContext(VendorContext);
  if (!context) throw new Error('useVendor must be used within <VendorProvider>');
  return context;
}
