import DOMPurify from 'dompurify'
import { useLayoutEffect, useRef } from 'react'
import { cn } from '@/shared/lib'

const SAFE_REF = /^(?:#[\w.-]+|url\(#[\w.-]+\))$/

function guardAttribute(_node: Element, data: { attrName: string; attrValue: string; keepAttr?: boolean }) {
  const name = data.attrName.toLowerCase()
  if (name.startsWith('on')) data.keepAttr = false
  if ((name === 'href' || name.endsWith(':href')) && !SAFE_REF.test(data.attrValue)) data.keepAttr = false
}

function sanitizeNavIcon(svg: string): string {
  DOMPurify.addHook('uponSanitizeAttribute', guardAttribute)
  try {
    return DOMPurify.sanitize(svg, {
      USE_PROFILES: { svg: true, svgFilters: true },
      PARSER_MEDIA_TYPE: 'image/svg+xml',
      FORBID_TAGS: ['script', 'foreignObject', 'iframe', 'image', 'use', 'style', 'animate', 'set', 'a', 'handler'],
      KEEP_CONTENT: false,
      ALLOW_DATA_ATTR: false,
    })
  } finally {
    DOMPurify.removeHook('uponSanitizeAttribute', guardAttribute)
  }
}

type NavItemIconProps = {
  svg: string
  size: 20 | 24
}

/**
 * Иконка пункта секции. В DOM попадает только после DOMPurify (белый список SVG)
 * и живёт в shadow root, чтобы `id` градиентов не сталкивались, а `currentColor` наследовал цвет ссылки.
 */
export function NavItemIcon({ svg, size }: NavItemIconProps) {
  const host = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    const node = host.current
    if (!node) return
    const root = node.shadowRoot ?? node.attachShadow({ mode: 'open' })
    root.replaceChildren()
    const clean = sanitizeNavIcon(svg)
    if (!clean) return
    const parsed = new DOMParser().parseFromString(clean, 'image/svg+xml')
    const graphic = parsed.documentElement
    if (graphic.localName !== 'svg' || parsed.querySelector('parsererror')) return
    graphic.setAttribute('width', '100%')
    graphic.setAttribute('height', '100%')
    graphic.setAttribute('pointer-events', 'none')
    root.append(document.importNode(graphic, true))
    return () => {
      root.replaceChildren()
    }
  }, [svg])
  return (
    <span
      ref={host}
      aria-hidden
      className={cn('inline-flex shrink-0 text-current', size === 20 ? 'size-5' : 'size-6')}
    />
  )
}
