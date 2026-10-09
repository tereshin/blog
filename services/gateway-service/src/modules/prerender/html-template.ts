export type PrerenderPage = {
  title: string
  description: string
  image_url: string | null
  type: 'article' | 'topic' | 'profile' | 'website'
  text: string
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** HTML для робота: заголовок, описание, картинка и текст публичной страницы. */
export function renderPrerenderHtml(page: PrerenderPage): string {
  const title = escapeHtml(page.title)
  const description = escapeHtml(page.description)
  const image = page.image_url ? `<meta property="og:image" content="${escapeHtml(page.image_url)}">` : ''
  const body = page.text ? `<article>${escapeHtml(page.text)}</article>` : ''
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>${title}</title><meta name="description" content="${description}"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:type" content="${escapeHtml(page.type)}">${image}</head><body>${body}</body></html>`
}
