import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { vendorStorefrontQuery } from './useVendorStorefront';
import { loadVendorPage } from '../utils/preload';

// Hovering this long counts as intent; sweeping the mouse across a row doesn't.
const HOVER_DELAY_MS = 120;

/**
 * Props for a link to a kitchen: hovering, focusing or touching it starts
 * loading the kitchen page and its menu, so the click opens it instantly.
 *
 * @param {string|undefined} vendorId
 */
export default function usePrefetchVendor(vendorId) {
  const queryClient = useQueryClient();
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const prefetch = () => {
    clearTimeout(timer.current);
    if (!vendorId) return;
    loadVendorPage();
    queryClient.prefetchQuery(vendorStorefrontQuery(vendorId));
  };

  return {
    onMouseEnter: () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(prefetch, HOVER_DELAY_MS);
    },
    onMouseLeave: () => clearTimeout(timer.current),
    onFocus: prefetch,
    onTouchStart: prefetch,
  };
}
