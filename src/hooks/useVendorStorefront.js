import { useQuery } from '@tanstack/react-query';
import { fetchVendorStorefront } from '../api/endpoints';
import { normalizeVendorDetail } from '../api/normalize';

/**
 * GET /vendors/{vendor_id} — full storefront (header + categorised menu).
 *
 * @param {string|null} vendorId
 */
export default function useVendorStorefront(vendorId) {
  return useQuery({
    queryKey: ['vendor', vendorId],
    queryFn: () => fetchVendorStorefront(vendorId),
    enabled: Boolean(vendorId),
    staleTime: 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
    select: normalizeVendorDetail,
  });
}
