import React from 'react';
import { MapPin, RefreshCw } from 'lucide-react';
import LocationIndicator from './LocationIndicator';

/**
 * "Kitchens near": the location selector (the shared LocationIndicator and
 * its picker), a refresh button and a short note on what the results are
 * based on.
 *
 * `compact` is for a page header (the map page): "NEAR" instead of "KITCHENS
 * NEAR", no source badge on the trigger (the picker still shows it), the note
 * moved to the refresh button's tooltip, a ~36px-tall bar whose width fits
 * its content, full width under the title on phones. Without it the bar is
 * the full-width row it always was.
 *
 * @param {{ compact?: boolean, note?: string, onRefresh: () => void,
 *           refreshing?: boolean, className?: string }} props
 */
export default function KitchensNearBar({ compact = false, note = '', onRefresh, refreshing = false, className = '' }) {
  const refreshLabel = 'Refresh kitchens near this location';

  if (compact) {
    return (
      <section
        aria-label="Your location"
        className={`w-full sm:w-auto rounded-xl bg-[#faf6f2] border border-[#f1e2d2] p-px pl-2.5 ${className}`}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-[#f28c18]" aria-hidden="true" />
          <span className="flex-shrink-0 text-[10px] font-black uppercase tracking-wide text-[#6d391d]">Near</span>
          <LocationIndicator variant="compact" dense hideBadge className="min-w-0 flex-1 sm:flex-none sm:max-w-[260px]" />
          <button
            type="button"
            onClick={onRefresh}
            aria-label={refreshLabel}
            // The note shows as the tooltip instead of under the bar.
            title={note || refreshLabel}
            disabled={refreshing}
            className="w-8 h-8 flex-shrink-0 rounded-lg bg-white border border-[#ebd7c5] text-[#6d391d] hover:text-[#f28c18] hover:border-[#f28c18]/60 flex items-center justify-center transition disabled:opacity-60 active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Your location"
      className={`rounded-2xl bg-[#faf6f2] border border-[#f1e2d2] px-2.5 sm:px-3 py-2 ${className}`}
    >
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <div className="flex flex-shrink-0 items-center gap-1.5">
          <MapPin className="w-4 h-4 text-[#f28c18]" aria-hidden="true" />
          <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wide text-[#6d391d]">Kitchens near</span>
        </div>
        <LocationIndicator variant="compact" className="min-w-0 flex-1" />
        {note && (
          <span className="hidden xl:block min-w-0 max-w-[250px] truncate text-[11px] font-medium text-stone-500">
            {note}
          </span>
        )}
        <button
          type="button"
          onClick={onRefresh}
          aria-label={refreshLabel}
          title={refreshLabel}
          disabled={refreshing}
          className="w-8 h-8 flex-shrink-0 rounded-lg bg-white border border-[#ebd7c5] text-[#6d391d] hover:text-[#f28c18] hover:border-[#f28c18]/60 flex items-center justify-center transition disabled:opacity-60 active:scale-95"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </section>
  );
}
