import React from 'react';
import { MapPin, Navigation, X } from 'lucide-react';
import { useLocation } from '../../context/LocationContext';

/**
 * First-load explanation shown before triggering the browser's geolocation
 * prompt, so users understand why we ask for their location.
 */
export default function LocationPrimer() {
  const { isPrimerOpen, dismissPrimer, enableFromPrimer, status } = useLocation();

  if (!isPrimerOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-primer-title"
    >
      <div className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl">
        <div className="relative h-36 bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
          <span className="w-20 h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
            <MapPin className="w-10 h-10 text-white" aria-hidden="true" />
          </span>
          <button
            type="button"
            onClick={dismissPrimer}
            aria-label="Continue with default location"
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/20 hover:bg-black/30 text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 text-center space-y-3">
          <h2 id="location-primer-title" className="text-xl font-black text-gray-900">
            Find kitchens near you
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Online Food Kitchen uses your location to show nearby home cooks and
            restaurants, accurate delivery distances and realistic prep times.
            Your location is only used while you browse.
          </p>

          <button
            type="button"
            onClick={enableFromPrimer}
            disabled={status === 'requesting'}
            className="w-full py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition disabled:opacity-70"
          >
            <Navigation className="w-4 h-4" aria-hidden="true" />
            {status === 'requesting' ? 'Locating…' : 'Use my location'}
          </button>

          <button
            type="button"
            onClick={dismissPrimer}
            className="w-full py-2.5 text-xs font-bold text-gray-400 hover:text-gray-600 transition"
          >
            Continue with Kigali city centre
          </button>
        </div>
      </div>
    </div>
  );
}
