import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Reads a deep-link query param (e.g. `?vendor=123`) once, captures its value,
 * then strips it from the URL so refreshes do not re-trigger the focus.
 * Returns the captured value (or null) so pages can open the matching record.
 */
export default function useFocusParam(param) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [value, setValue] = useState(() => searchParams.get(param));

  useEffect(() => {
    const current = searchParams.get(param);
    if (!current) return;
    setValue(current);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete(param);
        return next;
      },
      { replace: true },
    );
  }, [searchParams, setSearchParams, param]);

  return value;
}
