import React, { useEffect, useRef, useState } from 'react';
import { LngLatBounds, Map as MapLibreMap, Marker, NavigationControl } from 'maplibre-gl';
import { CARTO_STYLE_URL } from '../../lib/mapStyle';

const ROUTE_SOURCE = 'live-route';
const GLIDE_MS = 1200;

const pinElement = (emoji, background, label) => {
  const el = document.createElement('div');
  el.setAttribute('aria-label', label);
  el.style.cssText = `width:34px;height:34px;border-radius:12px;background:${background};display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 4px 12px rgba(0,0,0,.25);border:2px solid #fff;`;
  el.textContent = emoji;
  return el;
};

/** The rider: a blue dot with an arrow pointing where they're heading. */
const riderElement = () => {
  const el = document.createElement('div');
  el.setAttribute('aria-label', 'Delivery worker');
  el.style.cssText = 'width:44px;height:44px;position:relative;';
  el.innerHTML = `
    <div style="position:absolute;inset:0;border-radius:50%;background:rgba(37,99,235,.18);"></div>
    <svg data-arrow viewBox="0 0 44 44" width="44" height="44" style="position:absolute;inset:0;transition:transform .6s ease;">
      <circle cx="22" cy="22" r="11" fill="#2563eb" stroke="#fff" stroke-width="3"/>
      <path d="M22 6 L28 17 L22 14.5 L16 17 Z" fill="#2563eb" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>
    </svg>`;
  return el;
};

/**
 * Live delivery map (MapLibre on a CARTO basemap): the kitchen, the customer,
 * the road route and the rider gliding between GPS fixes.
 *
 * - `follow`: GPS mode — the camera stays on the rider, turned to their
 *   heading and tilted, like a navigation app. Dragging the map turns it off
 *   (`onFollowChange(false)`).
 * - otherwise the map frames the rider and where they're going.
 */
export default function LiveRouteMap({
  rider,
  kitchen,
  destination,
  geometry,
  follow = false,
  onFollowChange,
  frameKey = '',
  className = 'h-80',
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markers = useRef({});
  const glide = useRef({ from: null, to: null, start: 0, frame: 0 });
  const followRef = useRef(follow);
  followRef.current = follow;
  const onFollowRef = useRef(onFollowChange);
  onFollowRef.current = onFollowChange;
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  // The overview is framed once per `frameKey` (e.g. each leg of the trip).
  const framedFor = useRef(null);

  const start = rider || kitchen || destination;

  useEffect(() => {
    if (!containerRef.current || !start) return undefined;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: CARTO_STYLE_URL,
      center: [start.lng, start.lat],
      zoom: 14,
      attributionControl: { compact: true },
    });
    map.addControl(new NavigationControl({ visualizePitch: true }), 'top-right');
    let styleFetched = false;
    map.once('styledata', () => {
      styleFetched = true;
    });
    map.on('error', () => {
      if (!styleFetched) setFailed(true);
    });
    map.on('load', () => {
      map.addSource(ROUTE_SOURCE, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: `${ROUTE_SOURCE}-casing`,
        type: 'line',
        source: ROUTE_SOURCE,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#1e3a8a', 'line-width': 9, 'line-opacity': 0.35 },
      });
      map.addLayer({
        id: ROUTE_SOURCE,
        type: 'line',
        source: ROUTE_SOURCE,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#2563eb', 'line-width': 5 },
      });
      setReady(true);
    });
    // The user exploring the map pauses "follow".
    map.on('dragstart', () => {
      if (followRef.current) onFollowRef.current?.(false);
    });
    mapRef.current = map;
    return () => {
      cancelAnimationFrame(glide.current.frame);
      map.remove();
      mapRef.current = null;
      markers.current = {};
      framedFor.current = null;
    };
    // Created once; everything else updates below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(start)]);

  // Kitchen and customer pins.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const place = (key, point, make) => {
      if (!point || point.lat == null) {
        markers.current[key]?.remove();
        delete markers.current[key];
        return;
      }
      if (!markers.current[key]) markers.current[key] = new Marker({ element: make() }).setLngLat([point.lng, point.lat]).addTo(map);
      else markers.current[key].setLngLat([point.lng, point.lat]);
    };
    place('kitchen', kitchen, () => pinElement('🍳', '#8a5332', kitchen?.label || 'Kitchen'));
    place('destination', destination, () => pinElement('🏠', '#047857', destination?.label || 'Customer'));
  }, [kitchen?.lat, kitchen?.lng, destination?.lat, destination?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  // Route line.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.getSource(ROUTE_SOURCE)?.setData(
      geometry?.length > 1
        ? { type: 'Feature', geometry: { type: 'LineString', coordinates: geometry }, properties: {} }
        : { type: 'FeatureCollection', features: [] },
    );
  }, [geometry, ready]);

  // Rider: glide smoothly to each new fix and turn the arrow to the heading.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !rider || rider.lat == null) return;
    if (!markers.current.rider) {
      markers.current.rider = new Marker({ element: riderElement() }).setLngLat([rider.lng, rider.lat]).addTo(map);
      glide.current.to = [rider.lng, rider.lat];
    } else {
      const current = markers.current.rider.getLngLat();
      cancelAnimationFrame(glide.current.frame);
      glide.current = { from: [current.lng, current.lat], to: [rider.lng, rider.lat], start: performance.now(), frame: 0 };
      const step = (now) => {
        const t = Math.min(1, (now - glide.current.start) / GLIDE_MS);
        const ease = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
        const [fx, fy] = glide.current.from;
        const [tx, ty] = glide.current.to;
        markers.current.rider?.setLngLat([fx + (tx - fx) * ease, fy + (ty - fy) * ease]);
        if (t < 1) glide.current.frame = requestAnimationFrame(step);
      };
      glide.current.frame = requestAnimationFrame(step);
    }
    const arrow = markers.current.rider.getElement().querySelector('[data-arrow]');
    if (arrow) {
      // In follow mode the map turns with the rider, so the arrow points up.
      const angle = follow ? 0 : rider.heading ?? 0;
      arrow.style.transform = `rotate(${angle}deg)`;
      arrow.querySelector('path').style.display = rider.heading == null && !follow ? 'none' : '';
    }
  }, [rider?.lat, rider?.lng, rider?.heading, follow]); // eslint-disable-line react-hooks/exhaustive-deps

  // Camera.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (follow && rider?.lat != null) {
      map.easeTo({
        center: [rider.lng, rider.lat],
        zoom: Math.max(map.getZoom(), 16.5),
        bearing: rider.heading ?? map.getBearing(),
        pitch: 55,
        duration: GLIDE_MS,
      });
      return;
    }
    if (follow) return;
    // Overview: frame the rider and where they're going, once per leg (and
    // again when leaving follow mode).
    if (framedFor.current === frameKey && map.getPitch() === 0) return;
    const points = [rider, kitchen, destination].filter((p) => p && p.lat != null);
    if (points.length === 0) return;
    const bounds = new LngLatBounds([points[0].lng, points[0].lat], [points[0].lng, points[0].lat]);
    points.forEach((p) => bounds.extend([p.lng, p.lat]));
    (geometry || []).forEach((c) => bounds.extend(c));
    map.easeTo({ bearing: 0, pitch: 0, duration: 400 });
    map.fitBounds(bounds, { padding: 56, maxZoom: 16, duration: 800 });
    framedFor.current = frameKey;
  }, [follow, ready, frameKey, rider?.lat, rider?.lng, rider?.heading, geometry]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!start) return null;
  return (
    <div className={`relative rounded-2xl overflow-hidden bg-stone-100 ${className}`}>
      <div ref={containerRef} className="absolute inset-0" />
      {failed && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-xs font-semibold text-stone-500 bg-stone-50">
          The map could not load. Check your internet connection.
        </div>
      )}
    </div>
  );
}
