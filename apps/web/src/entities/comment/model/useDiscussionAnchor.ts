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
    const observer = new MutationObserver(schedule)
    const deadline = setTimeout(() => observer.disconnect(), 10_000)

    function findTarget() {
      frame = null
      const target = document.getElementById(id)
      if (!target || target.closest('[hidden]')) return
      observer.disconnect()
      clearTimeout(deadline)
      target.scrollIntoView({
        block: id === 'comments' ? 'start' : 'center',
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      })
      if (id !== 'comments') {
        highlighted = target
        target.dataset.commentHighlighted = 'true'
        highlight_timer = setTimeout(() => { delete target.dataset.commentHighlighted }, 3_000)
      }
    }

    function schedule() {
      if (frame === null) frame = requestAnimationFrame(findTarget)
    }

    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] })
    schedule()
    return () => {
      observer.disconnect()
      clearTimeout(deadline)
      clearTimeout(highlight_timer)
      if (frame !== null) cancelAnimationFrame(frame)
      if (highlighted) delete highlighted.dataset.commentHighlighted
    }
  }, [article_id, hash, key])
}
