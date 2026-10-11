import type { SeoGraphNode, SeoSite } from './seo.types.ts'

export function siteGraph(site: SeoSite, origin: string): SeoGraphNode[] {
  const publisher = site.seo.publisher
  const logo = publisher.logo_url ?? site.logo_url
  return [
    { '@type': 'WebSite', '@id': `${origin}/#website`, url: `${origin}/`, name: site.name, inLanguage: site.locale, publisher: { '@id': `${origin}/#publisher` } },
    { '@type': 'Organization', '@id': `${origin}/#publisher`, name: publisher.name || site.name, url: `${origin}/`, ...(logo ? { logo: { '@type': 'ImageObject', url: logo } } : {}), ...(publisher.same_as.length ? { sameAs: publisher.same_as } : {}) },
  ]
}

export function pageGraph(type: string, title: string, description: string, canonical: string, origin: string, site: SeoSite): SeoGraphNode {
  return { '@type': type, '@id': `${canonical}#webpage`, url: canonical, name: title, description, inLanguage: site.locale, isPartOf: { '@id': `${origin}/#website` } }
}

export function breadcrumbGraph(canonical: string, items: { name: string; url: string }[]): SeoGraphNode {
  return { '@type': 'BreadcrumbList', '@id': `${canonical}#breadcrumbs`, itemListElement: items.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, item: item.url })) }
}
