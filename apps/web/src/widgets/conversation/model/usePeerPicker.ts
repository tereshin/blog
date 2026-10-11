import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useSearch } from '@/entities/search'
import type { SearchPerson } from '@/entities/search'
import { useViewer } from '@/entities/session'

/** Поиск по имени: пробелы нормализованы, устаревшая выдача скрыта во время ввода. */
export function usePeerPicker(onOpenChange: (is_open: boolean) => void) {
  const navigate = useNavigate()
  const { viewer } = useViewer()
  const [query, setQuery] = useState('')
  const input_ref = useRef<HTMLInputElement>(null)
  const normalized_query = query.trim().replace(/\s+/g, ' ')
  const search = useSearch(normalized_query)
  const my_id = viewer.status === 'member' ? viewer.user.id : null
  const people = (search.data?.people ?? []).filter((person) => person.user_id !== my_id)

  const handleSelect = (person: SearchPerson) => {
    onOpenChange(false)
    void navigate(`/messages/new?to=${encodeURIComponent(person.user_id)}`, {
      state: { peer: person },
    })
  }

  const handleClear = () => {
    setQuery('')
    input_ref.current?.focus()
  }

  return {
    query,
    setQuery,
    input_ref,
    can_search: normalized_query.length >= 2,
    search,
    people,
    handleSelect,
    handleClear,
  }
}
