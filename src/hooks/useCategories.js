import { useQuery } from '@tanstack/react-query';
import { fetchCategories } from '../api/endpoints';
import { normalizeCategory, pickList } from '../api/normalize';

/**
 * GET /home/categories — the persistent category bar source.
 * Independent of location, so it is cached for 30 minutes.
 */
export default function useCategories({ enabled = true } = {}) {
  return useQuery({
    queryKey: ['home', 'categories'],
    queryFn: fetchCategories,
    enabled,
    staleTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    select: (data) => pickList(data, 'categories').map(normalizeCategory),
  });
}
