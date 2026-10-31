import { useEffect, useRef, useState } from 'react'
import type { MouseEvent, PointerEvent, KeyboardEvent } from 'react'

export function useGalleryRail() {
  const rail_ref = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; left: number; has_moved: boolean } | null>(null)
  const suppress_click = useRef(false)
  const [edges, setEdges] = useState({ is_start: true, is_end: true })

  useEffect(() => {
    const rail = rail_ref.current
    if (!rail) return
    const measure = () => setEdges({
      is_start: rail.scrollLeft <= 2,
      is_end: rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 2,
    })
    measure()
    const resize = new ResizeObserver(measure)
    resize.observe(rail)
    const observeChildren = () => {
      for (const child of rail.children) resize.observe(child)
      measure()
    }
    observeChildren()
    const mutation = new MutationObserver(observeChildren)
    mutation.observe(rail, { childList: true })
    rail.addEventListener('scroll', measure, { passive: true })
    rail.addEventListener('load', measure, true)
    return () => {
      resize.disconnect()
      mutation.disconnect()
      rail.removeEventListener('scroll', measure)
      rail.removeEventListener('load', measure, true)
    }
  }, [])

  function move(direction: number) {
    const rail = rail_ref.current
    if (!rail) return
    const distance = rail.clientWidth * 0.8
    rail.scrollBy({ left: distance * direction, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    suppress_click.current = false
    if (event.pointerType !== 'mouse' || event.button !== 0) return
    if ((event.target as HTMLElement).closest('input,textarea,[data-gallery-action]')) return
    drag.current = { x: event.clientX, left: event.currentTarget.scrollLeft, has_moved: false }
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current
    if (!current) return
    const delta = event.clientX - current.x
    if (Math.abs(delta) < 6 && !current.has_moved) return
    current.has_moved = true
    suppress_click.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
    event.currentTarget.scrollLeft = current.left - delta
    event.currentTarget.dataset.dragging = 'true'
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    drag.current = null
    delete event.currentTarget.dataset.dragging
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  function handleClickCapture(event: MouseEvent) {
    if (!suppress_click.current) return
    event.preventDefault()
    event.stopPropagation()
    suppress_click.current = false
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    event.stopPropagation()
    move(event.key === 'ArrowLeft' ? -1 : 1)
  }

  return { rail_ref, edges, move, handlers: {
    onPointerDown: handlePointerDown, onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp, onPointerCancel: handlePointerUp,
    onLostPointerCapture: () => { drag.current = null },
    onClickCapture: handleClickCapture, onKeyDown: handleKeyDown,
  } }
}
