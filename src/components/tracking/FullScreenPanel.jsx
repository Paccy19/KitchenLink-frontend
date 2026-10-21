import React, { useEffect, useRef } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

/**
 * A panel that becomes a full-screen overlay when `full` (pair it with
 * useFullScreenOverlay). The same element stays mounted in both modes, so a
 * map inside keeps its state. Focus moves into the overlay when it opens and
 * back to where it was when it closes.
 */
export function FullScreenPanel({ full, label, className, children }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!full) return undefined;
    const previous = document.activeElement;
    ref.current?.focus();
    return () => previous?.focus?.();
  }, [full]);

  return (
    <div
      ref={ref}
      tabIndex={full ? -1 : undefined}
      role={full ? 'dialog' : undefined}
      aria-label={full ? label : undefined}
      className={full ? 'fixed inset-0 z-[1000] bg-white flex flex-col outline-none' : className}
    >
      {children}
    </div>
  );
}

/** Enter / exit full screen button for map panels. */
export function FullScreenToggle({ full, onChange, label = 'map' }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!full)}
      aria-label={full ? 'Exit full screen' : `Full screen ${label}`}
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/95 border border-stone-200 shadow-md text-xs font-bold text-stone-700 hover:text-blue-700"
    >
      {full ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
      {full ? 'Exit full screen' : 'Full screen'}
    </button>
  );
}

/** Safe-area padding for an overlay's top / bottom bars (notches, home bar). */
export const safeTop = (full) => (full ? { paddingTop: 'max(0.75rem, env(safe-area-inset-top))' } : undefined);
export const safeBottom = (full) => (full ? { paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' } : undefined);
