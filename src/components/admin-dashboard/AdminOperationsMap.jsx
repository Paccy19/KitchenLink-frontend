import React, { useEffect, useRef, useState } from 'react';
import { LngLatBounds, Map as MapLibreMap, Marker, NavigationControl, Popup } from 'maplibre-gl';
import { CARTO_STYLE_URL, KIGALI_CENTER } from '../../lib/mapStyle';

const LINKS = 'ops-links';

const ago = (iso) => {
  if (!iso) return 'never';
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return min < 1 ? 'just now' : min < 60 ? `${min} min ago` : `${Math.round(min / 60)} h ago`;
};

/** Small DOM helpers for markers and popups (MapLibre needs real elements). */
const dot = (color, ring, title) => {
  const el = document.createElement('div');
  el.title = title;
  el.style.cssText = `width:18px;height:18px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 0 0 3px ${ring},0 2px 6px rgba(0,0,0,.3);cursor:pointer;`;
  return el;
};
const pin = (emoji, background, title) => {
  const el = document.createElement('div');
  el.title = title;
  el.style.cssText = `width:26px;height:26px;border-radius:9px;background:${background};border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,.3);cursor:pointer;`;
  el.textContent = emoji;
  return el;
};
const popup = (lines) => {
  const el = document.createElement('div');
  el.style.cssText = 'font-size:12px;line-height:1.45;min-width:170px;';
  lines.filter(Boolean).forEach(([text, strong], index) => {
    const row = document.createElement('div');
    row.textContent = text;
    if (strong || index === 0) row.style.fontWeight = '800';
    el.appendChild(row);
  });
  return new Popup({ offset: 16, closeButton: false }).setDOMContent(el);
};

/**
 * Admin live operations map: online delivery workers (blue = free, orange =
 * on a delivery, red = location too old to be offered orders), riders'
 * links to where they're heading, open kitchens and customers being served.
 */
export default function AdminOperationsMap({ data, className = 'h-[65vh] min-h-[420px]' }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const framed = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const map = new MapLibreMap({
      container: containerRef.current,
      style: CARTO_STYLE_URL,
      center: [KIGALI_CENTER.lng, KIGALI_CENTER.lat],
      zoom: 12,
      attributionControl: { compact: true },
    });
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    map.on('load', () => {
      map.addSource(LINKS, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: LINKS,
        type: 'line',
        source: LINKS,
        paint: {
          'line-color': ['case', ['get', 'late'], '#dc2626', '#f97316'],
          'line-width': 2.5,
          'line-dasharray': [2, 1.5],
          'line-opacity': 0.8,
        },
      });
      setReady(true);
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = [];
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !data) return;
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    const bounds = new LngLatBounds();
    const add = (element, lng, lat, info) => {
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      markersRef.current.push(new Marker({ element }).setLngLat([lng, lat]).setPopup(popup(info)).addTo(map));
      bounds.extend([lng, lat]);
    };

    (data.kitchens || []).forEach((kitchen) =>
      add(pin('🍳', '#8a5332', kitchen.name), kitchen.longitude, kitchen.latitude, [
        [kitchen.name],
        [`Open · ${kitchen.neighborhood || 'Kitchen'}`],
      ]),
    );

    const onDelivery = new Map();
    const links = [];
    (data.deliveries || []).forEach((delivery) => {
      if (delivery.driver?.id) onDelivery.set(delivery.driver.id, delivery);
      add(pin('🏠', '#047857', `Customer · ${delivery.order_number}`), delivery.destination.longitude, delivery.destination.latitude, [
        [delivery.order_number],
        [delivery.destination.address || 'Customer'],
        [delivery.driver ? `Rider: ${delivery.driver.name}` : `Waiting for a rider · offered to ${delivery.offered_to}`],
      ]);
      const fix = delivery.driver?.location;
      if (fix) {
        const toKitchen = ['assigned_to_driver', 'pending', 'ready_for_pickup'].includes(delivery.status);
        const target = toKitchen ? delivery.kitchen : delivery.destination;
        if (Number.isFinite(target.latitude)) {
          links.push({
            type: 'Feature',
            properties: { late: delivery.late },
            geometry: { type: 'LineString', coordinates: [[fix.longitude, fix.latitude], [target.longitude, target.latitude]] },
          });
        }
      }
    });

    (data.drivers || []).forEach((driver) => {
      const fix = driver.location;
      if (!fix) return;
      const delivery = onDelivery.get(driver.id);
      const color = !driver.counts_for_dispatch ? '#dc2626' : delivery ? '#f97316' : '#2563eb';
      add(dot(color, `${color}55`, driver.name), fix.longitude, fix.latitude, [
        [driver.name],
        [[driver.vehicle_type, driver.plate_number].filter(Boolean).join(' · ') || 'Delivery worker'],
        [delivery ? `On ${delivery.order_number} · ${delivery.status_label}${delivery.late ? ' · LATE' : ''}` : 'Free'],
        [`Location ${ago(fix.updated_at)}${driver.counts_for_dispatch ? '' : ' — too old to be offered orders'}`],
        driver.phone ? [driver.phone] : null,
      ]);
    });

    map.getSource(LINKS)?.setData({ type: 'FeatureCollection', features: links });
    if (!framed.current && !bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 0 });
      framed.current = true;
    }
  }, [data, ready]);

  return (
    <div className={`relative rounded-2xl overflow-hidden bg-stone-100 ${className}`}>
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute bottom-8 left-3 rounded-xl bg-white/95 border border-stone-200 shadow-sm px-3 py-2 text-[11px] font-semibold text-stone-600 space-y-1">
        <p className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Free delivery worker</p>
        <p className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> On a delivery</p>
        <p className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-red-600" /> Location too old</p>
        <p className="flex items-center gap-2"><span>🍳</span> Open kitchen <span className="ml-1">🏠</span> Customer</p>
      </div>
    </div>
  );
}
