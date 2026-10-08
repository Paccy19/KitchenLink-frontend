import { useEffect, useState } from 'react';

/**
 * Returns `value` after it has stayed unchanged for `delayMs`.
 * Used for debounced live search (350 ms by default).
 *
 * @template T
 * @param {T} value
 * @param {number} [delayMs]
 * @returns {T}
 */
export default function useDebounce(value, delayMs = 350) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
