import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  driverApi,
  clearDriverToken,
  getDriverToken,
  mapDelivery,
  mapDriverAccount,
  mapDriverEarnings,
  mapDriverNotification,
  mapDriverStats,
  mapDriverWallet,
  setDriverToken,
} from '../api/driverApi';
import { clearAllSessions } from '../api/session';
import useAutoRefresh from '../hooks/useAutoRefresh';
import { useToast } from '../components/common/Toast';

const DriverContext = createContext(null);

const readFlag = (key, fallback = false) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
};

const EMPTY_STATS = mapDriverStats({});

// Delivery updates that pop up as they arrive, with their toast style.
const DELIVERY_ALERTS = {
  delivery_ready: 'success',
  delivery_pickup_reminder: 'error',
  delivery_late: 'error',
  delivery_taken: 'info',
  delivery_cancelled: 'error',
};

// While online, the position is re-sent this often so only drivers who are
// really nearby are offered orders.
const LOCATION_SHARE_MS = 60 * 1000;

// Live tracking during a delivery: send a fix at most every 4 s when the
// rider moved 8 m+, and at least every 15 s while standing still.
const LIVE_SEND_MIN_MS = 4000;
const LIVE_SEND_MAX_MS = 15000;
const LIVE_SEND_MIN_MOVE_M = 8;

const toRad = (deg) => (deg * Math.PI) / 180;
function metresBetween(a, b) {
  const x = toRad(b.longitude - a.longitude) * Math.cos(toRad((a.latitude + b.latitude) / 2));
  const y = toRad(b.latitude - a.latitude);
  return Math.hypot(x, y) * 6371000;
}
function bearingBetween(a, b) {
  const y = Math.sin(toRad(b.longitude - a.longitude)) * Math.cos(toRad(b.latitude));
  const x =
    Math.cos(toRad(a.latitude)) * Math.sin(toRad(b.latitude)) -
    Math.sin(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.cos(toRad(b.longitude - a.longitude));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function DriverProvider({ children }) {
  const toast = useToast();
  const [driver, setDriver] = useState(null);
  const [authToken, setAuthToken] = useState(() => getDriverToken());
  const [marketplaceMode, setMarketplaceMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [error, setError] = useState('');
  const [pendingLoginPhone, setPendingLoginPhone] = useState('');
  const [loginOtpPreview, setLoginOtpPreview] = useState('');

  const [stats, setStats] = useState(EMPTY_STATS);
  const [availableDeliveries, setAvailableDeliveries] = useState([]);
  const [activeDelivery, setActiveDelivery] = useState(null);
  const [history, setHistory] = useState([]);
  const [earnings, setEarnings] = useState(null);
  const [wallet, setWallet] = useState(null);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [lastSyncedAt, setLastSyncedAt] = useState(() => new Date().toISOString());
  const knownOfferIds = useRef(new Set());
  const knownNotificationIds = useRef(new Set());

  const [location, setLocation] = useState(null);
  const [sharingLocation, setSharingLocation] = useState(false);

  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const markSynced = useCallback(() => setLastSyncedAt(new Date().toISOString()), []);

  /* ------------------------------ loaders ------------------------------ */

  const refreshProfile = useCallback(async () => {
    const { driver: raw } = await driverApi.me();
    if (!mounted.current) return raw;
    const mapped = mapDriverAccount(raw);
    setDriver(mapped);
    return mapped;
  }, []);

  const updateDriverProfile = useCallback(
    async (patch) => {
      const payload = {};
      if (patch.name !== undefined) payload.name = patch.name;
      if (patch.email !== undefined) payload.email = patch.email || null;
      if (patch.plateNumber !== undefined) payload.plate_number = patch.plateNumber;
      if (patch.vehicleType !== undefined) payload.vehicle_type = patch.vehicleType;
      if (patch.avatar !== undefined && patch.avatar !== '') {
        payload.profile_image_base64 = patch.avatar;
      }
      if (Object.keys(payload).length === 0) return;
      setDriver((prev) => (prev ? { ...prev, ...patch } : prev));
      const { driver: raw } = await driverApi.updateProfile(payload);
      if (mounted.current) setDriver(mapDriverAccount(raw));
      return raw;
    },
    [],
  );

  const refreshStats = useCallback(async () => {
    const raw = await driverApi.stats();
    if (!mounted.current) return raw;
    const mapped = mapDriverStats(raw);
    setStats(mapped);
    setDriver((prev) =>
      prev
        ? { ...prev, isOnline: mapped.isOnline, status: mapped.status, activeDeliveries: mapped.activeDeliveries }
        : prev,
    );
    return mapped;
  }, []);

  const refreshNotifications = useCallback(async () => {
    const raw = await driverApi.notifications({ limit: 30 });
    if (!mounted.current) return [];
    const mapped = (raw.notifications || []).map(mapDriverNotification);
    const count = Number(raw.unread_count ?? mapped.filter((n) => !n.read).length);

    const firstBatch = knownNotificationIds.current.size === 0;
    const fresh = mapped.filter((n) => !n.read && !knownNotificationIds.current.has(n.id));
    const freshOffers = fresh.filter((n) => n.type === 'delivery_offer');

    const systemAlert = (title, body) => {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
        new Notification(title, { body, icon: '/favicon.svg' });
      }
    };

    if (!firstBatch) {
      if (freshOffers.length > 0) {
        const offer = freshOffers[0];
        const vendor = offer.data.vendor_name || 'A nearby vendor';
        const earnings = Number(offer.data.earnings_rwf || 0);
        systemAlert(offer.title || 'New order to deliver', `${vendor} · earn ${earnings.toLocaleString()} RWF`);
        toast.info(`${offer.title || 'New order'} · ${vendor} · earn ${earnings.toLocaleString()} RWF`);
      }
      // Assignment updates: food ready, pickup reminders, late pickup, taken, cancelled.
      fresh
        .filter((n) => DELIVERY_ALERTS[n.type])
        .forEach((n) => {
          systemAlert(n.title, n.body);
          toast[DELIVERY_ALERTS[n.type]](n.body || n.title);
        });
    }
    fresh.forEach((n) => knownNotificationIds.current.add(n.id));

    setNotifications(mapped);
    setUnreadCount(count);
    return mapped;
  }, [toast]);

  const markNotificationRead = useCallback(async (id) => {
    await driverApi.markNotificationRead(id);
    if (!mounted.current) return;
    setNotifications((prev) =>
      prev.map((n) => (n.id === id && !n.read ? { ...n, read: true, readAt: new Date().toISOString() } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    await driverApi.markAllNotificationsRead();
    if (!mounted.current) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true, readAt: new Date().toISOString() })));
    setUnreadCount(0);
  }, []);

  const refreshAvailable = useCallback(async () => {
    const coords = location
      ? { lat: location.latitude, lng: location.longitude }
      : {};
    const raw = await driverApi.available(coords);
    if (!mounted.current) return [];
    const mapped = (raw.deliveries || []).map(mapDelivery);

    const nextIds = new Set(mapped.map((delivery) => delivery.id));
    const newOffers = mapped.filter((delivery) => !knownOfferIds.current.has(delivery.id));
    const firstBatch = knownOfferIds.current.size === 0;

    if (!firstBatch && newOffers.length > 0 && typeof Notification !== 'undefined') {
      if (Notification.permission === 'granted' && document.visibilityState !== 'visible') {
        const offer = newOffers[0];
        new Notification('New delivery offer', {
          body: `${offer.vendor?.name || 'A vendor'} → ${offer.dropoff?.address || 'customer'} · ${offer.promisedEarnings} RWF`,
          icon: '/favicon.svg',
        });
      }
      toast.info(`New delivery offer available · ${newOffers.length} on the board`);
    }
    newOffers.forEach((offer) => knownOfferIds.current.add(offer.id));

    setAvailableDeliveries(mapped);
    return mapped;
  }, [location, toast]);

  const refreshActive = useCallback(async () => {
    const raw = await driverApi.active();
    if (!mounted.current) return null;
    const mapped = raw.delivery ? mapDelivery(raw.delivery) : null;
    setActiveDelivery(mapped);
    return mapped;
  }, []);

  const refreshHistory = useCallback(async () => {
    const raw = await driverApi.history({ limit: 20 });
    if (!mounted.current) return [];
    const mapped = (raw.deliveries || []).map(mapDelivery);
    setHistory(mapped);
    return mapped;
  }, []);

  const refreshEarnings = useCallback(async () => {
    const raw = await driverApi.earnings({ limit: 20 });
    if (!mounted.current) return null;
    const mapped = mapDriverEarnings(raw);
    setEarnings(mapped);
    return mapped;
  }, []);

  const refreshWallet = useCallback(async () => {
    const raw = await driverApi.wallet();
    if (!mounted.current) return null;
    const mapped = mapDriverWallet(raw);
    setWallet(mapped);
    return mapped;
  }, []);

  /** Request a payout of `amount` RWF to a mobile money number. */
  const requestWithdrawal = useCallback(
    async ({ amount, method, phone }) => {
      const result = await driverApi.requestWithdrawal({ amount_rwf: amount, method, phone });
      await refreshWallet();
      return result.withdrawal;
    },
    [refreshWallet],
  );

  const refreshAll = useCallback(async () => {
    if (!getDriverToken()) return;
    setLoading(true);
    setError('');
    try {
      await refreshProfile();
      await Promise.all([
        refreshStats(),
        refreshActive(),
        refreshAvailable(),
        refreshNotifications(),
      ]);
      markSynced();
    } catch (err) {
      if (mounted.current) setError(err.message || 'Failed to load your dashboard.');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [refreshProfile, refreshStats, refreshActive, refreshAvailable, refreshNotifications, markSynced]);

  /* ------------------------------- polling ------------------------------ */

  const poll = useCallback(async () => {
    if (!getDriverToken()) {
      setAvailableDeliveries([]);
      setActiveDelivery(null);
      return;
    }
    try {
      await Promise.all([
        refreshStats(),
        refreshActive(),
        refreshAvailable(),
        refreshNotifications(),
      ]);
      if (mounted.current) markSynced();
    } catch {
      /* transient poll failure is fine */
    }
  }, [refreshStats, refreshActive, refreshAvailable, refreshNotifications, markSynced]);

  useEffect(() => {
    if (authToken) refreshAll();
  }, [authToken, refreshAll]);

  // Stay current after any action and every 10s (new offers, payouts...).
  const refreshLive = useCallback(async () => {
    await poll();
    await refreshWallet().catch(() => null);
  }, [poll, refreshWallet]);
  useAutoRefresh(refreshLive, { enabled: Boolean(authToken), intervalMs: 10000 });

  useEffect(() => {
    const reset = () => {
      clearDriverToken();
      setAuthToken('');
      setDriver(null);
      setStats(EMPTY_STATS);
      setAvailableDeliveries([]);
      setActiveDelivery(null);
      setNotifications([]);
      setUnreadCount(0);
      knownOfferIds.current = new Set();
      knownNotificationIds.current = new Set();
      setMarketplaceMode(false);
    };
    const onUnauthorized = () => {
      reset();
      setError('Your delivery worker session has expired. Please log in again.');
    };
    window.addEventListener('ofk:driver-unauthorized', onUnauthorized);
    window.addEventListener('ofk:sessions-cleared', reset);
    return () => {
      window.removeEventListener('ofk:driver-unauthorized', onUnauthorized);
      window.removeEventListener('ofk:sessions-cleared', reset);
    };
  }, []);

  /* ------------------------------- auth -------------------------------- */

  const requestLoginOtp = useCallback(async (phone) => {
    setAuthBusy(true);
    setError('');
    try {
      const result = await driverApi.sendLoginOtp(phone);
      setPendingLoginPhone(result.phone_number);
      setLoginOtpPreview(result.dev_otp || '');
      return result;
    } catch (err) {
      setError(err.message || 'Could not send a verification code.');
      throw err;
    } finally {
      if (mounted.current) setAuthBusy(false);
    }
  }, []);

  const verifyLoginOtp = useCallback(
    async (code) => {
      setAuthBusy(true);
      setError('');
      try {
        const result = await driverApi.verifyLoginOtp(pendingLoginPhone, code);
        clearAllSessions();
        setDriverToken(result.token);
        setAuthToken(result.token);
        setDriver(mapDriverAccount(result.driver));
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
    clearAllSessions();
    setAuthToken('');
    setDriver(null);
    setStats(EMPTY_STATS);
    setAvailableDeliveries([]);
    setActiveDelivery(null);
    setNotifications([]);
    setUnreadCount(0);
    knownOfferIds.current = new Set();
    knownNotificationIds.current = new Set();
    setMarketplaceMode(false);
    setError('');
  }, []);

  const enterMarketplace = useCallback(() => setMarketplaceMode(true), []);
  const exitMarketplace = useCallback(() => setMarketplaceMode(false), []);

  const registerDriver = useCallback(
    async (data) => {
      const result = await driverApi.register({
        name: data.name,
        phone: data.phone,
        vehicle_type: data.vehicleType,
        plate_number: data.plateNumber || '',
        ...(data.email ? { email: data.email } : {}),
      });
      if (mounted.current) setError('');
      toast.success('Delivery worker account created — log in with a verification code');
      return result.driver;
    },
    [toast],
  );

  /* --------------------------- availability ---------------------------- */

  const toggleOnline = useCallback(
    async () => {
      const next = !(driver?.isOnline ?? stats.isOnline);
      setDriver((prev) => (prev ? { ...prev, isOnline: next } : prev));
      setStats((prev) => ({ ...prev, isOnline: next, status: next ? 'online' : 'offline' }));
      try {
        const result = await driverApi.setAvailability(next);
        const mapped = mapDriverAccount(result.driver);
        setDriver((prev) => ({ ...(prev || {}), ...mapped }));
        await refreshStats();
        if (mounted.current) setActiveDelivery(null);
        if (next && result.reassigned_deliveries > 0) {
          toast.success(`Reassigned ${result.reassigned_deliveries} delivery(ies) from your session`);
        }
      } catch (err) {
        setDriver((prev) => (prev ? { ...prev, isOnline: !next } : prev));
        setStats((prev) => ({ ...prev, isOnline: !next }));
        throw err;
      }
    },
    [driver?.isOnline, stats.isOnline, refreshStats, toast],
  );

  const enableNotifications = useCallback(async () => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }, []);

  /* ------------------------------ location ----------------------------- */

  const shareLocation = useCallback(
    async () => {
      if (!('geolocation' in navigator)) return null;
      setSharingLocation(true);
      try {
        const coords = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (pos) =>
              resolve({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
              }),
            reject,
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 },
          );
        });
        setLocation(coords);
        const result = await driverApi.updateLocation(coords);
        return result;
      } finally {
        if (mounted.current) setSharingLocation(false);
      }
    },
    [],
  );

  // Keep the position current while online (and while delivering), so the
  // 7.5 km matching uses where the driver really is.
  const onDuty = Boolean(authToken) && Boolean(driver?.isOnline ?? stats.isOnline);
  // While delivering, live GPS tracking (below) replaces the minute updates.
  const delivering = Boolean(authToken && activeDelivery);
  useEffect(() => {
    if (!onDuty || delivering) return undefined;
    const share = () => {
      if (document.visibilityState === 'hidden') return;
      shareLocation().catch(() => null);
    };
    share();
    const timer = setInterval(share, LOCATION_SHARE_MS);
    return () => clearInterval(timer);
  }, [onDuty, delivering, shareLocation]);

  // Live GPS while a delivery is active: the customer watches the rider move
  // on their map and the navigation view follows them, like a GPS tracker.
  const [liveFix, setLiveFix] = useState(null);
  const [gpsError, setGpsError] = useState('');
  useEffect(() => {
    if (!delivering || typeof navigator === 'undefined' || !navigator.geolocation) return undefined;
    let previous = null;
    let lastSent = null;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        const fix = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          heading: Number.isFinite(pos.coords.heading) ? pos.coords.heading : null,
          speedMps: Number.isFinite(pos.coords.speed) ? pos.coords.speed : null,
          accuracyM: Math.round(pos.coords.accuracy ?? 0),
          at: now,
        };
        // Phones only report a heading while moving; derive it from the last fix otherwise.
        if (fix.heading == null && previous && metresBetween(previous, fix) >= 4) {
          fix.heading = bearingBetween(previous, fix);
        } else if (fix.heading == null && previous) {
          fix.heading = previous.heading;
        }
        previous = fix;
        setLiveFix(fix);
        setLocation({ latitude: fix.latitude, longitude: fix.longitude });
        setGpsError('');

        const moved = lastSent ? metresBetween(lastSent, fix) : Infinity;
        const since = lastSent ? now - lastSent.at : Infinity;
        if (since >= LIVE_SEND_MIN_MS && (moved >= LIVE_SEND_MIN_MOVE_M || since >= LIVE_SEND_MAX_MS)) {
          lastSent = fix;
          driverApi.updateLocation(fix).catch(() => null);
        }
      },
      (err) => {
        setGpsError(
          err?.code === 1
            ? 'Location permission is off. Allow location so the customer can follow your delivery.'
            : 'Waiting for GPS… move to an open area if this takes long.',
        );
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [delivering]);

  /* --------------------------- delivery actions ------------------------ */

  const acceptDelivery = useCallback(
    async (id) => {
      let result;
      try {
        result = await driverApi.acceptDelivery(id);
      } catch (err) {
        // e.g. "Order … has already been assigned to another delivery worker."
        if (mounted.current) {
          toast.error(err.message || 'Could not accept this delivery.');
          setAvailableDeliveries((prev) => prev.filter((d) => d.id !== id));
        }
        refreshAvailable().catch(() => null);
        throw err;
      }
      const [active, av] = await Promise.all([refreshActive(), refreshAvailable()]);
      await refreshStats();
      if (mounted.current) {
        toast.success(result?.message ? `Delivery accepted. ${result.message}` : 'Delivery accepted — head to the vendor');
        setAvailableDeliveries((prev) => prev.filter((d) => d.id !== id));
      }
      return active || av.find((d) => d.id === id);
    },
    [refreshActive, refreshAvailable, refreshStats, toast],
  );

  const rejectDelivery = useCallback(
    async (id) => {
      await driverApi.rejectDelivery(id);
      if (mounted.current) {
        setAvailableDeliveries((prev) => prev.filter((d) => d.id !== id));
        toast.info('Delivery declined');
      }
      await refreshAvailable();
    },
    [refreshAvailable, toast],
  );

  const updateStatus = useCallback(
    async (id, status) => {
      await driverApi.updateStatus(id, status);
      await Promise.all([refreshActive(), refreshStats()]);
      if (mounted.current) markSynced();
    },
    [refreshActive, refreshStats, markSynced],
  );

  const confirmDelivery = useCallback(
    async (id, { otpCode, photoBase64 }) => {
      const result = await driverApi.confirmDelivery(id, {
        otp_code: otpCode,
        proof_photo_base64: photoBase64 || undefined,
      });
      if (mounted.current) {
        setActiveDelivery(null);
        toast.success(`Delivery completed — earned ${result.earned_rwf.toLocaleString()} RWF`);
      }
      await Promise.all([refreshStats(), refreshEarnings(), refreshHistory(), refreshWallet()]);
      return result;
    },
    [refreshStats, refreshEarnings, refreshHistory, refreshWallet, toast],
  );

  /* ------------------------------ computed ------------------------------ */

  const isAuthenticated = Boolean(authToken && driver);
  const hasToken = Boolean(authToken);
  const isOnline = driver?.isOnline ?? stats.isOnline;

  const value = useMemo(
    () => ({
      driver,
      stats,
      availableDeliveries,
      activeDelivery,
      history,
      earnings,
      notifications,
      unreadCount,
      refreshNotifications,
      markNotificationRead,
      markAllNotificationsRead,
      location,
      sharingLocation,
      liveFix,
      gpsError,
      isAuthenticated,
      hasToken,
      marketplaceMode,
      enterMarketplace,
      exitMarketplace,
      isOnline,
      loading,
      authBusy,
      error,
      lastSyncedAt,
      markSynced,
      refreshAll,
      refreshHistory,
      refreshEarnings,
      wallet,
      refreshWallet,
      requestWithdrawal,
      refreshProfile,
      updateDriverProfile,
      requestLoginOtp,
      verifyLoginOtp,
      pendingLoginPhone,
      loginOtpPreview,
      logout,
      registerDriver,
      toggleOnline,
      shareLocation,
      enableNotifications,
      acceptDelivery,
      rejectDelivery,
      updateStatus,
      confirmDelivery,
    }),
    [
      driver,
      stats,
      availableDeliveries,
      activeDelivery,
      history,
      earnings,
      notifications,
      unreadCount,
      refreshNotifications,
      markNotificationRead,
      markAllNotificationsRead,
      location,
      sharingLocation,
      liveFix,
      gpsError,
      isAuthenticated,
      hasToken,
      marketplaceMode,
      enterMarketplace,
      exitMarketplace,
      isOnline,
      loading,
      authBusy,
      error,
      lastSyncedAt,
      markSynced,
      refreshAll,
      refreshHistory,
      refreshEarnings,
      wallet,
      refreshWallet,
      requestWithdrawal,
      refreshProfile,
      updateDriverProfile,
      requestLoginOtp,
      verifyLoginOtp,
      pendingLoginPhone,
      loginOtpPreview,
      logout,
      registerDriver,
      toggleOnline,
      shareLocation,
      enableNotifications,
      acceptDelivery,
      rejectDelivery,
      updateStatus,
      confirmDelivery,
    ],
  );

  return <DriverContext.Provider value={value}>{children}</DriverContext.Provider>;
}

export function useDriver() {
  const context = useContext(DriverContext);
  if (!context) throw new Error('useDriver must be used within <DriverProvider>');
  return context;
}