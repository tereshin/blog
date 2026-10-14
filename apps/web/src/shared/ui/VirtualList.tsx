import { useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { cn, findScrollParent } from '@/shared/lib'

type VirtualListProps = {
  ids: readonly string[]
  renderItem: (id: string) => ReactNode
  estimate_size: number
  onNearEnd?: () => void
  className?: string
  item_className?: string
}

const NEAR_END_RATIO = 0.8

/** Длинный список: в DOM только видимые строки. Прокручивается ближайший прокручиваемый предок. */
export function VirtualList({
  ids,
  renderItem,
  estimate_size,
  onNearEnd,
  className,
  item_className,
}: VirtualListProps) {
  const list_ref = useRef<HTMLDivElement>(null)
  const [scroll_element, setScrollElement] = useState<HTMLElement | null>(null)
  const [scroll_margin, setScrollMargin] = useState(0)

  useLayoutEffect(() => {
    const list = list_ref.current
    const parent = findScrollParent(list)
    if (!list || !parent) return
    setScrollElement(parent)
    setScrollMargin(
      list.getBoundingClientRect().top - parent.getBoundingClientRect().top + parent.scrollTop,
    )
  }, [])

  // Предупреждение React Compiler ожидаемо: TanStack Virtual возвращает функции, которые нельзя мемоизировать.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: ids.length,
    getScrollElement: () => scroll_element,
    estimateSize: () => estimate_size,
    overscan: 4,
    scrollMargin: scroll_margin,
    getItemKey: (index) => ids[index] ?? index,
  })

  const virtual_items = virtualizer.getVirtualItems()
  const last_index = virtual_items.at(-1)?.index ?? -1
  const is_near_end = last_index >= Math.floor(ids.length * NEAR_END_RATIO) - 1

  useEffect(() => {
    if (ids.length > 0 && is_near_end) onNearEnd?.()
  }, [ids.length, is_near_end, onNearEnd])

  return (
    <div
      ref={list_ref}
      className={cn('relative', className)}
      style={{ height: virtualizer.getTotalSize() }}
    >
      {virtual_items.map((item) => {
        const id = ids[item.index]
        if (!id) return null
        return (
          <div
            key={item.key}
            ref={virtualizer.measureElement}
            data-index={item.index}
            className={cn('absolute left-0 top-0 w-full', item_className)}
            style={{ transform: `translateY(${item.start - scroll_margin}px)` }}
          >
            {renderItem(id)}
          </div>
        )
      })}
    </div>
  )
}
