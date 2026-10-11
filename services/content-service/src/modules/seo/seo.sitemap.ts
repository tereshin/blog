import { and, eq, gt } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { articles, profiles, topics, users_copy } from '../../infra/db/schema.ts'
import type { SeoOptions, SeoRepository } from './seo.types.ts'

const PAGE_SIZE = 10_000
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const KINDS = ['articles', 'profiles', 'topics'] as const
type Kind = (typeof KINDS)[number]
export type CrawlDocument = { content_type: 'text/plain' | 'application/xml'; body: string }

function xml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

function urlset(entries: { url: string; modified_at?: Date }[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.map((entry) => `<url><loc>${xml(entry.url)}</loc>${entry.modified_at ? `<lastmod>${entry.modified_at.toISOString()}</lastmod>` : ''}</url>`).join('')}</urlset>`
}

/** Keyset pages keep each document below the sitemap limits without OFFSET or loading the whole site. */
export function createCrawlService(db: NodePgDatabase, repository: SeoRepository, options: SeoOptions) {
  const origin = new URL(options.public_origin).origin
  const enabled = async () => options.app_env === 'prod' && (await repository.site()).seo.indexing_enabled
  async function entries(kind: Kind, cursor: string | undefined) {
    if (kind === 'articles') {
      const rows = await db.select({ id: articles.id, slug: articles.slug, modified_at: articles.updated_at }).from(articles)
        .where(and(eq(articles.status, 'published'), eq(articles.visibility, 'public'), cursor ? gt(articles.id, cursor) : undefined)).orderBy(articles.id).limit(PAGE_SIZE)
      return rows.map((row) => ({ id: row.id, url: `${origin}/p/${encodeURIComponent(row.slug)}`, modified_at: row.modified_at }))
    }
    if (kind === 'profiles') {
      const rows = await db.select({ id: profiles.user_id, slug: profiles.slug, public_number: users_copy.public_number }).from(profiles)
        .innerJoin(users_copy, eq(users_copy.user_id, profiles.user_id)).where(cursor ? gt(profiles.user_id, cursor) : undefined).orderBy(profiles.user_id).limit(PAGE_SIZE)
      return rows.map((row) => ({ id: row.id, url: `${origin}/u/${encodeURIComponent(row.slug ?? String(row.public_number))}` }))
    }
    const rows = await db.select({ id: topics.id, slug: topics.slug }).from(topics).where(cursor ? gt(topics.id, cursor) : undefined).orderBy(topics.id).limit(PAGE_SIZE)
    return rows.map((row) => ({ id: row.id, url: `${origin}/t/${encodeURIComponent(row.slug)}` }))
  }
  return {
    async robots(): Promise<CrawlDocument> {
      const allow = await enabled()
      return { content_type: 'text/plain', body: allow ? `User-agent: *\nDisallow: /v1/\nDisallow: /internal/\nSitemap: ${origin}/sitemap.xml\n` : 'User-agent: *\nDisallow: /\n' }
    },
    async sitemap(part?: string): Promise<CrawlDocument | null> {
      if (!await enabled()) return { content_type: 'application/xml', body: urlset([]) }
      if (part === 'static') return { content_type: 'application/xml', body: urlset(['/', '/popular', '/rating', '/about'].map((path) => ({ url: `${origin}${path}` }))) }
      if (part) {
        const match = /^(articles|profiles|topics)-(start|[0-9a-f-]+)$/.exec(part)
        if (!match?.[1] || !match[2] || (match[2] !== 'start' && !UUID.test(match[2]))) return null
        return { content_type: 'application/xml', body: urlset(await entries(match[1] as Kind, match[2] === 'start' ? undefined : match[2])) }
      }
      const locations = [`${origin}/sitemaps/static.xml`]
      for (const kind of KINDS) {
        let cursor: string | undefined
        for (;;) {
          const rows = await entries(kind, cursor)
          if (rows.length === 0) break
          locations.push(`${origin}/sitemaps/${kind}-${cursor ?? 'start'}.xml`)
          if (rows.length < PAGE_SIZE) break
          cursor = rows.at(-1)?.id
        }
      }
      return { content_type: 'application/xml', body: `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${locations.map((url) => `<sitemap><loc>${xml(url)}</loc></sitemap>`).join('')}</sitemapindex>` }
    },
  }
}
