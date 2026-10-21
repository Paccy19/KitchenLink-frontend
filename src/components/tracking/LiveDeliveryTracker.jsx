import React, { useEffect, useState } from 'react';
import { Bike, Crosshair, Map as MapIcon, Phone, Radio, Star } from 'lucide-react';
import { fetchOrderLive } from '../../api/endpoints';
import { formatDistance, formatMinutes } from '../../utils/routeMath';
import LiveRouteMap from './LiveRouteMap';

const POLL_MS = 4000;
const timeOf = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const agoOf = (iso) => {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return min < 1 ? 'just now' : `${min} min ago`;
};

/**
 * Customer view of their delivery worker, live: from the moment a worker
 * accepts, their position moves on the map as they ride (to the kitchen,
 * then to you), with the road route and an ETA.
 */
export default function LiveDeliveryTracker({ orderId, enabled = true }) {
  const [live, setLive] = useState(null);
  const [follow, setFollow] = useState(false);

  useEffect(() => {
    if (!enabled || !orderId) return undefined;
    let cancelled = false;
    let timer;
    const poll = async () => {
      try {
        const data = await fetchOrderLive(orderId);
        if (!cancelled) setLive(data);
      } catch {
        /* keep the last known view; try again next tick */
      }
      if (!cancelled) timer = setTimeout(poll, document.visibilityState === 'hidden' ? POLL_MS * 4 : POLL_MS);
    };
    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [orderId, enabled]);

  if (!live?.active) return null;

  const { driver, route, kitchen, destination } = live;
  const fix = driver?.location;
  const rider = fix ? { lat: fix.latitude, lng: fix.longitude, heading: fix.heading } : null;

  return (
    <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm overflow-hidden">
      <div className="p-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-blue-700">
            <Radio className="w-3.5 h-3.5 animate-pulse" /> Live tracking
          </span>
          <h3 className="font-black text-gray-900 text-lg mt-0.5">{live.phase_label}</h3>
          <p className="text-xs text-stone-500 font-medium">
            {live.phase === 'to_kitchen'
              ? live.kitchen_ready
                ? 'Your food is ready and your delivery worker is on the way to collect it.'
                : 'Your delivery worker is heading to the kitchen while your food is prepared.'
              : 'Your delivery worker has your food and is riding to you.'}
          </p>
        </div>
        {route && (
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase text-stone-400">
              {live.phase === 'to_kitchen' ? 'At the kitchen in' : 'Arriving in'}
            </p>
            <p className="text-2xl font-black text-blue-700 leading-tight">{formatMinutes(route.duration_s)}</p>
            <p className="text-[11px] font-semibold text-stone-500">
              {formatDistance(route.distance_m)} · around {timeOf(route.eta_at)}
            </p>
          </div>
        )}
      </div>

      <div className="relative px-3">
        <LiveRouteMap
          rider={rider}
          kitchen={kitchen?.latitude != null ? { lat: kitchen.latitude, lng: kitchen.longitude, label: kitchen.name } : null}
          destination={
            destination?.latitude != null ? { lat: destination.latitude, lng: destination.longitude, label: 'You' } : null
          }
          geometry={route?.geometry}
          follow={follow}
          onFollowChange={setFollow}
          frameKey={live.phase}
          className="h-72 sm:h-96"
        />
        {rider && (
          <button
            type="button"
            onClick={() => setFollow((value) => !value)}
            className="absolute bottom-3 left-6 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/95 border border-stone-200 shadow-md text-xs font-bold text-stone-700 hover:text-blue-700"
          >
            {follow ? <MapIcon className="w-3.5 h-3.5" /> : <Crosshair className="w-3.5 h-3.5" />}
            {follow ? 'Show whole route' : 'Follow rider'}
          </button>
        )}
      </div>

      {!fix && (
        <p className="mx-5 mt-3 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          Waiting for your delivery worker's location…
        </p>
      )}
      {fix?.stale && (
        <p className="mx-5 mt-3 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          Location last updated {agoOf(fix.updated_at)} — their phone may have lost signal.
        </p>
      )}

      {driver && (
        <div className="p-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {driver.avatar_url ? (
              <img src={driver.avatar_url} alt="" className="w-12 h-12 rounded-2xl object-cover border border-stone-200" />
            ) : (
              <span className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                <Bike className="w-6 h-6 text-blue-700" />
              </span>
            )}
            <div className="min-w-0">
              <p className="font-extrabold text-gray-900 truncate">{driver.name}</p>
              <p className="text-xs text-stone-500 font-medium truncate">
                {[driver.vehicle_type, driver.plate_number].filter(Boolean).join(' · ') || 'Delivery worker'}
              </p>
              {driver.rating != null && (
                <p className="flex items-center gap-1 text-[11px] text-amber-600 font-bold">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {Number(driver.rating).toFixed(1)}
                </p>
              )}
            </div>
          </div>
          {driver.phone && (
            <a
              href={`tel:${driver.phone}`}
              className="flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#faf6f2] hover:bg-[#f5ebe1] text-[#3d1b0c] border border-[#ebd7c5] font-bold text-xs transition"
            >
              <Phone className="w-3.5 h-3.5 text-[#6d391d]" /> Call
            </a>
          )}
        </div>
      )}
    </div>
  );
}
