import { useCallback, useState } from 'react';

const STORAGE_KEY = 'ofk_recent_searches';
const MAX_RECENT = 6;

const read = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((q) => typeof q === 'string') : [];
  } catch {
    return [];
  }
};

/**
 * Recent searches persisted in localStorage (max 6 entries, most recent first).
 */
export default function useRecentSearches() {
  const [recent, setRecent] = useState(read);

  const addSearch = useCallback((query) => {
    const trimmed = query?.trim();
    if (!trimmed) return;
    setRecent((prev) => {
      const next = [trimmed, ...prev.filter((q) => q.toLowerCase() !== trimmed.toLowerCase())]
        .slice(0, MAX_RECENT);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch { /* storage unavailable */ }
      return next;
    });
  }, []);

  const removeSearch = useCallback((query) => {
    setRecent((prev) => {
      const next = prev.filter((q) => q !== query);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch { /* storage unavailable */ }
      return next;
    });
  }, []);

  const clearSearches = useCallback(() => {
    setRecent([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch { /* storage unavailable */ }
  }, []);

  return { recent, addSearch, removeSearch, clearSearches };
}
