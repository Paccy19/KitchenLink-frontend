import { useQuery } from '@tanstack/react-query';
import { fetchHomeFeed } from '../api/endpoints';
import { normalizeCategory, normalizeDish, normalizeVendor, pickList } from '../api/normalize';
import { useLocation } from '../context/LocationContext';
import { LIVE_REFRESH_MS } from './useNearbyVendors';

const round = (value) => Number(Number(value).toFixed(4));

/**
 * GET /home/feed — combined home screen payload for the active location.
 * Cached for 60s, keyed by coordinates so a location change refetches.
 * `vendorTypes` (codes) limits the kitchens to those types.
 */
export default function useHomeFeed({ vendorTypes = [] } = {}) {
  const { coords, label, isTracking, source } = useLocation();
  // The Kigali-centre fallback is not the customer's position: without a real
  // location the feed shows top kitchens instead of distances from the city centre.
  const located = source !== 'default';
  const typeParam = vendorTypes.length ? vendorTypes.join(',') : undefined;

  return useQuery({
    queryKey: ['home', 'feed', located ? round(coords.lat) : null, located ? round(coords.lng) : null, typeParam ?? 'all-types'],
    queryFn: () =>
      fetchHomeFeed({ ...(located ? { lat: coords.lat, lng: coords.lng, label } : {}), vendor_type: typeParam }),
    staleTime: 60_000,
    refetchInterval: isTracking ? LIVE_REFRESH_MS : false,
    refetchOnWindowFocus: false,
    placeholderData: (previous) => previous,
    select: (data) => ({
      location: data?.location ?? { ...coords, label },
      categories: pickList(data, 'categories').map(normalizeCategory),
      featuredVendors: pickList(
        data,
        'featured_vendors',
        'featuredVendors',
        'nearby_vendors',
        'nearbyVendors',
        'vendors',
      ).map(normalizeVendor),
      nearbyVendors: pickList(data, 'nearby_vendors', 'nearbyVendors').map(normalizeVendor),
      popularDishes: pickList(data, 'popular_dishes', 'popularDishes', 'dishes').map((dish) =>
        normalizeDish(dish),
      ),
      updatedAt: data?.updated_at ?? null,
    }),
  });
}
