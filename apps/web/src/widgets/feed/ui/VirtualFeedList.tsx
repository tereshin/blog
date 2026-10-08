import { useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { findScrollParent } from '@/shared/lib'

type VirtualFeedListProps = {
  article_ids: readonly string[]
  renderItem: (article_id: string) => ReactNode
  onNearEnd: () => void
}

const ESTIMATED_CARD_HEIGHT = 380
const NEAR_END_RATIO = 0.8

/** Длинная лента: в DOM только видимые карточки. Прокручивается ближайший прокручиваемый предок (центр каркаса). */
export function VirtualFeedList({ article_ids, renderItem, onNearEnd }: VirtualFeedListProps) {
  const list_ref = useRef<HTMLOListElement>(null)
  const [scroll_element, setScrollElement] = useState<HTMLElement | null>(null)
  const [scroll_margin, setScrollMargin] = useState(0)

  useLayoutEffect(() => {
    const list = list_ref.current
    const parent = findScrollParent(list)
    if (!list || !parent) return
    setScrollElement(parent)
    setScrollMargin(list.getBoundingClientRect().top - parent.getBoundingClientRect().top + parent.scrollTop)
  }, [])

  // Предупреждение React Compiler ожидаемо: TanStack Virtual возвращает функции, которые нельзя мемоизировать.
  // Компонент изолирован, его результат наружу не передаётся.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: article_ids.length,
    getScrollElement: () => scroll_element,
    estimateSize: () => ESTIMATED_CARD_HEIGHT,
    overscan: 4,
    scrollMargin: scroll_margin,
    getItemKey: (index) => article_ids[index] ?? index,
  })

  const virtual_items = virtualizer.getVirtualItems()
  const last_index = virtual_items.at(-1)?.index ?? -1
  const is_near_end = last_index >= Math.floor(article_ids.length * NEAR_END_RATIO) - 1

  useEffect(() => {
    if (article_ids.length > 0 && is_near_end) onNearEnd()
  }, [article_ids.length, is_near_end, onNearEnd])

  return (
    <ol ref={list_ref} className="relative" style={{ height: virtualizer.getTotalSize() }}>
      {virtual_items.map((item) => {
        const article_id = article_ids[item.index]
        if (!article_id) return null
        return (
          <li
            key={item.key}
            ref={virtualizer.measureElement}
            data-index={item.index}
            className="absolute left-0 top-0 w-full pb-4"
            style={{ transform: `translateY(${item.start - scroll_margin}px)` }}
          >
            {renderItem(article_id)}
          </li>
        )
      })}
    </ol>
  )
}
