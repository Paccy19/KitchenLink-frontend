import { useCallback, useRef, useState } from 'react';

const PULL_THRESHOLD = 70;
const MAX_PULL = 110;

/**
 * Pull-to-refresh for mobile screens.
 *
 * Attach `handlers` to the scrolling container (or the page root) and render
 * `pullDistance` / `refreshing` in an indicator. A desktop-friendly way to
 * trigger the same refresh is to pass the returned `refresh` function to a
 * button.
 *
 * @param {() => Promise<any>|void} onRefresh
 * @param {{enabled?: boolean}} [options]
 */
export default function usePullToRefresh(onRefresh, { enabled = true } = {}) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const active = useRef(false);

  const refresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await onRefresh?.();
    } finally {
      setTimeout(() => setRefreshing(false), 400);
    }
  }, [onRefresh, refreshing]);

  const onTouchStart = useCallback(
    (event) => {
      if (!enabled || refreshing) return;
      if (window.scrollY > 0) {
        startY.current = null;
        return;
      }
      startY.current = event.touches?.[0]?.clientY ?? null;
      active.current = startY.current !== null;
    },
    [enabled, refreshing],
  );

  const onTouchMove = useCallback(
    (event) => {
      if (!enabled || !active.current || startY.current === null) return;
      const delta = (event.touches?.[0]?.clientY ?? 0) - startY.current;
      if (delta <= 0) {
        setPullDistance(0);
        return;
      }
      active.current = delta < MAX_PULL * 1.6;
      setPullDistance(Math.min(delta * 0.5, MAX_PULL));
    },
    [enabled],
  );

  const onTouchEnd = useCallback(() => {
    if (!enabled) return;
    const distance = pullDistance;
    startY.current = null;
    active.current = false;
    setPullDistance(0);
    if (distance >= PULL_THRESHOLD) refresh();
  }, [enabled, pullDistance, refresh]);

  const ready = pullDistance >= PULL_THRESHOLD;

  return {
    pullDistance,
    refreshing,
    ready,
    refresh,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
}
