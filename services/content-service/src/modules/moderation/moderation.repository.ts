import { moderationFiltersSchema } from '@blog/contracts'
import type { ModerationFilters } from '@blog/contracts'
import { createModerationReader } from './moderation.read.ts'
import { createArticleReportReviewer } from './moderation.report-write.ts'
import type { ModerationCursor } from './moderation.cursor.ts'
import { requestArticleCover } from '../social-cover/index.ts'
import { eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { Database } from '@blog/broker'
import { articles, profiles, reports, topics, users_copy } from '../../infra/db/schema.ts'
import { appendArticleEvent } from '../article/article.events.ts'
import type { StoredArticle } from '../article/article.types.ts'

export type ModerationArticle = {
  article: typeof articles.$inferSelect
  topic: typeof topics.$inferSelect
  profile: typeof profiles.$inferSelect | null
  user: typeof users_copy.$inferSelect | null
}

export type ModerationRepository = {
  listReports: (
    limit: number,
    filters: ModerationFilters,
    cursor: ModerationCursor | null,
  ) => Promise<(ModerationArticle & { report: typeof reports.$inferSelect })[]>
  reviewAction: ReturnType<typeof createArticleReportReviewer>
  list: (
    filter: 'reported' | 'hidden' | 'search',
    limit: number,
    filters?: ModerationFilters,
    cursor?: ModerationCursor | null,
  ) => Promise<{ articles: ModerationArticle[]; reports: (typeof reports.$inferSelect)[] }>
  find: (id: string) => Promise<StoredArticle | null>
  transition: (input: {
    id: string
    status: StoredArticle['status']
    event_name: 'content.article.hidden' | 'content.article.restored' | 'content.article.deleted'
    correlation_id: string
    moderator_id: string
  }) => Promise<StoredArticle | null>
  reviewReport: (id: string) => Promise<typeof reports.$inferSelect | null>
}

function stored(row: typeof articles.$inferSelect): StoredArticle {
  return {
    id: row.id,
    author_id: row.author_id,
    topic_id: row.topic_id,
    title: row.title,
    slug: row.slug,
    blocks: row.blocks,
    visibility: row.visibility,
    comments_enabled: row.comments_enabled,
    status: row.status,
    published_at: row.published_at,
    excerpt: row.excerpt,
    first_image_url: row.first_image_url,
    seo_title: row.seo_title,
    seo_description: row.seo_description,
  }
}

export function createModerationRepository(db: NodePgDatabase): ModerationRepository {
  const reader = createModerationReader(db)
  return {
    listReports: reader.reports,
    reviewAction: createArticleReportReviewer(db),
    list: (filter, limit, filters = moderationFiltersSchema.parse({}), cursor = null) =>
      reader.articles(filter, limit, filters, cursor),

    async find(id) {
      const [row] = await db.select().from(articles).where(eq(articles.id, id)).limit(1)
      return row ? stored(row) : null
    },

    async transition(input) {
      return (db as Database).transaction(async (tx) => {
        const [current] = await tx.select().from(articles).where(eq(articles.id, input.id)).limit(1)
        if (!current) return null
        const [row] = await tx
          .update(articles)
          .set({ status: input.status, updated_at: new Date() })
          .where(eq(articles.id, input.id))
          .returning()
        if (!row) return null
        const next = stored(row)
        await requestArticleCover(tx, row.id, input.correlation_id)
        await appendArticleEvent(
          tx,
          input.event_name,
          next,
          input.correlation_id,
          input.moderator_id,
        )
        if (input.event_name !== 'content.article.deleted') {
          await appendArticleEvent(tx, 'content.article.updated', next, input.correlation_id)
        }
        return next
      })
    },

    async reviewReport(id) {
      const [row] = await db
        .update(reports)
        .set({ status: 'reviewed' })
        .where(eq(reports.id, id))
        .returning()
      return row ?? null
    },
  }
}
