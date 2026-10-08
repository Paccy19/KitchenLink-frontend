import React, { useState } from 'react';
import { Check, ChevronDown, MapPin, Navigation, X } from 'lucide-react';
import { KIGALI_NEIGHBORHOODS, useLocation } from '../../context/LocationContext';

/**
 * Subtle location indicator with a manual change sheet.
 * Shows the active coordinates source (GPS / manual / default fallback).
 */
export default function LocationIndicator({ className = '' }) {
  const {
    currentLocation,
    source,
    status,
    selectLocation,
    requestGps,
    neighborhoods,
  } = useLocation();
  const [open, setOpen] = useState(false);

  const badge =
    source === 'gps'
      ? { text: 'GPS', className: 'bg-forest-100 text-forest-700' }
      : source === 'manual'
        ? { text: 'Manual', className: 'bg-[#f5ebe1] text-[#3d1b0c]' }
        : { text: 'Default', className: 'bg-stone-100 text-stone-500' };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Delivering to ${currentLocation}. Change location`}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-stone-200 shadow-sm text-xs font-bold text-stone-700 hover:border-[#d9bda6] hover:text-[#3d1b0c] transition max-w-full active:scale-95"
      >
        <MapPin className="w-3.5 h-3.5 text-[#8a5332] flex-shrink-0" aria-hidden="true" />
        <span className="truncate max-w-[180px]">{currentLocation}</span>
        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase ${badge.className}`}>
          {badge.text}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-stone-400" aria-hidden="true" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Change delivery location"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[85vh] overflow-y-auto animate-scale-in"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-gray-900">Delivery location</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close location picker"
                className="w-9 h-9 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={async () => {
                await requestGps();
                setOpen(false);
              }}
              disabled={status === 'requesting'}
              className="w-full flex items-center gap-3 p-4 rounded-2xl bg-[#faf6f2] border border-[#ebd7c5] hover:bg-[#f5ebe1] transition text-left disabled:opacity-60 mb-4 group"
            >
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2b1206] to-[#542813] text-white flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                <Navigation className="w-5 h-5 text-[#d9bda6]" />
              </span>
              <span>
                <span className="block text-sm font-black text-gray-900">
                  Use my current location
                </span>
                <span className="block text-xs text-stone-500">
                  Finds kitchens closest to you with GPS
                </span>
              </span>
            </button>

            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 px-1">
              Or pick a neighbourhood
            </span>
            <ul className="mt-2 divide-y divide-stone-100">
              {(neighborhoods ?? KIGALI_NEIGHBORHOODS).map((area) => {
                const active =
                  source === 'manual' && currentLocation.includes(area.name);
                return (
                  <li key={area.id}>
                    <button
                      type="button"
                      onClick={() => {
                        selectLocation(`${area.name}, Kigali`);
                        setOpen(false);
                      }}
                      className="w-full flex items-center justify-between py-3 px-1 text-sm hover:text-[#542813] transition"
                    >
                      <span className={active ? 'font-black text-[#542813]' : 'font-semibold text-stone-700'}>
                        {area.name}
                      </span>
                      <span className="flex items-center gap-2 text-xs text-stone-400">
                        {area.district}
                        {active && <Check className="w-4 h-4 text-[#542813]" aria-hidden="true" />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
