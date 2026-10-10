import { useEffect, useRef, useState } from 'react';

/**
 * Reports the driver app's live-connection state.
 *
 * The DriverContext already short-polls every ~12s; this hook only drives the
 * "Live" badge and re-syncs relative timestamps. Swap for a real WebSocket /
 * EventSource once a realtime transport is available.
 *
 * @param {{enabled?: boolean, onHeartbeat?: () => void, intervalMs?: number}} options
 */
export default function useDriverRealtime({ enabled = true, onHeartbeat, intervalMs = 12000 } = {}) {
  const [connected, setConnected] = useState(false);
  const [lastEventAt, setLastEventAt] = useState(null);
  const handler = useRef(onHeartbeat);

  useEffect(() => {
    handler.current = onHeartbeat;
  }, [onHeartbeat]);

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