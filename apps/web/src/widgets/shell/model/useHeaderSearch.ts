import { useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useSearch } from '@/entities/search'
import { useShellStore } from './useShellStore.ts'

export function useHeaderSearch() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [value, setValue] = useState(params.get('q') ?? '')
  const input_ref = useRef<HTMLInputElement>(null)
  const closeSearch = useShellStore((state) => state.closeSearch)
  const recent_searches = useShellStore((state) => state.recent_searches)
  const rememberSearch = useShellStore((state) => state.rememberSearch)
  const clearRecentSearches = useShellStore((state) => state.clearRecentSearches)
  const search = useSearch(value)

  const openResults = (query: string) => {
    const q = query.trim()
    if (q.length < 2 || q.length > 100) return
    rememberSearch(q)
    closeSearch()
    navigate(`/search?q=${encodeURIComponent(q)}`)
  }

  const handleSelect = () => {
    rememberSearch(value)
    closeSearch()
  }

  const handleClear = () => {
    setValue('')
    input_ref.current?.focus()
  }

  return {
    value,
    setValue,
    input_ref,
    search,
    closeSearch,
    recent_searches,
    clearRecentSearches,
    openResults,
    handleSelect,
    handleClear,
  }
}
