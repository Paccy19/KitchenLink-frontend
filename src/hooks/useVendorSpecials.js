import { useQuery } from '@tanstack/react-query';
import { fetchVendorSpecials } from '../api/endpoints';
import { normalizeSpecial, normalizeVendor, pickList } from '../api/normalize';
import { useLocation } from '../context/LocationContext';

const round = (value) => Number(Number(value).toFixed(4));

/**
 * GET /vendors/specials — active "Tomorrow's Special" announcements for the
 * active location. Cached briefly so a fresh announcement shows up quickly.
 */
export default function useVendorSpecials({ enabled = true } = {}) {
  const { coords, source } = useLocation();
  const located = source !== 'default';

  return useQuery({
    queryKey: ['home', 'specials', located ? round(coords.lat) : null, located ? round(coords.lng) : null],
    queryFn: () => fetchVendorSpecials(located ? { lat: coords.lat, lng: coords.lng } : {}),
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    select: (data) =>
      pickList(data, 'specials').map((entry) => ({
        vendor: normalizeVendor(entry),
        special: normalizeSpecial(entry.special),
      })),
  });
}