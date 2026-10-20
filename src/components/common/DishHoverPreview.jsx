import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const OPEN_DELAY_MS = 350;
const CARD_WIDTH = 300;
const GAP = 10;

// Only devices with a real mouse get hover previews; touch users tap the dish.
const canHover = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;

/**
 * Wraps a dish card: resting the mouse on it pops up the dish's full
 * description next to it.
 */
export default function DishHoverPreview({ dish, children, className = '' }) {
  const anchorRef = useRef(null);
  const timerRef = useRef(null);
  const [position, setPosition] = useState(null);

  const close = useCallback(() => {
    clearTimeout(timerRef.current);
    setPosition(null);
  }, []);

  const open = () => {
    if (!canHover() || !dish?.description) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      const left = Math.min(
        Math.max(GAP, rect.left + rect.width / 2 - CARD_WIDTH / 2),
        window.innerWidth - CARD_WIDTH - GAP,
      );
      // Prefer below the dish; flip above when there is more room there.
      const below = window.innerHeight - rect.bottom > rect.top;
      setPosition(
        below
          ? { left, top: rect.bottom + GAP }
          : { left, bottom: window.innerHeight - rect.top + GAP },
      );
    }, OPEN_DELAY_MS);
  };

  // The popup is fixed-position, so close it when the page scrolls or resizes.
  useEffect(() => {
    if (!position) return undefined;
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [position, close]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <div ref={anchorRef} onMouseEnter={open} onMouseLeave={close} onClick={close} className={className}>
      {children}
      {position &&
        createPortal(
          <div
            role="tooltip"
            style={{ ...position, width: CARD_WIDTH }}
            className="fixed z-[70] pointer-events-none bg-white rounded-2xl border border-[#ebd7c5] shadow-2xl overflow-hidden animate-fade-in"
          >
            <p className="p-4 text-xs text-stone-600 leading-relaxed whitespace-pre-line">
              {dish.description}
            </p>
          </div>,
          document.body,
        )}
    </div>
  );
}
