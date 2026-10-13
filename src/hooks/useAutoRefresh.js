import { useEffect, useRef } from 'react';
import { onDataChanged } from '../api/liveUpdates';

/**
 * Keeps a screen's data fresh without manual reloads. Calls `refresh`:
 *  - right after any action anywhere in the app (debounced);
 *  - every `intervalMs` while the tab is visible (other people's changes);
 *  - as soon as the tab becomes visible / focused again.
 * `refresh` should only read (GET) data, so it never triggers itself.
 */
export default function useAutoRefresh(refresh, { enabled = true, intervalMs = 10000 } = {}) {
  const latest = useRef(refresh);
  useEffect(() => {
    latest.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return undefined;
    let debounce = null;
    let running = false;
    const run = async () => {
      if (running) return;
      running = true;
      try {
        await latest.current?.();
      } catch {
        /* a failed background refresh is retried on the next tick */
      } finally {
        running = false;
      }
    };
    const soon = () => {
      clearTimeout(debounce);
      debounce = setTimeout(run, 250);
    };
    const visible = () => document.visibilityState === 'visible';
    const onVisible = () => {
      if (visible()) soon();
    };

    const unsubscribe = onDataChanged(soon);
    const timer = setInterval(() => {
      if (visible()) run();
    }, intervalMs);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    return () => {
      unsubscribe();
      clearInterval(timer);
      clearTimeout(debounce);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [enabled, intervalMs]);
}
