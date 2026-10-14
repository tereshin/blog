import { useQuery } from '@tanstack/react-query'
import { search } from '../api/search.ts'
import { searchKeys } from './search-keys.ts'
import { useSearchQuery } from './useSearchQuery.ts'

/** Пауза при вводе ограничивает запросы; устаревшая выдача скрыта. */
export function useSearch(q: string) {
  const { deferred, can_search, is_current } = useSearchQuery(q)
  const query = useQuery({
    queryKey: searchKeys.query(deferred),
    queryFn: ({ signal }) => search(deferred, signal),
    enabled: can_search && is_current,
  })
  return {
    ...query,
    data: can_search && is_current ? query.data : undefined,
    isError: can_search && is_current && query.isError,
    is_searching: can_search && (!is_current || query.isPending),
    deferred,
  }
}
