import { useEffect, useRef, useState } from 'react';

/**
 * Simulates a live WebSocket connection for the vendor dashboard.
 *
 * There is no realtime backend yet, so this hook reports a connection state
 * and periodically bumps `lastEventAt` so the UI can render a "Live" badge
 * and refresh relative timestamps. Swap the internals for a real socket
 * (or `EventSource`) once the backend is available.
 *
 * @param {{enabled?: boolean, onEvent?: () => void, intervalMs?: number}} options
 */
export default function useVendorRealtime({ enabled = true, onEvent, intervalMs = 30000 } = {}) {
  const [connected, setConnected] = useState(false);
  const [lastEventAt, setLastEventAt] = useState(null);
  const handler = useRef(onEvent);

  useEffect(() => {
    handler.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!enabled) {
      setConnected(false);
      return undefined;
    }

    const connect = setTimeout(() => {
      setConnected(true);
      setLastEventAt(new Date().toISOString());
    }, 500);

    const beat = setInterval(() => {
      setLastEventAt(new Date().toISOString());
      handler.current?.();
    }, intervalMs);

    return () => {
      clearTimeout(connect);
      clearInterval(beat);
    };
  }, [enabled, intervalMs]);

  return { connected, lastEventAt };
}
