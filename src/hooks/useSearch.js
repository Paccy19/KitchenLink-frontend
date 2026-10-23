import { useQuery } from '@tanstack/react-query';
import { searchHome } from '../api/endpoints';
import { normalizeDish, normalizeVendor, pickList } from '../api/normalize';
import { useLocation } from '../context/LocationContext';
import useDebounce from './useDebounce';

export const SEARCH_DEBOUNCE_MS = 350;
export const SEARCH_SUGGESTIONS = ['Isombe', 'Pizza', 'Burger', 'Chicken', 'Brochettes', 'Juice'];

const round = (value) => Number(Number(value).toFixed(4));

/**
 * GET /home/search — debounced (350 ms) global search over dishes + kitchens.
 *
 * @param {string} query Raw (possibly un-debounced) search input
 * @param {{vendorTypes?:string[]}} [options] Only kitchens of these types (codes)
 * @returns {{debouncedQuery:string} & import('@tanstack/react-query').UseQueryResult}
 */
export default function useSearch(query, { vendorTypes = [] } = {}) {
  const { coords } = useLocation();
  const debouncedQuery = useDebounce(query, SEARCH_DEBOUNCE_MS);
  const trimmed = debouncedQuery.trim();
  const typeParam = vendorTypes.length ? vendorTypes.join(',') : undefined;

  const result = useQuery({
    queryKey: ['home', 'search', trimmed, typeParam ?? 'all-types', round(coords.lat), round(coords.lng)],
    queryFn: () =>
      searchHome({ q: trimmed, lat: coords.lat, lng: coords.lng, vendor_type: typeParam }),
    enabled: trimmed.length > 0,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    placeholderData: (previous) => previous,
    select: (data) => ({
      query: data?.query ?? trimmed,
      dishes: pickList(data, 'dishes').map((dish) => normalizeDish(dish)),
      vendors: pickList(data, 'vendors').map(normalizeVendor),
      matchedTypes: data?.meta?.matched_vendor_types ?? [],
      counts: data?.counts ?? {
        dishes: pickList(data, 'dishes').length,
        vendors: pickList(data, 'vendors').length,
      },
    }),
  });

  return { debouncedQuery: trimmed, ...result };
}
