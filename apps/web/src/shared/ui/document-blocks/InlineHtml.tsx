import { sanitizeInline } from '@/shared/lib/sanitize-inline'

/**
 * Встроенная разметка Editor.js приходит HTML-строкой. В DOM она попадает только отсюда,
 * после DOMPurify: белый список тегов, ссылки `http(s)`/`mailto`, `rel` и `target` проставляем сами.
 */
type InlineHtmlProps = { html: string }

export function InlineHtml({ html }: InlineHtmlProps) {
  return <span dangerouslySetInnerHTML={{ __html: sanitizeInline(html) }} />
}
