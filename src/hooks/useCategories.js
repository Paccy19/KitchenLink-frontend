import { useQuery } from '@tanstack/react-query';
import { fetchCategories } from '../api/endpoints';
import { normalizeCategory, pickList } from '../api/normalize';

/**
 * GET /home/categories — categories with live, available vendor offerings.
 * Refresh periodically so changes to menu availability reach customers.
 */
export default function useCategories({ enabled = true } = {}) {
  return useQuery({
    queryKey: ['home', 'categories'],
    queryFn: fetchCategories,
    enabled,
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    select: (data) => pickList(data, 'categories').map(normalizeCategory),
  });
}
