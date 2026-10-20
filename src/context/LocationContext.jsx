import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { reportCustomerLocation } from '../api/endpoints';
import { useAuth } from './AuthContext';

const LocationContext = createContext(null);

/** While tracking, re-send the signed-in customer's position at least this often. */
const LOCATION_REPORT_INTERVAL_MS = 2 * 60 * 1000;

/** Ignore GPS updates smaller than this so nearby lists don't refetch on jitter. */
const MIN_MOVE_METERS = 50;
/** Ignore tracking fixes less accurate than this (e.g. wifi/cell estimates). */
const MAX_TRACK_ACCURACY_METERS = 500;

const distanceMeters = (a, b) => {
  const rad = (deg) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
};

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
  // Live tracking after "Use my location": accuracy of the last fix and when it was taken.
  const [isTracking, setIsTracking] = useState(false);
  const [accuracyM, setAccuracyM] = useState(null);
  const [lastFixAt, setLastFixAt] = useState(null);
  const watchIdRef = useRef(null);
  const coordsRef = useRef(coords);
  coordsRef.current = coords;

  const persist = useCallback((next) => {
    try {
      localStorage.setItem(SAVED_LOCATION_KEY, JSON.stringify(next));
    } catch { /* storage unavailable */ }
  }, []);

  const applyGps = useCallback(
    (position, { force = true } = {}) => {
      const nextCoords = {
        lat: Number(position.coords.latitude.toFixed(6)),
        lng: Number(position.coords.longitude.toFixed(6)),
      };
      setAccuracyM(Math.round(position.coords.accuracy ?? 0) || null);
      setLastFixAt(new Date(position.timestamp || Date.now()).toISOString());
      // While tracking, only move the active coordinates on a real change in position.
      if (!force && distanceMeters(coordsRef.current, nextCoords) < MIN_MOVE_METERS) return;
      const next = { coords: nextCoords, label: 'My current location', source: 'gps' };
      setCoords(next.coords);
      setLabel(next.label);
      setSource('gps');
      setStatus('granted');
      persist(next);
    },
    [persist],
  );

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = null;
    setIsTracking(false);
  }, []);

  const startTracking = useCallback(() => {
    if (!('geolocation' in navigator) || watchIdRef.current !== null) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        if ((position.coords.accuracy ?? 0) > MAX_TRACK_ACCURACY_METERS) return;
        applyGps(position, { force: false });
      },
      (error) => {
        // Permission revoked mid-session: stop; other errors are transient.
        if (error?.code === 1) {
          stopTracking();
          setStatus('denied');
        }
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 },
    );
    setIsTracking(true);
  }, [applyGps, stopTracking]);

  useEffect(() => stopTracking, [stopTracking]);

  // Record a signed-in customer's live position on the server: on each new
  // position, and periodically while tracking so "last seen" stays current.
  const { isAuthenticated } = useAuth() ?? {};
  const accuracyRef = useRef(accuracyM);
  accuracyRef.current = accuracyM;
  useEffect(() => {
    if (!isAuthenticated || source !== 'gps' || !isTracking) return undefined;
    const report = () =>
      reportCustomerLocation({ ...coordsRef.current, accuracyM: accuracyRef.current }).catch(() => null);
    report();
    const timer = setInterval(report, LOCATION_REPORT_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isAuthenticated, source, isTracking, coords.lat, coords.lng]);

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
      // A fresh, precise fix taken now (no cached position), then keep tracking.
      navigator.geolocation.getCurrentPosition(
        (position) => {
          applyGps(position);
          setIsPrimerOpen(false);
          startTracking();
          resolve(true);
        },
        (error) => {
          handleError(error);
          resolve(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      );
    });
  }, [applyGps, handleError, startTracking]);

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
      stopTracking();
      setAccuracyM(null);
      setCoords(next.coords);
      setLabel(next.label);
      setSource('manual');
      setStatus('granted');
      setIsLocationModalOpen(false);
      setIsPrimerOpen(false);
      persist(next);
    },
    [persist, stopTracking],
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
      // Live GPS tracking (started by requestGps, stopped by picking a neighbourhood)
      isTracking,
      accuracyM,
      lastFixAt,
      stopTracking,

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
      isTracking, accuracyM, lastFixAt, stopTracking,
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
