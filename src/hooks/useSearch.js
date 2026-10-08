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
 * @returns {{debouncedQuery:string} & import('@tanstack/react-query').UseQueryResult}
 */
export default function useSearch(query) {
  const { coords } = useLocation();
  const debouncedQuery = useDebounce(query, SEARCH_DEBOUNCE_MS);
  const trimmed = debouncedQuery.trim();

  const result = useQuery({
    queryKey: ['home', 'search', trimmed, round(coords.lat), round(coords.lng)],
    queryFn: () =>
      searchHome({ q: trimmed, lat: coords.lat, lng: coords.lng }),
    enabled: trimmed.length > 0,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    placeholderData: (previous) => previous,
    select: (data) => ({
      query: data?.query ?? trimmed,
      dishes: pickList(data, 'dishes').map((dish) => normalizeDish(dish)),
      vendors: pickList(data, 'vendors').map(normalizeVendor),
      counts: data?.counts ?? {
        dishes: pickList(data, 'dishes').length,
        vendors: pickList(data, 'vendors').length,
      },
    }),
  });

  return { debouncedQuery: trimmed, ...result };
}
