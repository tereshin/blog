import type { PageSeo } from '@blog/contracts'

const MARKER = 'data-page-seo'
export function clearPageHead(site_name: string): void {
  for (const node of document.head.querySelectorAll(`[${MARKER}]`)) node.remove()
  document.title = site_name
  const robots = document.createElement('meta')
  robots.name = 'robots'
  robots.content = 'noindex, follow'
  robots.setAttribute(MARKER, '')
  document.head.append(robots)
}

/** DOM APIs keep values inert; only this owner creates and replaces page metadata. */
export function applyPageHead(page: PageSeo): void {
  clearPageHead(page.site_name)
  document.head.querySelector(`meta[${MARKER}]`)?.remove()
  document.title = page.title
  document.documentElement.lang = page.locale
  const meta = (key: string, value: string, property = false) => {
    const tag = document.createElement('meta')
    tag.setAttribute(property ? 'property' : 'name', key)
    tag.content = value
    tag.setAttribute(MARKER, '')
    document.head.append(tag)
  }
  const canonical = document.createElement('link')
  canonical.rel = 'canonical'
  canonical.href = page.canonical_url
  canonical.setAttribute(MARKER, '')
  document.head.append(canonical)
  meta('description', page.description)
  meta('robots', page.robots)
  meta('og:title', page.title, true)
  meta('og:description', page.description, true)
  meta('og:type', page.og_type, true)
  meta('og:url', page.canonical_url, true)
  meta('og:site_name', page.site_name, true)
  meta('og:locale', { ru: 'ru_RU', en: 'en_US', sr: 'sr_RS' }[page.locale], true)
  meta('twitter:card', 'summary_large_image')
  meta('twitter:title', page.title)
  meta('twitter:description', page.description)
  if (page.images) {
    const { og, twitter, vk } = page.images
    meta('og:image', og.url, true)
    meta('og:image:type', og.mime, true)
    meta('og:image:alt', og.alt, true)
    if (og.width) meta('og:image:width', String(og.width), true)
    if (og.height) meta('og:image:height', String(og.height), true)
    meta('twitter:image', twitter.url)
    meta('twitter:image:alt', twitter.alt)
    meta('vk:image', vk.url, true)
  }
  if (page.author_url) meta('article:author', page.author_url, true)
  if (page.published_at) meta('article:published_time', page.published_at, true)
  if (page.modified_at) meta('article:modified_time', page.modified_at, true)
  if (page.section) meta('article:section', page.section, true)
  const json_ld = document.createElement('script')
  json_ld.type = 'application/ld+json'
  json_ld.textContent = JSON.stringify(page.structured_data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
  json_ld.setAttribute(MARKER, '')
  document.head.append(json_ld)
}
