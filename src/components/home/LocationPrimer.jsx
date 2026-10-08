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
      className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-primer-title"
    >
      <div className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl animate-scale-in border border-stone-100">
        <div className="relative h-36 bg-gradient-to-br from-[#2b1206] via-[#481f0d] to-[#1c0a03] flex items-center justify-center">
          <span className="w-20 h-20 rounded-full bg-white/15 backdrop-blur flex items-center justify-center border border-white/20">
            <MapPin className="w-10 h-10 text-white" aria-hidden="true" />
          </span>
          <button
            type="button"
            onClick={dismissPrimer}
            aria-label="Continue with default location"
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 text-center space-y-3.5">
          <h2 id="location-primer-title" className="text-xl font-black text-gray-900">
            Find kitchens near you
          </h2>
          <p className="text-sm text-stone-500 leading-relaxed">
            Online Food Kitchen uses your location to show nearby home cooks and
            restaurants, accurate delivery distances and realistic prep times.
            Your location is only used while you browse.
          </p>

          <button
            type="button"
            onClick={enableFromPrimer}
            disabled={status === 'requesting'}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] hover:from-[#3d1b0c] hover:via-[#5c2810] hover:to-[#2c1206] text-white font-bold text-sm shadow-xl shadow-[#2b1206]/25 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70"
          >
            <Navigation className="w-4 h-4 text-[#d9bda6]" aria-hidden="true" />
            {status === 'requesting' ? 'Locating…' : 'Use my location'}
          </button>

          <button
            type="button"
            onClick={dismissPrimer}
            className="w-full py-2.5 text-xs font-bold text-stone-400 hover:text-stone-600 transition"
          >
            Continue with Kigali city centre
          </button>
        </div>
      </div>
    </div>
  );
}
