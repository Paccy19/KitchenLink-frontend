import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Map as MapLibreMap, Marker, NavigationControl } from 'maplibre-gl';
import { CARTO_STYLE_URL, KIGALI_CENTER } from '../../lib/mapStyle';

const MARKER_COLOR = '#8a5332';
const FOCUS_SOURCE = 'kitchen-focus';

const EMPTY_FEATURES = { type: 'FeatureCollection', features: [] };

/** Draws (or clears) the searched zone / street and moves the camera to it. */
function applyFocus(map, focus) {
  const features = [focus?.zone, focus?.line]
    .filter(Boolean)
    .map((geometry) => ({ type: 'Feature', geometry, properties: {} }));
  const data = features.length ? { type: 'FeatureCollection', features } : EMPTY_FEATURES;

  const source = map.getSource(FOCUS_SOURCE);
  if (source) {
    source.setData(data);
  } else {
    map.addSource(FOCUS_SOURCE, { type: 'geojson', data });
    map.addLayer({
      id: `${FOCUS_SOURCE}-fill`,
      type: 'fill',
      source: FOCUS_SOURCE,
      filter: ['in', ['geometry-type'], ['literal', ['Polygon', 'MultiPolygon']]],
      paint: { 'fill-color': MARKER_COLOR, 'fill-opacity': 0.08 },
    });
    map.addLayer({
      id: `${FOCUS_SOURCE}-outline`,
      type: 'line',
      source: FOCUS_SOURCE,
      paint: {
        'line-color': MARKER_COLOR,
        'line-width': ['match', ['geometry-type'], ['LineString', 'MultiLineString'], 5, 2],
        'line-opacity': ['match', ['geometry-type'], ['LineString', 'MultiLineString'], 0.55, 0.9],
        'line-dasharray': [2, 1],
      },
    });
  }

  if (!focus) return;
  if (focus.bounds) {
    const [west, south, east, north] = focus.bounds;
    map.fitBounds(
      [
        [west, south],
        [east, north],
      ],
      { padding: 32, maxZoom: focus.maxZoom ?? 17, duration: 900 },
    );
  } else if (focus.center) {
    map.flyTo({ center: [focus.center.lng, focus.center.lat], zoom: focus.zoom ?? 15, duration: 900 });
  }
}

/** Parses the picker's text values; null unless both are valid coordinates. */
export function parseCoords({ lat, lng } = {}) {
  if (String(lat ?? '').trim() === '' || String(lng ?? '').trim() === '') return null;
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}

// "-1.9441, 30.0619" pasted into one box (e.g. copied from Google Maps).
const PAIR = /^\s*(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)\s*$/;

/**
 * The kitchen's registered coordinates: typed in, or picked by tapping /
 * dragging the pin on the map. Never read from the device's GPS, since the
 * vendor may be somewhere other than the kitchen.
 *
 * `value` is `{ lat, lng }` as strings; `onChange` receives the same shape.
 * `focus` ({ bounds?, center?, zoom?, maxZoom?, zone?, line? }) moves the map
 * to a searched area or street and outlines it; pass a new object to re-apply.
 */
export default function KitchenCoordinatesPicker({ value, onChange, error, inputClass, focus }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const loadedRef = useRef(false);
  const focusRef = useRef(focus);
  focusRef.current = focus;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [mapFailed, setMapFailed] = useState(false);

  const coords = parseCoords(value);

  // Create the map once; tapping it or dragging the pin sets the coordinates.
  useEffect(() => {
    if (!containerRef.current) return undefined;
    const start = coords ?? { latitude: KIGALI_CENTER.lat, longitude: KIGALI_CENTER.lng };
    const map = new MapLibreMap({
      container: containerRef.current,
      style: CARTO_STYLE_URL,
      center: [start.longitude, start.latitude],
      zoom: coords ? 16 : 12,
      attributionControl: { compact: true },
    });
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    let styleFetched = false;
    map.once('styledata', () => {
      styleFetched = true;
    });
    map.on('error', () => {
      if (!styleFetched) setMapFailed(true);
    });
    const pick = (lngLat) =>
      onChangeRef.current({ lat: lngLat.lat.toFixed(6), lng: lngLat.lng.toFixed(6) });
    map.on('click', (event) => pick(event.lngLat));
    map.on('load', () => {
      loadedRef.current = true;
      if (focusRef.current) applyFocus(map, focusRef.current);
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      loadedRef.current = false;
    };
    // Initial centre only; later changes move the pin below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the pin on the current coordinates.
  const latitude = coords?.latitude;
  const longitude = coords?.longitude;
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (latitude == null) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    if (!markerRef.current) {
      const marker = new Marker({ color: MARKER_COLOR, draggable: true });
      marker.on('dragend', () => {
        const lngLat = marker.getLngLat();
        onChangeRef.current({ lat: lngLat.lat.toFixed(6), lng: lngLat.lng.toFixed(6) });
      });
      markerRef.current = marker.setLngLat([longitude, latitude]).addTo(map);
      map.easeTo({ center: [longitude, latitude], zoom: Math.max(map.getZoom(), 15) });
    } else {
      markerRef.current.setLngLat([longitude, latitude]);
      if (!map.getBounds().contains([longitude, latitude])) map.easeTo({ center: [longitude, latitude] });
    }
  }, [latitude, longitude]);

  // Runs after the pin effect so a searched place's framing wins.
  useEffect(() => {
    const map = mapRef.current;
    if (map && loadedRef.current && focus) applyFocus(map, focus);
  }, [focus]);

  const typed = (field) => (event) => {
    const text = event.target.value;
    const pair = text.match(PAIR);
    if (pair) onChange({ lat: pair[1], lng: pair[2] });
    else onChange({ ...value, [field]: text });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-bold text-stone-500 block mb-1.5">Latitude</span>
          <input
            type="text"
            inputMode="decimal"
            value={value?.lat ?? ''}
            onChange={typed('lat')}
            placeholder="e.g. -1.944100"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-stone-500 block mb-1.5">Longitude</span>
          <input
            type="text"
            inputMode="decimal"
            value={value?.lng ?? ''}
            onChange={typed('lng')}
            placeholder="e.g. 30.061900"
            className={inputClass}
          />
        </label>
      </div>

      {mapFailed ? (
        <p className="text-[11px] text-stone-500">
          The map could not load. Type the coordinates instead (you can copy them from Google Maps).
        </p>
      ) : (
        <div className="rounded-2xl overflow-hidden border border-stone-200">
          <div ref={containerRef} className="h-56 sm:h-64 w-full" />
        </div>
      )}
      <p className="text-[11px] text-stone-500">
        Tap the map where your kitchen is, or drag the pin. You can also paste "latitude, longitude" from
        Google Maps into either box.
        {coords && (
          <>
            {' '}
            <a
              href={`https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 font-bold text-[#542813] hover:underline"
            >
              Check on Google Maps <ExternalLink className="w-3 h-3" />
            </a>
          </>
        )}
      </p>
      {error && <p className="text-[11px] text-red-500 font-semibold">{error}</p>}
    </div>
  );
}
