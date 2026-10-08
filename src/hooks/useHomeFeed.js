import { useQuery } from '@tanstack/react-query';
import { fetchHomeFeed } from '../api/endpoints';
import { normalizeCategory, normalizeDish, normalizeVendor, pickList } from '../api/normalize';
import { useLocation } from '../context/LocationContext';

const round = (value) => Number(Number(value).toFixed(4));

/**
 * GET /home/feed — combined home screen payload for the active location.
 * Cached for 60s, keyed by coordinates so a location change refetches.
 */
export default function useHomeFeed() {
  const { coords, label } = useLocation();

  return useQuery({
    queryKey: ['home', 'feed', round(coords.lat), round(coords.lng)],
    queryFn: () => fetchHomeFeed({ lat: coords.lat, lng: coords.lng, label }),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    placeholderData: (previous) => previous,
    select: (data) => ({
      location: data?.location ?? { ...coords, label },
      categories: pickList(data, 'categories').map(normalizeCategory),
      featuredVendors: pickList(data, 'featured_vendors', 'featuredVendors', 'vendors').map(normalizeVendor),
      nearbyVendors: pickList(data, 'nearby_vendors', 'nearbyVendors').map(normalizeVendor),
      popularDishes: pickList(data, 'popular_dishes', 'popularDishes', 'dishes').map((dish) =>
        normalizeDish(dish),
      ),
      updatedAt: data?.updated_at ?? null,
    }),
  });
}
