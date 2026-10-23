import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Clock, CornerUpRight, Loader2, LocateFixed, MapPin, Navigation, Route, X } from 'lucide-react';
import { fetchRoute } from '../../api/endpoints';
import ModalPortal from '../common/ModalPortal';
import { useLocation } from '../../context/LocationContext';

const LiveRouteMap = lazy(() => import('../tracking/LiveRouteMap'));

const distanceText = (m) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`);
const durationText = (s) => {
  const minutes = Math.max(1, Math.round(s / 60));
  return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`;
};
// Re-route once the customer has moved this far (metres).
const REROUTE_M = 60;
const metresBetween = (a, b) => {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(h));
};

/**
 * Directions to the kitchen on our own map (not Google Maps): the customer's
 * position, the kitchen, the road route, distance, time and the steps. With
 * live GPS on, it follows them and re-routes as they move.
 */
export default function KitchenDirectionsModal({ open, onClose, kitchen }) {
  const { coords, source, status: gpsStatus, requestGps, isTracking } = useLocation();
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [follow, setFollow] = useState(false);
  const routedFrom = useRef(null);
  const located = source !== 'default';

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Ask for the customer's position when they open directions without one.
  useEffect(() => {
    if (open && !located && gpsStatus !== 'requesting') requestGps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || !located || kitchen?.lat == null) return undefined;
    const here = { lat: coords.lat, lng: coords.lng };
    if (routedFrom.current && route && metresBetween(routedFrom.current, here) < REROUTE_M) return undefined;
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchRoute({ from: here, to: kitchen })
      .then((result) => {
        if (cancelled) return;
        setRoute(result);
        routedFrom.current = here;
      })
      .catch((err) => !cancelled && setError(err?.message || 'Could not find a route.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, located, coords.lat, coords.lng, kitchen?.lat, kitchen?.lng]);

  useEffect(() => {
    if (!open) {
      setRoute(null);
      setFollow(false);
      routedFrom.current = null;
    }
  }, [open]);

  if (!open) return null;

  const steps = (route?.steps || []).filter((step) => step.instruction);

  return (
    <ModalPortal>
    <div
      className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div role="dialog" aria-modal="true" aria-label={`Directions to ${kitchen?.label || 'the kitchen'}`} className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl h-[90vh] sm:h-auto sm:max-h-[88vh] overflow-hidden flex flex-col">
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
          <div className="min-w-0">
            <h3 className="font-black text-gray-900 flex items-center gap-2">
              <Navigation className="w-5 h-5 text-[#8a5332]" /> Directions to {kitchen?.label || 'the kitchen'}
            </h3>
            {kitchen?.address && <p className="text-xs text-stone-500 mt-0.5 truncate flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {kitchen.address}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-xl flex items-center justify-center text-stone-500 hover:bg-stone-100 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary */}
        <div className="px-5 pb-3 flex flex-wrap items-center gap-2">
          {route ? (
            <>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#faf6f2] border border-[#ebd7c5] text-sm font-black text-[#3d1b0c]">
                <Route className="w-4 h-4" /> {distanceText(route.distance_m)}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#faf6f2] border border-[#ebd7c5] text-sm font-black text-[#3d1b0c]">
                <Clock className="w-4 h-4" /> about {durationText(route.duration_s)} by road
              </span>
            </>
          ) : loading ? (
            <span className="text-xs text-stone-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Finding the way…</span>
          ) : null}
          <button
            type="button"
            onClick={() => {
              if (!isTracking) requestGps();
              setFollow(true);
            }}
            disabled={gpsStatus === 'requesting'}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 bg-white text-xs font-bold text-stone-700 hover:bg-stone-100 disabled:opacity-60"
          >
            <LocateFixed className="w-4 h-4" /> {gpsStatus === 'requesting' ? 'Locating…' : follow ? 'Following you' : 'Follow me'}
          </button>
        </div>

        {/* Map */}
        <div className="relative flex-shrink-0">
          <Suspense fallback={<div className="h-[38vh] min-h-[220px] max-h-[360px] bg-stone-100" />}>
            <LiveRouteMap
              rider={located ? { lat: coords.lat, lng: coords.lng } : null}
              kitchen={kitchen}
              geometry={route?.geometry}
              follow={follow && located}
              onFollowChange={setFollow}
              frameKey={route ? 'route' : 'kitchen'}
              className="h-[38vh] min-h-[220px] max-h-[360px] !rounded-none"
            />
          </Suspense>
          {!located && (
            <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-white/95 border border-stone-200 shadow-md p-3 text-xs text-stone-600 flex items-center justify-between gap-3">
              <span>Share your location to see the way from where you are.</span>
              <button type="button" onClick={requestGps} className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] text-white font-bold flex-shrink-0">
                Use my location
              </button>
            </div>
          )}
        </div>

        {/* Steps */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-3">
          {error && <p className="text-xs font-semibold text-red-600 mb-2">{error}</p>}
          {route?.source === 'straight' && (
            <p className="text-[11px] text-amber-700 mb-2">Road directions are unavailable right now — the line shows the straight way to the kitchen.</p>
          )}
          {steps.length > 0 && (
            <ol className="space-y-2">
              {steps.map((step, index) => (
                <li key={index} className="flex items-start gap-3 text-sm">
                  <span className="w-7 h-7 rounded-lg bg-stone-100 text-stone-600 flex items-center justify-center flex-shrink-0">
                    <CornerUpRight className="w-4 h-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-gray-900 font-semibold">{step.instruction}</span>
                    {step.distance_m > 0 && <span className="text-[11px] text-stone-400">{distanceText(step.distance_m)}</span>}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}
