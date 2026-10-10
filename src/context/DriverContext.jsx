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
  mapDriverStats,
  setDriverToken,
} from '../api/driverApi';
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

export function DriverProvider({ children }) {
  const toast = useToast();
  const [driver, setDriver] = useState(null);
  const [authToken, setAuthToken] = useState(() => getDriverToken());
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

  const [location, setLocation] = useState(null);
  const [sharingLocation, setSharingLocation] = useState(false);

  const [lastSyncedAt, setLastSyncedAt] = useState(() => new Date().toISOString());
  const knownOfferIds = useRef(new Set());
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

  const refreshAll = useCallback(async () => {
    if (!getDriverToken()) return;
    setLoading(true);
    setError('');
    try {
      await refreshProfile();
      await Promise.all([refreshStats(), refreshActive(), refreshAvailable()]);
      markSynced();
    } catch (err) {
      if (mounted.current) setError(err.message || 'Failed to load your dashboard.');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [refreshProfile, refreshStats, refreshActive, refreshAvailable, markSynced]);

  /* ------------------------------- polling ------------------------------ */

  const poll = useCallback(async () => {
    if (!getDriverToken()) {
      setAvailableDeliveries([]);
      setActiveDelivery(null);
      return;
    }
    try {
      await Promise.all([refreshStats(), refreshActive(), refreshAvailable()]);
      if (mounted.current) markSynced();
    } catch {
      /* transient poll failure is fine */
    }
  }, [refreshStats, refreshActive, refreshAvailable, markSynced]);

  useEffect(() => {
    if (authToken) {
      refreshAll();
      const interval = setInterval(poll, 12000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [authToken, refreshAll, poll]);

  useEffect(() => {
    const onUnauthorized = () => {
      clearDriverToken();
      setAuthToken('');
      setError('Your driver session has expired. Please log in again.');
    };
    window.addEventListener('ofk:driver-unauthorized', onUnauthorized);
    return () => window.removeEventListener('ofk:driver-unauthorized', onUnauthorized);
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
    clearDriverToken();
    setAuthToken('');
    setDriver(null);
    setStats(EMPTY_STATS);
    setAvailableDeliveries([]);
    setActiveDelivery(null);
    setError('');
  }, []);

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
      toast.success('Driver account created — log in with a verification code');
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

  /* --------------------------- delivery actions ------------------------ */

  const acceptDelivery = useCallback(
    async (id) => {
      await driverApi.acceptDelivery(id);
      const [active, av] = await Promise.all([refreshActive(), refreshAvailable()]);
      await refreshStats();
      if (mounted.current) {
        toast.success('Delivery accepted — head to the vendor');
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
      await Promise.all([refreshStats(), refreshEarnings(), refreshHistory()]);
      return result;
    },
    [refreshStats, refreshEarnings, refreshHistory, toast],
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
      location,
      sharingLocation,
      isAuthenticated,
      hasToken,
      isOnline,
      loading,
      authBusy,
      error,
      lastSyncedAt,
      markSynced,
      refreshAll,
      refreshHistory,
      refreshEarnings,
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
      location,
      sharingLocation,
      isAuthenticated,
      hasToken,
      isOnline,
      loading,
      authBusy,
      error,
      lastSyncedAt,
      markSynced,
      refreshAll,
      refreshHistory,
      refreshEarnings,
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