import { ArticleDeletedV1, ArticlePublishedV1, ArticleUpdatedV1 } from '@blog/contracts'
import { appendToOutbox, newEventId } from '@blog/broker'
import type { Database } from '@blog/broker'
import type { StoredArticle } from './article.types.ts'

const SCHEMAS = {
  'content.article.published': ArticlePublishedV1,
  'content.article.updated': ArticleUpdatedV1,
  'content.article.deleted': ArticleDeletedV1,
} as const

type ArticleEventName = keyof typeof SCHEMAS

/** Снимок статьи в outbox в той же транзакции, что и запись. Брокер получит его отдельно. */
export async function appendArticleEvent(tx: Database, name: ArticleEventName, row: StoredArticle, correlation_id: string): Promise<void> {
  await appendToOutbox(
    tx,
    SCHEMAS[name].parse({
      event_id: newEventId(),
      name,
      occurred_at: new Date().toISOString(),
      correlation_id,
      causation_id: null,
      version: 1,
      article_id: row.id,
      author_id: row.author_id,
      topic_id: row.topic_id,
      title: row.title,
      slug: row.slug,
      visibility: row.visibility,
      status: row.status,
      comments_enabled: row.comments_enabled,
      excerpt: row.excerpt,
      first_image_url: row.first_image_url,
      published_at: row.published_at ? row.published_at.toISOString() : null,
    }),
  )
}
