import { SITE_ASSETS } from '@blog/contracts'
import type { PageSeo } from '@blog/contracts'

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function safeJsonLd(value: PageSeo['structured_data']): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

/** HTML uses the same page DTO as React; the nonce matches the gateway CSP header. */
export function renderPrerenderHtml(page: PageSeo, nonce?: string): string {
  const meta = (key: string, value: string, property = false) =>
    `<meta data-page-seo ${property ? 'property' : 'name'}="${key}" content="${escapeHtml(value)}">`
  const asset_tags = SITE_ASSETS.filter((asset) => page.favicon?.[asset.variant])
    .map((asset) => {
      const url = page.favicon?.[asset.variant] ?? ''
      return `<link rel="${asset.rel}" href="${asset.path}?v=${encodeURIComponent(url.split('/').at(-1) ?? url)}"${asset.type ? ` type="${asset.type}"` : ''}${asset.sizes ? ` sizes="${asset.sizes}"` : ''} data-site-asset="${asset.variant}">`
    })
    .join('')
  const tags = [
    meta('description', page.description),
    meta('robots', page.robots),
    meta('og:title', page.title, true),
    meta('og:description', page.description, true),
    meta('og:type', page.og_type, true),
    meta('og:url', page.canonical_url, true),
    meta('og:site_name', page.site_name, true),
    meta('og:locale', { ru: 'ru_RU', en: 'en_US', sr: 'sr_RS' }[page.locale], true),
    meta('twitter:card', 'summary_large_image'),
    meta('twitter:title', page.title),
    meta('twitter:description', page.description),
  ]
  if (page.images) {
    const { og, twitter, vk } = page.images
    tags.push(
      meta('og:image', og.url, true),
      meta('og:image:alt', og.alt, true),
      meta('twitter:image', twitter.url),
      meta('twitter:image:alt', twitter.alt),
      meta('vk:image', vk.url, true),
    )
    if (og.mime) tags.push(meta('og:image:type', og.mime, true))
    if (og.width) tags.push(meta('og:image:width', String(og.width), true))
    if (og.height) tags.push(meta('og:image:height', String(og.height), true))
  }
  if (page.author_url) tags.push(meta('article:author', page.author_url, true))
  if (page.published_at) tags.push(meta('article:published_time', page.published_at, true))
  if (page.modified_at) tags.push(meta('article:modified_time', page.modified_at, true))
  if (page.section) tags.push(meta('article:section', page.section, true))
  const article = page.structured_data['@graph'].find((node) => node['@type'] === 'BlogPosting')
  const heading = typeof article?.headline === 'string' ? article.headline : page.title
  const list = page.structured_data['@graph'].find((node) => node['@type'] === 'ItemList')
  const entries = Array.isArray(list?.itemListElement) ? list.itemListElement : []
  const links = entries
    .flatMap((entry) => {
      if (
        !entry ||
        typeof entry !== 'object' ||
        Array.isArray(entry) ||
        typeof entry.url !== 'string' ||
        typeof entry.name !== 'string'
      )
        return []
      if (!entry.url.startsWith(new URL(page.canonical_url).origin + '/')) return []
      return [`<li><a href="${escapeHtml(entry.url)}">${escapeHtml(entry.name)}</a></li>`]
    })
    .join('')
  const body = page.body_text
    ? `<main><h1>${escapeHtml(heading)}</h1>${page.author_url ? `<a href="${escapeHtml(page.author_url)}">${escapeHtml(typeof article?.author === 'object' && article.author && !Array.isArray(article.author) && typeof article.author.name === 'string' ? article.author.name : page.author_url)}</a>` : ''}<article>${page.body_text
        .split('\n')
        .map((line) => `<p>${escapeHtml(line)}</p>`)
        .join('')}</article>${links ? `<ul>${links}</ul>` : ''}</main>`
    : ''
  const pixel = page.meta_pixel_id && /^[0-9]{5,25}$/.test(page.meta_pixel_id)
    ? `<noscript><img height="1" width="1" hidden alt="" src="https://www.facebook.com/tr?id=${page.meta_pixel_id}&amp;ev=PageView&amp;noscript=1"></noscript>`
    : ''
  return `<!doctype html><html lang="${page.locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(page.title)}</title><link data-page-seo rel="canonical" href="${escapeHtml(page.canonical_url)}">${tags.join('')}${asset_tags}<script data-page-seo type="application/ld+json"${nonce ? ` nonce="${escapeHtml(nonce)}"` : ''}>${safeJsonLd(page.structured_data)}</script></head><body>${pixel}${body}</body></html>`
}

/** Keep Vite's hashed scripts/styles while including public metadata and content in source. */
export function renderApplicationHtml(page: PageSeo, template: string, nonce: string): string {
  if (!template.includes('<div id="root"></div>') || !template.includes('</head>'))
    throw new Error('Invalid web HTML template')
  const rendered = renderPrerenderHtml(page, nonce)
  const head = rendered.match(/<head>([\s\S]*?)<\/head>/)?.[1] ?? ''
  const body = rendered.match(/<body>([\s\S]*?)<\/body>/)?.[1] ?? ''
  return template
    .replace(/<html[^>]*>/, `<html lang="${page.locale}">`)
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace(/<meta (?:charset="[^"]*"|name="viewport"[^>]*)\s*\/?>/gi, '')
    .replace('</head>', () => `${head}</head>`)
    .replace('<div id="root"></div>', () => `<div id="root">${body}</div>`)
}
