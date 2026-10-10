import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { search } from '../api/search.ts'
import { searchKeys } from './search-keys.ts'

const SEARCH_DELAY_MS = 250

/** Пауза при вводе ограничивает запросы; смена query key отменяет устаревший запрос. */
export function useSearch(q: string) {
  const normalized = q.trim()
  const [deferred, setDeferred] = useState(normalized)
  useEffect(() => {
    const timeout = setTimeout(() => setDeferred(normalized), SEARCH_DELAY_MS)
    return () => clearTimeout(timeout)
  }, [normalized])
  const is_current = normalized === deferred
  const can_search = normalized.length >= 2 && normalized.length <= 100
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
