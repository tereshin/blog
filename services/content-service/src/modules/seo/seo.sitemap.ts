import { and, eq, gt } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { articles, profiles, topics, users_copy } from '../../infra/db/schema.ts'
import type { SeoOptions, SeoRepositoryPort } from './seo.types.ts'

const PAGE_SIZE = 10_000
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const KINDS = ['articles', 'profiles', 'topics', 'pages'] as const
type Kind = (typeof KINDS)[number]
export type CrawlDocument = { content_type: 'text/plain' | 'application/xml'; body: string }

function xml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function urlset(entries: { url: string; modified_at?: Date }[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.map((entry) => `<url><loc>${xml(entry.url)}</loc>${entry.modified_at ? `<lastmod>${entry.modified_at.toISOString()}</lastmod>` : ''}</url>`).join('')}</urlset>`
}

/** Keyset pages keep each document below the sitemap limits without OFFSET or loading the whole site. */
export class CrawlService {
  constructor(
    private readonly db: NodePgDatabase,
    private readonly repository: SeoRepositoryPort,
    private readonly options: SeoOptions,
    private readonly published_pages?: (
      cursor?: string,
      limit?: number,
    ) => Promise<{ id: string; slug: string; updated_at: Date }[]>,
  ) {}

  private origin() {
    return new URL(this.options.public_origin).origin
  }

  private async enabled() {
    return this.options.app_env === 'prod' && (await this.repository.site()).seo.indexing_enabled
  }

  private async entries(kind: Kind, cursor: string | undefined) {
    const origin = this.origin()
    const published_pages = this.published_pages
    const db = this.db
    if (kind === 'pages') {
      const rows = (await published_pages?.(cursor, PAGE_SIZE)) ?? []
      return rows.map((row) => ({
        id: row.id,
        url: `${origin}/pages/${encodeURIComponent(row.slug)}`,
        modified_at: row.updated_at,
      }))
    }
    if (kind === 'articles') {
      const rows = await db
        .select({ id: articles.id, slug: articles.slug, modified_at: articles.updated_at })
        .from(articles)
        .where(
          and(
            eq(articles.status, 'published'),
            eq(articles.visibility, 'public'),
            cursor ? gt(articles.id, cursor) : undefined,
          ),
        )
        .orderBy(articles.id)
        .limit(PAGE_SIZE)
      return rows.map((row) => ({
        id: row.id,
        url: `${origin}/p/${encodeURIComponent(row.slug)}`,
        modified_at: row.modified_at,
      }))
    }
    if (kind === 'profiles') {
      const rows = await db
        .select({
          id: profiles.user_id,
          slug: profiles.slug,
          public_number: users_copy.public_number,
        })
        .from(profiles)
        .innerJoin(users_copy, eq(users_copy.user_id, profiles.user_id))
        .where(and(eq(users_copy.is_deleted, false), cursor ? gt(profiles.user_id, cursor) : undefined))
        .orderBy(profiles.user_id)
        .limit(PAGE_SIZE)
      return rows.map((row) => ({
        id: row.id,
        url: `${origin}/u/${encodeURIComponent(row.slug ?? String(row.public_number))}`,
      }))
    }
    const rows = await db
      .select({ id: topics.id, slug: topics.slug })
      .from(topics)
      .where(cursor ? gt(topics.id, cursor) : undefined)
      .orderBy(topics.id)
      .limit(PAGE_SIZE)
    return rows.map((row) => ({ id: row.id, url: `${origin}/t/${encodeURIComponent(row.slug)}` }))
  }

  async robots(): Promise<CrawlDocument> {
      const origin = this.origin()
      const allow = await this.enabled()
      return {
        content_type: 'text/plain',
        body: allow
          ? `User-agent: *\nDisallow: /v1/\nDisallow: /internal/\nSitemap: ${origin}/sitemap.xml\n`
          : 'User-agent: *\nDisallow: /\n',
      }
  }

  async sitemap(part?: string): Promise<CrawlDocument | null> {
      const origin = this.origin()
      if (!(await this.enabled())) return { content_type: 'application/xml', body: urlset([]) }
      if (part === 'static')
        return {
          content_type: 'application/xml',
          body: urlset(
            ['/', '/popular', '/discovery', '/discovery/blogs', '/discovery/topics'].map((path) => ({ url: `${origin}${path}` })),
          ),
        }
      if (part) {
        const match = /^(articles|profiles|topics|pages)-(start|[0-9a-f-]+)$/.exec(part)
        if (!match?.[1] || !match[2] || (match[2] !== 'start' && !UUID.test(match[2]))) return null
        return {
          content_type: 'application/xml',
          body: urlset(
            await this.entries(match[1] as Kind, match[2] === 'start' ? undefined : match[2]),
          ),
        }
      }
      const locations = [`${origin}/sitemaps/static.xml`]
      for (const kind of KINDS) {
        let cursor: string | undefined
        for (;;) {
          const rows = await this.entries(kind, cursor)
          if (rows.length === 0) break
          locations.push(`${origin}/sitemaps/${kind}-${cursor ?? 'start'}.xml`)
          if (rows.length < PAGE_SIZE) break
          cursor = rows.at(-1)?.id
        }
      }
      return {
        content_type: 'application/xml',
        body: `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${locations.map((url) => `<sitemap><loc>${xml(url)}</loc></sitemap>`).join('')}</sitemapindex>`,
      }
  }
}
