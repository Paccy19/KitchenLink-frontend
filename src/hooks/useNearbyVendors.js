import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchNearbyVendors } from '../api/endpoints';
import { normalizeVendor, pickList } from '../api/normalize';
import { useLocation } from '../context/LocationContext';

const round = (value) => Number(Number(value).toFixed(4));

export const DEFAULT_RADIUS_KM = 7;
export const SORT_OPTIONS = [
  { id: 'distance', label: 'Distance' },
  { id: 'rating', label: 'Rating' },
  { id: 'prep_time', label: 'Prep Time' },
];

/**
 * GET /home/vendors/nearby — paginated list of active kitchens around the
 * user with a configurable radius and sort order (distance by default).
 *
 * @param {{radius?:number, categoryId?:string|null, sort?:string, perPage?:number}} options
 */
export default function useNearbyVendors({
  radius = DEFAULT_RADIUS_KM,
  categoryId = null,
  sort = 'distance',
  perPage = 6,
} = {}) {
  const { coords } = useLocation();

  return useInfiniteQuery({
    queryKey: [
      'home', 'vendors', 'nearby',
      round(coords.lat), round(coords.lng),
      radius, categoryId ?? 'all', sort, perPage,
    ],
    queryFn: ({ pageParam = 1 }) =>
      fetchNearbyVendors({
        lat: coords.lat,
        lng: coords.lng,
        radius,
        category_id: categoryId ?? undefined,
        sort,
        page: pageParam,
        per_page: perPage,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage?.meta?.has_more ? lastPage.meta.page + 1 : undefined,
    staleTime: 45_000,
    refetchOnWindowFocus: false,
    placeholderData: (previous) => previous,
    select: (data) => {
      const vendors = data.pages.flatMap((page) =>
        pickList(page, 'vendors').map(normalizeVendor),
      );
      const meta = data.pages[data.pages.length - 1]?.meta ?? {};
      return {
        vendors,
        total: meta.total ?? vendors.length,
        radiusKm: meta.radius_km ?? radius,
        hasMore: Boolean(meta.has_more),
      };
    },
  });
}
