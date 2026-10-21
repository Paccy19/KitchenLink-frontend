import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  CornerUpLeft,
  CornerUpRight,
  Crosshair,
  ExternalLink,
  Flag,
  Map as MapIcon,
  RotateCcw,
  RefreshCw,
  Store,
  User,
} from 'lucide-react';
import { driverApi } from '../../api/driverApi';
import { useDriver } from '../../context/DriverContext';
import { formatDistance, formatMinutes, nextStep } from '../../utils/routeMath';
import LiveRouteMap from '../tracking/LiveRouteMap';
import useFullScreenOverlay from '../../hooks/useFullScreenOverlay';
import { FullScreenPanel, FullScreenToggle, safeBottom, safeTop } from '../tracking/FullScreenPanel';

const REFRESH_MS = 15000;
const OFF_ROUTE_M = 50;
const REROUTE_GAP_MS = 8000;

function TurnIcon({ maneuver, className }) {
  const { type, modifier } = maneuver || {};
  if (type === 'arrive') return <Flag className={className} />;
  if (type?.includes('roundabout') || type === 'rotary') return <RefreshCw className={className} />;
  if (modifier === 'uturn') return <RotateCcw className={className} />;
  if (modifier === 'left' || modifier === 'sharp left') return <CornerUpLeft className={className} />;
  if (modifier === 'right' || modifier === 'sharp right') return <CornerUpRight className={className} />;
  if (modifier === 'slight left') return <ArrowUpLeft className={className} />;
  if (modifier === 'slight right') return <ArrowUpRight className={className} />;
  return <ArrowUp className={className} />;
}

/**
 * GPS navigation for the delivery worker: the map follows them and turns
 * with their direction, the road route to the kitchen (then the customer),
 * the next turn and the time left. Their phone's position comes live from
 * the delivery GPS tracking in DriverContext.
 */
export default function DriverNavigation({ delivery }) {
  const { liveFix, gpsError } = useDriver();
  const [nav, setNav] = useState(null);
  const [follow, setFollow] = useState(true);
  const [full, setFull] = useFullScreenOverlay();
  const lastFetch = useRef(0);

  const load = async () => {
    lastFetch.current = Date.now();
    try {
      setNav(await driverApi.navigation(delivery.id));
    } catch {
      /* keep the last route */
    }
  };

  // Route refresh: on a timer, when the delivery moves to the next leg, and
  // when the rider leaves the route (re-route).
  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [delivery.id, delivery.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the screen on while navigating (where the browser supports it).
  useEffect(() => {
    let lock = null;
    const acquire = async () => {
      try {
        lock = await navigator.wakeLock?.request('screen');
      } catch {
        /* not supported or not allowed */
      }
    };
    acquire();
    const onVisible = () => document.visibilityState === 'visible' && acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      lock?.release?.().catch?.(() => null);
    };
  }, []);

  const route = nav?.active ? nav.route : null;
  const serverFix = nav?.driver?.location;
  const rider = liveFix
    ? { lat: liveFix.latitude, lng: liveFix.longitude, heading: liveFix.heading }
    : serverFix
      ? { lat: serverFix.latitude, lng: serverFix.longitude, heading: serverFix.heading }
      : null;

  const progress = useMemo(() => {
    if (!route?.geometry || !rider) return null;
    const point = [rider.lng, rider.lat];
    const { step, distanceM, here } = nextStep(point, route.geometry, route.steps || []);
    // The route's own pace (seconds per metre) applied to what's left.
    const pace = route.distance_m > 0 ? route.duration_s / route.distance_m : 0.18;
    return {
      step,
      toStepM: distanceM,
      remainingM: here.remainingM,
      remainingS: Math.round(here.remainingM * pace),
      offRouteM: here.offRouteM,
    };
  }, [route, rider?.lat, rider?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  // Off the route: ask for a new one (rate-limited).
  useEffect(() => {
    if (progress && progress.offRouteM > OFF_ROUTE_M && Date.now() - lastFetch.current > REROUTE_GAP_MS) load();
  }, [progress?.offRouteM]); // eslint-disable-line react-hooks/exhaustive-deps

  // Delivery finished (or no longer navigable): leave full screen.
  const finished = Boolean(nav && !nav.active);
  useEffect(() => {
    if (finished && full) setFull(false);
  }, [finished, full, setFull]);

  if (finished) return null;

  const toKitchen = nav?.phase === 'to_kitchen' || delivery.status === 'assigned_to_driver';
  const target = toKitchen
    ? { lat: delivery.vendor.latitude, lng: delivery.vendor.longitude }
    : { lat: delivery.dropoff.latitude, lng: delivery.dropoff.longitude };
  const googleNav =
    target.lat != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${target.lat},${target.lng}&travelmode=driving&dir_action=navigate`
      : '';
  const arrived = progress && progress.remainingM < 40;

  return (
    <FullScreenPanel
      full={full}
      label="Navigation"
      className="rounded-3xl bg-white border border-stone-200/80 shadow-sm overflow-hidden"
    >
      {/* Next turn */}
      <div
        className="bg-gradient-to-r from-[#12200b] to-[#2a3f1b] text-white px-4 py-3 flex items-center gap-3 flex-shrink-0"
        style={safeTop(full)}
      >
        <span className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
          <TurnIcon maneuver={arrived ? { type: 'arrive' } : progress?.step?.maneuver} className="w-7 h-7" />
        </span>
        <div className="min-w-0 flex-1">
          {progress && !arrived ? (
            <>
              <p className="text-2xl font-black leading-none">{formatDistance(progress.toStepM)}</p>
              <p className="text-sm font-bold text-white/90 truncate mt-0.5">{progress.step?.instruction || 'Continue'}</p>
            </>
          ) : arrived ? (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-lg font-black">{toKitchen ? "You're at the kitchen" : "You're at the customer"}</p>
              {full && (
                // The pickup / delivery confirmation lives on the page behind.
                <button
                  type="button"
                  onClick={() => setFull(false)}
                  className="px-3 py-1.5 rounded-xl bg-white text-[#1c2b12] text-xs font-black"
                >
                  {toKitchen ? 'Confirm pickup' : 'Complete delivery'}
                </button>
              )}
            </div>
          ) : (
            <p className="text-sm font-bold text-white/80">{gpsError || 'Finding your position…'}</p>
          )}
        </div>
        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg bg-white/10 flex items-center gap-1 flex-shrink-0">
          {toKitchen ? <Store className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
          {toKitchen ? 'To kitchen' : 'To customer'}
        </span>
      </div>

      <div className={full ? 'relative flex-1 min-h-0' : 'relative'}>
        <LiveRouteMap
          rider={rider}
          kitchen={delivery.vendor.latitude != null ? { lat: delivery.vendor.latitude, lng: delivery.vendor.longitude, label: delivery.vendor.name } : null}
          destination={delivery.dropoff.latitude != null ? { lat: delivery.dropoff.latitude, lng: delivery.dropoff.longitude, label: delivery.customer.name } : null}
          geometry={route?.geometry}
          follow={follow && Boolean(rider)}
          onFollowChange={setFollow}
          frameKey={`${nav?.phase || delivery.status}-${full}`}
          className={full ? 'h-full !rounded-none' : 'h-[65vh] min-h-[360px] !rounded-none'}
        />
        <div className="absolute top-3 left-3">
          <FullScreenToggle full={full} onChange={setFull} label="navigation" />
        </div>
        <div className="absolute bottom-10 left-3 right-3 flex items-end justify-between gap-2 pointer-events-none">
          <div className="pointer-events-auto rounded-2xl bg-white/95 border border-stone-200 shadow-md px-3 py-2">
            {progress ? (
              <>
                <p className="text-lg font-black text-[#1c2b12] leading-none">{formatMinutes(progress.remainingS)}</p>
                <p className="text-[11px] font-bold text-stone-500">
                  {formatDistance(progress.remainingM)} ·{' '}
                  {new Date(Date.now() + progress.remainingS * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </>
            ) : (
              <p className="text-xs font-bold text-stone-500">Calculating route…</p>
            )}
          </div>
          <div className="pointer-events-auto flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setFollow((value) => !value)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/95 border border-stone-200 shadow-md text-xs font-bold text-stone-700"
            >
              {follow ? <MapIcon className="w-3.5 h-3.5" /> : <Crosshair className="w-3.5 h-3.5" />}
              {follow ? 'Overview' : 'Follow me'}
            </button>
            {googleNav && (
              <a
                href={googleNav}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1a73e8] text-white shadow-md text-xs font-bold"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Google Maps
              </a>
            )}
          </div>
        </div>
      </div>

      {!toKitchen && (delivery.dropoff.address || delivery.dropoff.note) && (
        <div
          className="px-4 py-3 border-t border-stone-100 text-xs flex-shrink-0"
          style={safeBottom(full)}
        >
          <p className="font-bold text-gray-900">{delivery.dropoff.address}</p>
          {delivery.dropoff.note && <p className="text-stone-500 mt-0.5">Note: {delivery.dropoff.note}</p>}
        </div>
      )}
      {gpsError && progress && (
        <p className="px-4 py-2 text-[11px] font-semibold text-amber-800 bg-amber-50 border-t border-amber-200">{gpsError}</p>
      )}
    </FullScreenPanel>
  );
}
