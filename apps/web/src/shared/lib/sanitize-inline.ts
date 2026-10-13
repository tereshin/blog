import DOMPurify from 'dompurify'

const ALLOWED_TAGS = ['b', 'i', 'u', 'code', 'mark', 'a', 'br']
const ALLOWED_ATTR = ['href', 'rel', 'target']

let hook_ready = false

function ensureHook(): void {
  if (hook_ready) return
  hook_ready = true
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName !== 'A') return
    node.setAttribute('rel', 'noopener noreferrer')
    node.setAttribute('target', '_blank')
  })
}

/** Оставляет во встроенной разметке только белый список тегов и ссылки http(s)/mailto. */
export function sanitizeInline(html: string): string {
  ensureHook()
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:)/i,
  })
}
