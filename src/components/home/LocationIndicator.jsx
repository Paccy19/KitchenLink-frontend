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
        ? { text: 'Manual', className: 'bg-orange-100 text-orange-700' }
        : { text: 'Default', className: 'bg-gray-100 text-gray-500' };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Delivering to ${currentLocation}. Change location`}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-gray-200 shadow-sm text-xs font-bold text-gray-700 hover:border-orange-300 hover:text-orange-700 transition max-w-full"
      >
        <MapPin className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" aria-hidden="true" />
        <span className="truncate max-w-[180px]">{currentLocation}</span>
        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase ${badge.className}`}>
          {badge.text}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400" aria-hidden="true" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Change delivery location"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[85vh] overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-gray-900">Delivery location</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close location picker"
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600"
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
              className="w-full flex items-center gap-3 p-4 rounded-2xl bg-orange-50 border border-orange-100 hover:bg-orange-100 transition text-left disabled:opacity-60 mb-4"
            >
              <span className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center flex-shrink-0">
                <Navigation className="w-5 h-5" />
              </span>
              <span>
                <span className="block text-sm font-black text-gray-900">
                  Use my current location
                </span>
                <span className="block text-xs text-gray-500">
                  Finds kitchens closest to you with GPS
                </span>
              </span>
            </button>

            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-1">
              Or pick a neighbourhood
            </span>
            <ul className="mt-2 divide-y divide-gray-100">
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
                      className="w-full flex items-center justify-between py-3 px-1 text-sm hover:text-orange-600 transition"
                    >
                      <span className={active ? 'font-black text-orange-600' : 'font-semibold text-gray-700'}>
                        {area.name}
                      </span>
                      <span className="flex items-center gap-2 text-xs text-gray-400">
                        {area.district}
                        {active && <Check className="w-4 h-4 text-orange-600" aria-hidden="true" />}
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
