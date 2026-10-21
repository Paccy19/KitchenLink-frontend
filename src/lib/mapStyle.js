import { setWorkerUrl } from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import 'maplibre-gl/dist/maplibre-gl.css';

/**
 * CARTO Voyager vector basemap rendered with MapLibre GL. The key is optional
 * (free tier works without one); set `VITE_CARTO_API_KEY` for a CARTO plan.
 */
export const CARTO_API_KEY = import.meta.env.VITE_CARTO_API_KEY || '';
export const CARTO_STYLE_URL = `https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json${
  CARTO_API_KEY ? `?key=${encodeURIComponent(CARTO_API_KEY)}` : ''
}`;

// MapLibre resolves its worker relative to its own bundle, which Vite's
// pre-bundling breaks; point it at the worker file Vite serves/emits instead.
setWorkerUrl(maplibreWorkerUrl);

/** Kigali city centre: where maps start when there is no position yet. */
export const KIGALI_CENTER = { lat: -1.9441, lng: 30.0619 };
