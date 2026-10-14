import { eq } from 'drizzle-orm'
import type { Database } from '@blog/broker'
import { articles, reports } from '../../infra/db/schema.ts'
import type { StoredArticle } from '../article/index.ts'
import { ModerationReadRepository, REPORT_COLUMNS } from './moderation.read.repository.ts'
import type { ModerationReport, ModerationRepositoryPort } from './moderation.types.ts'

const STORED_COLUMNS = {
  id: articles.id,
  author_id: articles.author_id,
  topic_id: articles.topic_id,
  title: articles.title,
  slug: articles.slug,
  blocks: articles.blocks,
  visibility: articles.visibility,
  comments_enabled: articles.comments_enabled,
  status: articles.status,
  published_at: articles.published_at,
  excerpt: articles.excerpt,
  first_image_url: articles.first_image_url,
  seo_title: articles.seo_title,
  seo_description: articles.seo_description,
}

export class ModerationRepository extends ModerationReadRepository implements ModerationRepositoryPort<Database> {
  transaction<T>(work: (tx: Database) => Promise<T>): Promise<T> {
    return this.db.transaction((tx) => work(tx))
  }

  async find(id: string): Promise<StoredArticle | null> {
    const [row] = await this.db.select(STORED_COLUMNS).from(articles).where(eq(articles.id, id)).limit(1)
    return row ?? null
  }

  async lockArticle(tx: Database, id: string): Promise<StoredArticle | null> {
    const [row] = await tx.select(STORED_COLUMNS).from(articles).where(eq(articles.id, id)).limit(1).for('update')
    return row ?? null
  }

  async setStatus(tx: Database, id: string, status: StoredArticle['status']): Promise<StoredArticle | null> {
    const [row] = await tx
      .update(articles)
      .set({ status, updated_at: new Date() })
      .where(eq(articles.id, id))
      .returning(STORED_COLUMNS)
    return row ?? null
  }

  async lockReport(tx: Database, id: string): Promise<ModerationReport | null> {
    const [row] = await tx.select(REPORT_COLUMNS).from(reports).where(eq(reports.id, id)).limit(1).for('update')
    return row ?? null
  }

  async markReviewed(tx: Database, id: string): Promise<ModerationReport | null> {
    const [row] = await tx.update(reports).set({ status: 'reviewed' }).where(eq(reports.id, id)).returning(REPORT_COLUMNS)
    return row ?? null
  }
}
