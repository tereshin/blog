import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { useCallback, useEffect, useState } from 'react'

export function useWindowList(ids: string[], estimated_height = 80) {
  const [element, setElement] = useState<HTMLOListElement | null>(null)
  const [scroll_margin, setScrollMargin] = useState(0)
  const virtualizer = useWindowVirtualizer({
    count: ids.length,
    estimateSize: () => estimated_height,
    overscan: 5,
    useAnimationFrameWithResizeObserver: true,
    scrollMargin: scroll_margin,
    getItemKey: (index) => ids[index] ?? index,
  })
  const measure = useCallback(() => {
    if (element) setScrollMargin(element.getBoundingClientRect().top + window.scrollY)
  }, [element])
  useEffect(() => {
    let frame: number | null = null
    const scheduleMeasure = () => {
      if (frame !== null) return
      frame = requestAnimationFrame(() => {
        frame = null
        measure()
      })
    }
    const observer = new ResizeObserver(scheduleMeasure)
    if (element) observer.observe(element)
    window.addEventListener('resize', scheduleMeasure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', scheduleMeasure)
      if (frame !== null) cancelAnimationFrame(frame)
    }
  }, [element, measure])
  return { virtualizer, scroll_margin, setElement, items: virtualizer.getVirtualItems() }
}
