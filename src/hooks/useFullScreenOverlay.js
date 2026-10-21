import { useCallback, useEffect, useState } from 'react';

/**
 * Full-screen state for a map panel shown as a fixed overlay (works on every
 * phone, unlike the element Fullscreen API on iPhones). While open the page
 * behind doesn't scroll, and Escape or the phone's Back button closes it.
 * `storageKey` remembers the choice for next time.
 */
export default function useFullScreenOverlay(storageKey) {
  const [open, setOpen] = useState(() => {
    try {
      return Boolean(storageKey) && localStorage.getItem(storageKey) === '1';
    } catch {
      return false;
    }
  });

  const set = useCallback(
    (next) => {
      setOpen(next);
      try {
        if (storageKey) localStorage.setItem(storageKey, next ? '1' : '0');
      } catch {
        /* storage unavailable */
      }
    },
    [storageKey],
  );

  useEffect(() => {
    if (!open) return undefined;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    // A history entry so Back closes the map instead of leaving the page.
    window.history.pushState({ ofkFullMap: true }, '');
    const onPop = () => set(false);
    const onKey = (event) => event.key === 'Escape' && set(false);
    window.addEventListener('popstate', onPop);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('keydown', onKey);
      if (window.history.state?.ofkFullMap) window.history.back();
    };
  }, [open, set]);

  return [open, set];
}
