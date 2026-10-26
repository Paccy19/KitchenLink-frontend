import { useQuery } from '@tanstack/react-query';
import { fetchVendorStorefront } from '../api/endpoints';
import { normalizeVendorDetail } from '../api/normalize';

/** Shared with usePrefetchVendor so a prefetched menu is reused as-is. */
export const vendorStorefrontQuery = (vendorId) => ({
  queryKey: ['vendor', vendorId],
  queryFn: () => fetchVendorStorefront(vendorId),
  staleTime: 60_000,
});

/**
 * GET /vendors/{vendor_id} — full storefront (header + categorised menu).
 *
 * @param {string|null} vendorId
 */
export default function useVendorStorefront(vendorId) {
  return useQuery({
    ...vendorStorefrontQuery(vendorId),
    enabled: Boolean(vendorId),
    retry: 1,
    refetchOnWindowFocus: false,
    select: normalizeVendorDetail,
  });
}
