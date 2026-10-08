import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const LocationContext = createContext(null);

/** Kigali city centre — fallback when permission is denied/unavailable. */
export const KIGALI_DEFAULT = { lat: -1.9441, lng: 30.0619 };
export const KIGALI_DEFAULT_LABEL = 'Kigali City Centre';

const PRIMER_KEY = 'ofk_location_primer_v1';
const SAVED_LOCATION_KEY = 'ofk_location_v1';

export const KIGALI_NEIGHBORHOODS = [
  { id: 'kimironko', name: 'Kimironko', district: 'Gasabo', popular: true, lat: -1.9597, lng: 30.0587 },
  { id: 'remera', name: 'Remera (Gisimenti)', district: 'Gasabo', popular: true, lat: -1.9547, lng: 30.0667 },
  { id: 'nyarutarama', name: 'Nyarutarama', district: 'Gasabo', popular: true, lat: -1.9553, lng: 30.0547 },
  { id: 'kiyovu', name: 'Kiyovu', district: 'Nyarugenge', popular: true, lat: -1.9477, lng: 30.061 },
  { id: 'kacyiru', name: 'Kacyiru', district: 'Gasabo', popular: true, lat: -1.9437, lng: 30.0747 },
  { id: 'gisozi', name: 'Gisozi', district: 'Gasabo', popular: false, lat: -1.9307, lng: 30.0657 },
  { id: 'gikondo', name: 'Gikondo', district: 'Kicukiro', popular: false, lat: -1.9687, lng: 30.0717 },
  { id: 'downtown', name: 'Downtown / CBD', district: 'Nyarugenge', popular: true, lat: -1.9517, lng: 30.0627 },
  { id: 'kanombe', name: 'Kanombe', district: 'Kicukiro', popular: false, lat: -1.9637, lng: 30.0937 },
  { id: 'kabeza', name: 'Kabeza', district: 'Kicukiro', popular: false, lat: -1.9607, lng: 30.0827 },
];

const readSavedLocation = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVED_LOCATION_KEY));
    if (saved?.lat && saved?.lng) {
      return {
        coords: { lat: Number(saved.lat), lng: Number(saved.lng) },
        label: saved.label || KIGALI_DEFAULT_LABEL,
        source: saved.source || 'manual',
      };
    }
  } catch { /* ignore corrupt storage */ }
  return null;
};

export const LocationProvider = ({ children }) => {
  const saved = useMemo(readSavedLocation, []);

  const [coords, setCoords] = useState(saved?.coords ?? KIGALI_DEFAULT);
  const [label, setLabel] = useState(saved?.label ?? KIGALI_DEFAULT_LABEL);
  /**
   * source: 'gps' | 'manual' | 'default'
   * status: 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable'
   */
  const [source, setSource] = useState(saved?.source ?? 'default');
  const [status, setStatus] = useState('idle');
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isPrimerOpen, setIsPrimerOpen] = useState(false);

  const persist = useCallback((next) => {
    try {
      localStorage.setItem(SAVED_LOCATION_KEY, JSON.stringify(next));
    } catch { /* storage unavailable */ }
  }, []);

  const applyGps = useCallback(
    (position) => {
      const next = {
        coords: {
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
        },
        label: 'My current location',
        source: 'gps',
      };
      setCoords(next.coords);
      setLabel(next.label);
      setSource('gps');
      setStatus('granted');
      persist(next);
    },
    [persist],
  );

  const handleError = useCallback(
    (error) => {
      const denied = error?.code === 1; // PERMISSION_DENIED
      setStatus(denied ? 'denied' : 'unavailable');
      if (!saved) {
        setCoords(KIGALI_DEFAULT);
        setLabel(KIGALI_DEFAULT_LABEL);
        setSource('default');
      }
    },
    [saved],
  );

  const requestGps = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStatus('unavailable');
      return Promise.resolve(false);
    }
    setStatus('requesting');
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          applyGps(position);
          setIsPrimerOpen(false);
          resolve(true);
        },
        (error) => {
          handleError(error);
          resolve(false);
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60_000 },
      );
    });
  }, [applyGps, handleError]);

  const dismissPrimer = useCallback(() => {
    setIsPrimerOpen(false);
    try {
      localStorage.setItem(PRIMER_KEY, 'seen');
    } catch { /* storage unavailable */ }
  }, []);

  const enableFromPrimer = useCallback(async () => {
    const ok = await requestGps();
    dismissPrimer();
    if (!ok) setStatus((prev) => (prev === 'requesting' ? 'denied' : prev));
  }, [requestGps, dismissPrimer]);

  const selectLocation = useCallback(
    (name, nextCoords = null) => {
      const match = KIGALI_NEIGHBORHOODS.find(
        (n) => name === `${n.name}, Kigali` || name === n.name || n.id === name,
      );
      const resolved = nextCoords ?? (match ? { lat: match.lat, lng: match.lng } : null);
      const next = {
        coords: resolved ?? KIGALI_DEFAULT,
        label: name,
        source: 'manual',
      };
      setCoords(next.coords);
      setLabel(next.label);
      setSource('manual');
      setStatus('granted');
      setIsLocationModalOpen(false);
      setIsPrimerOpen(false);
      persist(next);
    },
    [persist],
  );

  // First-load permission check: explain first, then ask (or restore GPS).
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (!('geolocation' in navigator)) {
        setStatus('unavailable');
        return;
      }

      let permissionState = 'prompt';
      try {
        if (navigator.permissions?.query) {
          const result = await navigator.permissions.query({ name: 'geolocation' });
          permissionState = result.state;
        }
      } catch { /* permissions API unsupported → treat as prompt */ }

      if (cancelled) return;

      if (permissionState === 'granted' && source !== 'manual') {
        requestGps();
        return;
      }

      if (permissionState === 'denied') {
        setStatus('denied');
        return;
      }

      // 'prompt': show the explanation once before triggering the browser dialog.
      let primerSeen = false;
      try {
        primerSeen = localStorage.getItem(PRIMER_KEY) === 'seen';
      } catch { /* storage unavailable */ }
      if (!primerSeen) setIsPrimerOpen(true);
    };

    init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({
      // Coordinates passed to every location-aware endpoint
      coords,
      label,
      source,
      status,
      isGps: source === 'gps',
      isUsingFallback: source === 'default',
      requestGps,

      // Back-compat with existing components (Navbar, etc.)
      currentLocation:
        source === 'gps' ? 'My current location' : source === 'manual' ? label : `${label}`,
      selectLocation,
      isLocationModalOpen,
      setIsLocationModalOpen,
      neighborhoods: KIGALI_NEIGHBORHOODS,

      // Onboarding primer (clear explanation before the browser prompt)
      isPrimerOpen,
      setIsPrimerOpen,
      dismissPrimer,
      enableFromPrimer,
    }),
    [
      coords, label, source, status, requestGps, selectLocation,
      isLocationModalOpen, isPrimerOpen, dismissPrimer, enableFromPrimer,
    ],
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) throw new Error('useLocation must be used within <LocationProvider>');
  return context;
};
