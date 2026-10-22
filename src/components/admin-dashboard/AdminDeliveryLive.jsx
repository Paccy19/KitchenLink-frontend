import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api/adminApi';
import LiveRouteMap from '../tracking/LiveRouteMap';
import { formatDistance, formatMinutes } from '../../utils/routeMath';
import { formatRelative } from './ui';

/**
 * Admin order details: the same live view the customer has — the rider
 * moving on the map, the road route and the ETA — while the delivery runs.
 */
export default function AdminDeliveryLive({ deliveryId }) {
  const { data: live } = useQuery({
    queryKey: ['admin', 'delivery-live', deliveryId],
    queryFn: () => adminApi.deliveryLive(deliveryId),
    enabled: Boolean(deliveryId),
    refetchInterval: 5000,
  });

  if (!live?.active) return null;
  const fix = live.driver?.location;
  return (
    <div className="rounded-2xl border border-stone-200 overflow-hidden">
      <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 bg-stone-50 border-b border-stone-100">
        <p className="text-xs font-black text-gray-900">
          Live · {live.phase_label}
          {live.driver ? ` · ${live.driver.name}` : ''}
        </p>
        <p className="text-xs font-semibold text-stone-500">
          {live.route ? `${formatMinutes(live.route.duration_s)} · ${formatDistance(live.route.distance_m)} left` : 'No position yet'}
          {fix ? ` · location ${formatRelative(fix.updated_at)}${fix.stale ? ' (stale)' : ''}` : ''}
        </p>
      </div>
      <LiveRouteMap
        rider={fix ? { lat: fix.latitude, lng: fix.longitude, heading: fix.heading } : null}
        kitchen={live.kitchen?.latitude != null ? { lat: live.kitchen.latitude, lng: live.kitchen.longitude, label: live.kitchen.name } : null}
        destination={live.destination?.latitude != null ? { lat: live.destination.latitude, lng: live.destination.longitude, label: 'Customer' } : null}
        geometry={live.route?.geometry}
        frameKey={live.phase}
        className="h-72 !rounded-none"
      />
    </div>
  );
}
