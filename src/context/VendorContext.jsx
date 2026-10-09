import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ACTIVE_VENDOR,
  INITIAL_MENU_ITEMS,
  INITIAL_VENDOR_WALLET,
  buildInitialVendorOrders,
} from '../data/vendorMockData';

const VendorContext = createContext(null);

const STORAGE = {
  profile: 'ofk_vendor_profile',
  menu: 'ofk_vendor_menu',
  orders: 'ofk_vendor_orders',
  wallet: 'ofk_vendor_wallet',
  registered: 'ofk_vendor_registered',
};

function readStorage(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

const ACTIVE_STATUSES = ['New', 'Accepted', 'Preparing', 'Ready'];
const CANCELLED_STATUSES = ['Cancelled', 'Rejected'];

const sameDay = (iso, reference) => {
  const date = new Date(iso);
  return date.toDateString() === reference.toDateString();
};

let menuSeed = 0;
const nextMenuId = () => `dish-${Date.now()}-${++menuSeed}`;

export function VendorProvider({ children }) {
  const [vendor, setVendor] = useState(() => readStorage(STORAGE.profile, ACTIVE_VENDOR));
  const [menuItems, setMenuItems] = useState(() => readStorage(STORAGE.menu, INITIAL_MENU_ITEMS));
  const [orders, setOrders] = useState(() => {
    const saved = readStorage(STORAGE.orders, null);
    return Array.isArray(saved) ? saved : buildInitialVendorOrders();
  });
  const [wallet, setWallet] = useState(() => readStorage(STORAGE.wallet, INITIAL_VENDOR_WALLET));
  const [isRegistered, setIsRegistered] = useState(() => readStorage(STORAGE.registered, false));
  const [lastSyncedAt, setLastSyncedAt] = useState(() => new Date().toISOString());

  useEffect(() => {
    localStorage.setItem(STORAGE.profile, JSON.stringify(vendor));
  }, [vendor]);

  useEffect(() => {
    localStorage.setItem(STORAGE.menu, JSON.stringify(menuItems));
  }, [menuItems]);

  useEffect(() => {
    localStorage.setItem(STORAGE.orders, JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem(STORAGE.wallet, JSON.stringify(wallet));
  }, [wallet]);

  useEffect(() => {
    localStorage.setItem(STORAGE.registered, JSON.stringify(isRegistered));
  }, [isRegistered]);

  const markSynced = useCallback(() => setLastSyncedAt(new Date().toISOString()), []);

  const updateVendorProfile = useCallback((patch) => {
    setVendor((prev) => ({ ...prev, ...patch }));
  }, []);

  const toggleStoreOpen = useCallback(() => {
    setVendor((prev) => ({ ...prev, isOpen: !prev.isOpen }));
  }, []);

  /**
   * Creates a brand-new vendor account from the registration application.
   * When `sampleData` is true the new account is preloaded with demo menu,
   * orders and wallet figures so the dashboard is explorable immediately.
   */
  const registerVendor = useCallback((data, { sampleData = true } = {}) => {
    const created = {
      ...ACTIVE_VENDOR,
      id: `vendor-${Date.now()}`,
      name: data.name,
      type: data.type,
      ownerName: data.ownerName,
      phone: data.phone,
      email: data.email || '',
      location: data.location,
      address: data.address || data.location,
      description: data.description,
      foodCategories: data.foodCategories?.length ? data.foodCategories : ACTIVE_VENDOR.foodCategories,
      operatingHours: data.operatingHours || ACTIVE_VENDOR.operatingHours,
      payoutMethod: data.payoutMethod || '',
      payoutNumber: data.payoutNumber || '',
      documents: data.documents || [],
      verificationStatus: 'Pending',
      isOpen: false,
      rating: 0,
      reviewsCount: 0,
      joinedAt: new Date().toISOString(),
    };

    setVendor(created);
    setIsRegistered(true);

    if (sampleData) {
      setMenuItems(INITIAL_MENU_ITEMS);
      setOrders(buildInitialVendorOrders());
      setWallet(INITIAL_VENDOR_WALLET);
    } else {
      setMenuItems([]);
      setOrders([]);
      setWallet({ withdrawn: 0, baseSales: 0, withdrawalHistory: [] });
    }
    setLastSyncedAt(new Date().toISOString());
    return created;
  }, []);

  const resetToDemoAccount = useCallback(() => {
    setVendor(ACTIVE_VENDOR);
    setMenuItems(INITIAL_MENU_ITEMS);
    setOrders(buildInitialVendorOrders());
    setWallet(INITIAL_VENDOR_WALLET);
    setIsRegistered(false);
  }, []);

  /* ----------------------------- Menu CRUD ----------------------------- */

  const addMenuItem = useCallback((data) => {
    const created = {
      id: nextMenuId(),
      isAvailable: true,
      isPreorder: false,
      preorderCutoff: '',
      popular: false,
      options: [],
      ...data,
    };
    setMenuItems((prev) => [created, ...prev]);
    return created;
  }, []);

  const updateMenuItem = useCallback((id, data) => {
    setMenuItems((prev) => prev.map((entry) => (entry.id === id ? { ...entry, ...data } : entry)));
  }, []);

  const deleteMenuItem = useCallback((id) => {
    setMenuItems((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  const toggleItemAvailability = useCallback((id) => {
    setMenuItems((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, isAvailable: !entry.isAvailable } : entry)),
    );
  }, []);

  /* ---------------------------- Order flow ----------------------------- */

  const updateOrderStatus = useCallback((orderId, status) => {
    setOrders((prev) => prev.map((order) => (order.id === orderId ? { ...order, status } : order)));
    markSynced();
  }, [markSynced]);

  const acceptOrder = useCallback((orderId) => updateOrderStatus(orderId, 'Accepted'), [updateOrderStatus]);
  const rejectOrder = useCallback((orderId) => updateOrderStatus(orderId, 'Cancelled'), [updateOrderStatus]);
  const completeOrder = useCallback((orderId) => updateOrderStatus(orderId, 'Completed'), [updateOrderStatus]);

  /* ------------------------------ Wallet ------------------------------- */

  const requestWithdrawal = useCallback((amount, method = 'MTN Mobile Money') => {
    const entry = {
      id: `WD-${new Date().getFullYear()}-${String(Math.floor(100 + Math.random() * 900))}`,
      amount,
      method,
      date: new Date().toISOString(),
      status: 'Processing',
    };
    setWallet((prev) => ({
      ...prev,
      withdrawn: prev.withdrawn + amount,
      withdrawalHistory: [entry, ...(prev.withdrawalHistory || [])],
    }));
    return entry;
  }, []);

  /* ------------------------------- Stats ------------------------------- */

  const stats = useMemo(() => {
    const now = new Date();
    const completed = orders.filter((order) => order.status === 'Completed');
    const todayOrders = orders.filter(
      (order) => sameDay(order.createdAt, now) && !CANCELLED_STATUSES.includes(order.status),
    );

    const completedRevenue = completed.reduce((sum, order) => sum + order.total, 0);
    const totalSales = wallet.baseSales + completedRevenue;
    const commission = Math.round(totalSales * vendor.commissionRate);
    const netEarned = totalSales - commission;

    const activeRevenue = orders
      .filter((order) => ACTIVE_STATUSES.includes(order.status))
      .reduce((sum, order) => sum + order.total, 0);

    return {
      todayOrdersCount: todayOrders.length,
      pendingOrders: orders.filter((order) => order.status === 'New').length,
      preparingOrders: orders.filter((order) => order.status === 'Preparing').length,
      completedOrders: completed.length,
      cancelledOrders: orders.filter((order) => CANCELLED_STATUSES.includes(order.status)).length,
      todaySales: todayOrders.reduce((sum, order) => sum + order.total, 0),
      totalSales,
      commission,
      netEarned,
      availableBalance: Math.max(0, netEarned - wallet.withdrawn),
      pendingBalance: Math.round(activeRevenue * (1 - vendor.commissionRate)),
      withdrawn: wallet.withdrawn,
    };
  }, [orders, wallet, vendor.commissionRate]);

  const value = useMemo(
    () => ({
      vendor,
      menuItems,
      orders,
      wallet,
      stats,
      isRegistered,
      lastSyncedAt,
      markSynced,
      updateVendorProfile,
      toggleStoreOpen,
      registerVendor,
      resetToDemoAccount,
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
      stats,
      isRegistered,
      lastSyncedAt,
      markSynced,
      updateVendorProfile,
      toggleStoreOpen,
      registerVendor,
      resetToDemoAccount,
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
