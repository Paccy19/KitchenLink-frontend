import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { VENDOR_TYPES } from '../data/vendorTypes';

const VALID = new Set(VENDOR_TYPES.map((type) => type.code));

/**
 * The kitchen-type filter kept in the URL as `?type=home_cook,cafe`, so a
 * filtered page can be shared and survives a refresh. Returns the selected
 * codes and a setter (an empty array clears the filter).
 */
export default function useVendorTypeParam() {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get('type') || '';

  const vendorTypes = useMemo(
    () => raw.split(',').map((code) => code.trim()).filter((code) => VALID.has(code)),
    [raw],
  );

  const setVendorTypes = useCallback(
    (codes) => {
      const next = new URLSearchParams(searchParams);
      if (codes.length) next.set('type', codes.join(','));
      else next.delete('type');
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  return [vendorTypes, setVendorTypes];
}
