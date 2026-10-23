import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchAllVendors } from '../api/endpoints';
import { normalizeVendor, pickList } from '../api/normalize';
import { useLocation } from '../context/LocationContext';
import { LIVE_REFRESH_MS } from './useNearbyVendors';

const round = (value) => Number(Number(value).toFixed(4));

/**
 * GET /home/vendors — every kitchen in the system, near or far. When the
 * customer's location is known (GPS or a picked neighbourhood), kitchens near
 * them come first; without it, open and top-rated kitchens lead.
 *
 * @param {{categoryId?:string|null, vendorTypes?:string[], sort?:string, perPage?:number, enabled?:boolean}} options
 */
export default function useAllVendors({
  categoryId = null,
  vendorTypes = [],
  sort = 'distance',
  perPage = 9,
  enabled = true,
} = {}) {
  const { coords, source, isTracking } = useLocation();
  // The Kigali-centre fallback is not the customer's position: don't rank by it.
  const located = source !== 'default';
  const lat = located ? round(coords.lat) : null;
  const lng = located ? round(coords.lng) : null;
  const typeParam = vendorTypes.length ? vendorTypes.join(',') : undefined;

  return useInfiniteQuery({
    queryKey: ['home', 'vendors', 'all', lat, lng, categoryId ?? 'all', typeParam ?? 'all-types', sort, perPage],
    enabled,
    queryFn: ({ pageParam = 1 }) =>
      fetchAllVendors({
        ...(located ? { lat: coords.lat, lng: coords.lng } : {}),
        category_id: categoryId ?? undefined,
        vendor_type: typeParam,
        sort,
        page: pageParam,
        limit: perPage,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const meta = lastPage?.meta ?? {};
      const page = Number(meta.page ?? 1);
      const limit = Number(meta.limit ?? perPage);
      return page * limit < Number(meta.total ?? 0) ? page + 1 : undefined;
    },
    staleTime: 45_000,
    refetchInterval: isTracking ? LIVE_REFRESH_MS : false,
    refetchOnWindowFocus: false,
    placeholderData: (previous) => previous,
    select: (data) => {
      const vendors = data.pages.flatMap((page) =>
        pickList(page, 'vendors').map(normalizeVendor),
      );
      const meta = data.pages[data.pages.length - 1]?.meta ?? {};
      const total = Number(meta.total ?? vendors.length);
      return {
        vendors,
        total,
        nearbyTotal: Number(meta.nearby_total ?? 0),
        nearRadiusKm: meta.near_radius_km ?? 5,
        locationUsed: Boolean(meta.location_used),
        hasMore: Number(meta.page ?? 1) * Number(meta.limit ?? perPage) < total,
      };
    },
  });
}
