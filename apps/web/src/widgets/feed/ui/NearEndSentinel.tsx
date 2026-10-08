import { useEffect, useRef } from 'react'
import { findScrollParent } from '@/shared/lib'

type NearEndSentinelProps = { onNearEnd: () => void }

/** Невидимая метка на ~80% списка: когда она подходит к видимой области, просим следующую порцию. */
export function NearEndSentinel({ onNearEnd }: NearEndSentinelProps) {
  const ref = useRef<HTMLDivElement>(null)
  const callback_ref = useRef(onNearEnd)

  useEffect(() => {
    callback_ref.current = onNearEnd
  })

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) callback_ref.current()
      },
      { root: findScrollParent(element), rootMargin: '0px 0px 400px 0px' },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return <div ref={ref} aria-hidden="true" className="h-px" />
}
