import { SaxesParser } from 'saxes'
import type { SaxesAttributeNS, TagForOptions } from 'saxes'

/** Совпадает с CHECK в `nav_section_items.icon`. */
export const NAV_ICON_SVG_MAX = 8192

const SVG_NS = 'http://www.w3.org/2000/svg'
const SVG_TAGS = new Set([
  'svg',
  'g',
  'path',
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'defs',
  'linearGradient',
  'radialGradient',
  'stop',
  'clipPath',
  'mask',
  'title',
  'desc',
  'text',
  'tspan',
])
const SAFE_REF = /^(?:#[\w.-]+|url\(#[\w.-]+\))$/
const UNSAFE_VALUE = /(?:javascript:|data:|https?:|\/\/)/i
const UNSAFE_STYLE = /url\s*\(|expression\s*\(|javascript:|@import|@charset|behavior\s*:|-moz-binding|<\/|<!--/i

type SvgTag = TagForOptions<{ xmlns: true }>

/** Убирает BOM и XML-декларацию. Если у корня нет xmlns SVG — дописывает его. */
export function normalizeNavIconSource(value: string): string {
  const stripped = value.replace(/^\uFEFF/, '').replace(/^<\?xml\s[^?]*\?>\s*/i, '')
  if (!stripped.startsWith('<svg')) return stripped
  const end = stripped.indexOf('>')
  const head = end === -1 ? stripped : stripped.slice(0, end + 1)
  if (/\sxmlns\s*=/.test(head)) return stripped
  return stripped.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
}

function attributeAllowed(attribute: SaxesAttributeNS): boolean {
  if (/^on/i.test(attribute.local)) return false
  const is_xmlns = attribute.name === 'xmlns' || attribute.prefix === 'xmlns'
  if (!is_xmlns && UNSAFE_VALUE.test(attribute.value)) return false
  if (attribute.local === 'style' && UNSAFE_STYLE.test(attribute.value)) return false
  if (attribute.local === 'href' && !SAFE_REF.test(attribute.value)) return false
  if (/url\s*\(/i.test(attribute.value) && !SAFE_REF.test(attribute.value)) return false
  return true
}

/** Белый список фигур SVG: без скриптов, внешних ссылок, DTD и встроенных изображений. */
export function isSafeNavIconSvg(value: string): boolean {
  if (!value.startsWith('<svg') || value.length > NAV_ICON_SVG_MAX) return false
  let root = false
  let ok = true
  const reject = () => {
    ok = false
  }
  const parser = new SaxesParser({ xmlns: true })
  parser.on('error', reject)
  parser.on('doctype', reject)
  parser.on('processinginstruction', reject)
  parser.on('cdata', reject)
  parser.on('opentag', (tag: SvgTag) => {
    if (!ok) return
    const local = tag.local
    if (!local) {
      reject()
      return
    }
    if (!root) {
      if (local !== 'svg' || tag.uri !== SVG_NS) reject()
      root = true
    } else if (tag.uri !== SVG_NS || !SVG_TAGS.has(local)) {
      reject()
    }
    if (!ok) return
    for (const attribute of Object.values(tag.attributes)) {
      if (!attributeAllowed(attribute)) reject()
    }
  })
  try {
    parser.write(value).close()
  } catch {
    return false
  }
  return ok && root
}
