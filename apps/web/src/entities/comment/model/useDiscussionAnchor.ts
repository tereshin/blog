import { useEffect } from 'react'
import { useLocation } from 'react-router'

/** One owner for async discussion anchors, including replies mounted after a request. */
export function useDiscussionAnchor(article_id?: string) {
  const { hash, key } = useLocation()

  useEffect(() => {
    if (hash !== '#comments' && !hash.startsWith('#comment-')) return
    const id = hash.slice(1)
    let frame: number | null = null
    let highlighted: HTMLElement | null = null
    let highlight_timer: ReturnType<typeof setTimeout> | undefined
    let has_aligned = false
    let is_stopped = false
    const pending_images = new Set<HTMLImageElement>()
    const observer = new MutationObserver(schedule)
    const deadline = setTimeout(stopWaiting, 10_000)

    function stopWaiting() {
      is_stopped = true
      observer.disconnect()
      clearTimeout(deadline)
      if (frame !== null) cancelAnimationFrame(frame)
      frame = null
      for (const image of pending_images) {
        image.removeEventListener('load', handleImageSettled)
        image.removeEventListener('error', handleImageSettled)
      }
      pending_images.clear()
      window.removeEventListener('wheel', stopWaiting)
      window.removeEventListener('touchstart', stopWaiting)
      window.removeEventListener('pointerdown', stopWaiting)
      window.removeEventListener('keydown', handleKeyDown)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) stopWaiting()
    }

    function handleImageSettled(event: Event) {
      const image = event.currentTarget
      if (!(image instanceof HTMLImageElement)) return
      image.removeEventListener('load', handleImageSettled)
      image.removeEventListener('error', handleImageSettled)
      pending_images.delete(image)
      schedule()
    }

    function findTarget() {
      frame = null
      if (is_stopped) return
      const target = document.getElementById(id)
      if (!target || target.closest('[hidden]')) return
      observer.disconnect()
      if (!has_aligned) {
        // Images above the anchor can gain height after the first scroll, including lazy images.
        const scope = target.closest('main') ?? document.body
        for (const image of scope.querySelectorAll('img')) {
          if (image.complete || !(image.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_FOLLOWING)) continue
          pending_images.add(image)
          image.addEventListener('load', handleImageSettled)
          image.addEventListener('error', handleImageSettled)
        }
      }
      target.scrollIntoView({
        block: id === 'comments' ? 'start' : 'center',
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      })
      if (!has_aligned && id !== 'comments') {
        highlighted = target
        target.dataset.commentHighlighted = 'true'
        highlight_timer = setTimeout(() => { delete target.dataset.commentHighlighted }, 3_000)
      }
      has_aligned = true
      if (pending_images.size === 0) stopWaiting()
    }

    function schedule() {
      if (!is_stopped && frame === null) frame = requestAnimationFrame(findTarget)
    }

    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] })
    window.addEventListener('wheel', stopWaiting, { passive: true })
    window.addEventListener('touchstart', stopWaiting, { passive: true })
    window.addEventListener('pointerdown', stopWaiting, { passive: true })
    window.addEventListener('keydown', handleKeyDown)
    schedule()
    return () => {
      stopWaiting()
      clearTimeout(highlight_timer)
      if (highlighted) delete highlighted.dataset.commentHighlighted
    }
  }, [article_id, hash, key])
}
