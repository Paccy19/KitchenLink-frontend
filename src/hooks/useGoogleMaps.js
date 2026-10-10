import { useEffect, useState } from 'react';

/**
 * Google Maps JavaScript API key. Set `VITE_GOOGLE_MAPS_API_KEY` in your
 * frontend `.env` / `.env.local` (see `.env.example`).
 */
export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

let loaderPromise = null;

function loadGoogleMaps(apiKey) {
  if (typeof window === 'undefined') return Promise.reject(new Error('No browser window.'));
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-google-maps]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google?.maps));
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Maps.')));
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMaps = 'true';
    script.onload = () => {
      if (window.google?.maps) resolve(window.google.maps);
      else reject(new Error('Google Maps loaded but is unavailable.'));
    };
    script.onerror = () => reject(new Error('Failed to load Google Maps. Check your API key and network.'));
    document.head.appendChild(script);
  });

  return loaderPromise;
}

/**
 * Loads the Google Maps JS API once and reports the loading status.
 *
 * @returns {{status: 'missing-key'|'loading'|'ready'|'error', maps: object|null}}
 */
export default function useGoogleMaps() {
  const [status, setStatus] = useState(GOOGLE_MAPS_API_KEY ? 'loading' : 'missing-key');
  const [maps, setMaps] = useState(null);

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      setStatus('missing-key');
      return undefined;
    }

    let active = true;
    setStatus('loading');
    loadGoogleMaps(GOOGLE_MAPS_API_KEY)
      .then((lib) => {
        if (!active) return;
        setMaps(lib);
        setStatus('ready');
      })
      .catch(() => {
        if (active) setStatus('error');
      });

    return () => {
      active = false;
    };
  }, []);

  return { status, maps };
}
