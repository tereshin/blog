import type { ComponentPropsWithRef } from 'react'
import { useCallback, useLayoutEffect, useRef } from 'react'
import { cn } from '@/shared/lib'
import { mountSvgIcon, unmountSvgIcon } from '@/shared/lib/svg-icon'

type SvgIconProps = ComponentPropsWithRef<'span'> & {
  svg: string
}

/** SVG автора: в DOM попадает только после белого списка и живёт в shadow root. */
export function SvgIcon({ svg, className, ref, ...rest }: SvgIconProps) {
  const host = useRef<HTMLSpanElement>(null)
  const setHost = useCallback((node: HTMLSpanElement | null) => {
    host.current = node
    if (typeof ref === 'function') return ref(node)
    if (ref) ref.current = node
  }, [ref])
  useLayoutEffect(() => {
    const node = host.current
    if (!node) return
    mountSvgIcon(node, svg)
    return () => {
      unmountSvgIcon(node)
    }
  }, [svg])
  return <span aria-hidden {...rest} ref={setHost} className={cn('inline-flex shrink-0', className)} />
}
