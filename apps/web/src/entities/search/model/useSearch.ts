import { useDeferredValue } from 'react'
import { useQuery } from '@tanstack/react-query'
import { search } from '../api/search.ts'
import { searchKeys } from './search-keys.ts'

/** Поиск с отложенным запросом: короче двух символов сервер не спрашиваем. */
export function useSearch(q: string) {
  const deferred = useDeferredValue(q.trim())
  const query = useQuery({
    queryKey: searchKeys.query(deferred),
    queryFn: ({ signal }) => search(deferred, signal),
    enabled: deferred.length >= 2,
  })
  return { ...query, deferred }
}
