import { useCallback, useEffect, useState } from 'react';
import useAutoRefresh from './useAutoRefresh';

/** Number of support conversations with a reply the user has not read. */
export default function useSupportUnread(api, { enabled = true } = {}) {
  const [count, setCount] = useState(0);
  const load = useCallback(async () => {
    if (!enabled) return;
    const data = await api.unreadCount();
    setCount(Number(data?.unread_count) || 0);
  }, [api, enabled]);
  useEffect(() => {
    load().catch(() => null);
  }, [load]);
  useAutoRefresh(load, { enabled, intervalMs: 20000 });
  return count;
}
