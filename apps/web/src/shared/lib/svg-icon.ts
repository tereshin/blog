import DOMPurify from 'dompurify'

const SAFE_REF = /^(?:#[\w.-]+|url\(#[\w.-]+\))$/

function guardAttribute(_node: Element, data: { attrName: string; attrValue: string; keepAttr?: boolean }) {
  const name = data.attrName.toLowerCase()
  if (name.startsWith('on')) data.keepAttr = false
  if ((name === 'href' || name.endsWith(':href')) && !SAFE_REF.test(data.attrValue)) data.keepAttr = false
}

function sanitizeSvgIcon(svg: string): string {
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

/**
 * Вставляет SVG автора в shadow root узла после DOMPurify (белый список SVG):
 * `id` градиентов не сталкиваются со страницей, а `currentColor` наследует цвет текста.
 */
export function mountSvgIcon(host: HTMLElement, svg: string): void {
  const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' })
  root.replaceChildren()
  const clean = sanitizeSvgIcon(svg)
  if (!clean) return
  const parsed = new DOMParser().parseFromString(clean, 'image/svg+xml')
  const graphic = parsed.documentElement
  if (graphic.localName !== 'svg' || parsed.querySelector('parsererror')) return
  graphic.setAttribute('width', '100%')
  graphic.setAttribute('height', '100%')
  graphic.setAttribute('pointer-events', 'none')
  root.append(document.importNode(graphic, true))
}

export function unmountSvgIcon(host: HTMLElement): void {
  host.shadowRoot?.replaceChildren()
}
