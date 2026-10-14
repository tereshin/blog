import { useEffect, useState } from 'react'

const SEARCH_DELAY_MS = 250

export function useSearchQuery(q: string) {
  const normalized = q.trim()
  const [deferred, setDeferred] = useState(normalized)
  useEffect(() => {
    const timeout = setTimeout(() => setDeferred(normalized), SEARCH_DELAY_MS)
    return () => clearTimeout(timeout)
  }, [normalized])
  const is_current = normalized === deferred
  const can_search = normalized.length >= 2 && normalized.length <= 100
  return { deferred, can_search, is_current }
}
