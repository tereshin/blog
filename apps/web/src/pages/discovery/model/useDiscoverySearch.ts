import { useSearchParams } from 'react-router'
import { useSearchPages } from '@/entities/search'

export function useDiscoverySearch() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const search = useSearchPages(q)
  const setQuery = (value: string, replace = true) => {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        if (value) next.set('q', value)
        else next.delete('q')
        return next
      },
      { replace, preventScrollReset: true },
    )
  }
  return { q, setQuery, search }
}
