import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const STORAGE_KEY = 'ofk_scroll_positions';
// Give a page this long to load enough content to scroll back to.
const RESTORE_TIMEOUT_MS = 3000;

const readPositions = () => {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '{}') || {};
  } catch {
    return {};
  }
};

// Only recent history entries are worth keeping.
const MAX_SAVED = 50;

const savePositions = (positions) => {
  try {
    const recent = Object.fromEntries(Object.entries(positions).slice(-MAX_SAVED));
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(recent));
  } catch {
    // Storage blocked or full: positions still work for this tab in memory.
  }
};

const scrollToY = (top) => window.scrollTo({ top, left: 0, behavior: 'instant' });

/**
 * Page scroll the way customers expect:
 * - a new page (link, redirect) starts at the top;
 * - Back/Forward returns to where they were, waiting for the list to load;
 * - changing only filters or search on the same page keeps the position.
 * Renders nothing; mounted once inside the router.
 */
export default function ScrollManager() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const positions = useRef(readPositions());
  const previousPath = useRef(location.pathname);
  // Switched the moment a page changes, so a late scroll event from the new
  // (shorter) page can't overwrite the old page's saved position.
  const currentKey = useRef(location.key);

  // The browser's own restoration runs before our content loads and lands short.
  useEffect(() => {
    if (!('scrollRestoration' in window.history)) return undefined;
    const original = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => {
      window.history.scrollRestoration = original;
    };
  }, []);

  // Remember the position of the history entry being viewed.
  useEffect(() => {
    const onScroll = () => {
      positions.current[currentKey.current] = window.scrollY;
    };
    const onHide = () => savePositions(positions.current);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pagehide', onHide);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pagehide', onHide);
    };
  }, []);

  useLayoutEffect(() => {
    currentKey.current = location.key;
    savePositions(positions.current);

    const samePage = previousPath.current === location.pathname;
    previousPath.current = location.pathname;

    if (navigationType !== 'POP') {
      if (!samePage && !location.hash) scrollToY(0);
      return undefined;
    }

    const target = positions.current[location.key];
    if (!target) return undefined;

    // Scroll back once the page is tall enough; stop if the customer scrolls first.
    let frame = null;
    const deadline = Date.now() + RESTORE_TIMEOUT_MS;
    const stop = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = null;
      window.removeEventListener('wheel', stop);
      window.removeEventListener('touchstart', stop);
      window.removeEventListener('keydown', stop);
    };
    const attempt = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll >= target || Date.now() > deadline) {
        scrollToY(Math.min(target, maxScroll));
        stop();
        return;
      }
      frame = requestAnimationFrame(attempt);
    };
    window.addEventListener('wheel', stop, { passive: true });
    window.addEventListener('touchstart', stop, { passive: true });
    window.addEventListener('keydown', stop);
    attempt();
    return stop;
  }, [location.key]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
