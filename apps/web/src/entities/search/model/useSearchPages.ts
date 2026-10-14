import { useInfiniteQuery } from '@tanstack/react-query'
import { search } from '../api/search.ts'
import { searchKeys } from './search-keys.ts'
import { useSearchQuery } from './useSearchQuery.ts'

export function useSearchPages(q: string) {
  const { deferred, can_search, is_current } = useSearchQuery(q)
  const query = useInfiniteQuery({
    queryKey: searchKeys.pages(deferred),
    queryFn: ({ pageParam, signal }) => search(deferred, signal, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.next_cursor,
    enabled: can_search && is_current,
  })
  return {
    ...query,
    data: can_search && is_current ? query.data : undefined,
    isError: can_search && is_current && query.isError,
    is_searching: can_search && (!is_current || query.isPending),
  }
}
