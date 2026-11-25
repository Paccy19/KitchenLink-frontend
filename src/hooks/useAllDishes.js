import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchDishes } from '../api/endpoints';
import { normalizeDish, pickList } from '../api/normalize';

export const DISH_PAGE_SIZE = 8;

/**
 * GET /home/dishes — every dish from every kitchen, `DISH_PAGE_SIZE` at a
 * time ("Load more" fetches the next page). Filter by `categoryId`, order by
 * `sort` (recommended | price_asc | price_desc | rating | delivery_time).
 *
 * @param {{categoryId?:string|null, sort?:string, enabled?:boolean}} options
 */
export default function useAllDishes({ categoryId = null, sort = 'recommended', enabled = true } = {}) {
  return useInfiniteQuery({
    queryKey: ['home', 'dishes', categoryId ?? 'all', sort],
    enabled,
    queryFn: ({ pageParam = 1 }) =>
      fetchDishes({ page: pageParam, limit: DISH_PAGE_SIZE, category: categoryId ?? undefined, sort }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const meta = lastPage?.meta ?? {};
      return meta.has_more ? Number(meta.page ?? 1) + 1 : undefined;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    // Keep the old grid on screen while a new filter or sort loads.
    placeholderData: (previous) => previous,
    select: (data) => ({
      dishes: data.pages.flatMap((page) => pickList(page, 'dishes').map((dish) => normalizeDish(dish))),
      total: Number(data.pages[data.pages.length - 1]?.meta?.total ?? 0),
    }),
  });
}
