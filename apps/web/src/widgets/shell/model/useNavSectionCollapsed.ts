import { useState } from 'react'

const STORAGE_KEY = 'nav-section-collapsed'

function readCollapsed(): Set<string> {
  if (typeof localStorage === 'undefined') return new Set()
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    if (!Array.isArray(value)) return new Set()
    return new Set(value.filter((item) => typeof item === 'string'))
  } catch {
    return new Set()
  }
}

function writeCollapsed(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
}

/** Свёрнутость секций сайдбара — предпочтение интерфейса, не сессия. */
export function useNavSectionCollapsed() {
  const [collapsed, setCollapsed] = useState(readCollapsed)
  return {
    isCollapsed: (id: string) => collapsed.has(id),
    toggle(id: string) {
      setCollapsed((current) => {
        const next = new Set(current)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        writeCollapsed(next)
        return next
      })
    },
  }
}
