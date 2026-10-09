import { createIdempotentConsumer } from '@blog/broker'
import type { BrokerClient, Database, EventHandler, RunningConsumer } from '@blog/broker'
import { ArticleDeletedV1, ArticleHiddenV1, ArticlePublishedV1, ArticleRestoredV1, ArticleUpdatedV1, ProfileUpdatedV1, UserCreatedV1, UserRestrictedV1, UserUpdatedV1 } from '@blog/contracts'
import type { Logger } from '@blog/logger'
import { copiesRepository } from './copies.repository.ts'
import type { ArticleCopy } from './copies.repository.ts'

type CopiesRepository = typeof copiesRepository

/** События статьи, которые обновляют `articles_copy`: поля у всех одинаковые. */
const ARTICLE_EVENTS = {
  'content.article.published': ArticlePublishedV1,
  'content.article.updated': ArticleUpdatedV1,
  'content.article.hidden': ArticleHiddenV1,
  'content.article.restored': ArticleRestoredV1,
  'content.article.deleted': ArticleDeletedV1,
} as const

type ArticleSnapshot = Pick<ArticlePublishedV1, 'article_id' | 'author_id' | 'title' | 'slug' | 'visibility' | 'status' | 'comments_enabled' | 'published_at'>

function toArticleCopy(event: ArticleSnapshot): ArticleCopy {
  return {
    article_id: event.article_id,
    author_id: event.author_id,
    title: event.title,
    slug: event.slug,
    visibility: event.visibility,
    status: event.status,
    comments_enabled: event.comments_enabled,
    published_at: event.published_at ? new Date(event.published_at) : null,
  }
}

/** Применяет одно событие к копиям. Неизвестные события пропускает: подписка шире, чем список владельцев копий. */
export function createCopiesHandler(repository: CopiesRepository = copiesRepository): EventHandler {
  return async (tx: Database, event) => {
    switch (event.name) {
      case 'content.article.published':
      case 'content.article.updated':
      case 'content.article.hidden':
      case 'content.article.restored':
      case 'content.article.deleted': {
        const parsed = ARTICLE_EVENTS[event.name].parse(event)
        await repository.upsertArticle(tx, toArticleCopy(parsed))
        return
      }
      case 'identity.user.created': {
        const parsed = UserCreatedV1.parse(event)
        await repository.upsertUser(tx, { user_id: parsed.user_id, display_name: parsed.display_name, is_restricted: parsed.is_restricted })
        return
      }
      case 'identity.user.updated': {
        const parsed = UserUpdatedV1.parse(event)
        await repository.upsertUser(tx, { user_id: parsed.user_id, is_restricted: parsed.is_restricted })
        return
      }
      case 'identity.user.restricted': {
        const parsed = UserRestrictedV1.parse(event)
        await repository.upsertUser(tx, { user_id: parsed.user_id, is_restricted: parsed.is_restricted })
        return
      }
      case 'content.profile.updated': {
        const parsed = ProfileUpdatedV1.parse(event)
        await repository.upsertUser(tx, { user_id: parsed.user_id, display_name: parsed.display_name, avatar_url: parsed.avatar_url })
        return
      }
      default:
        return
    }
  }
}

export type CopiesConsumerDeps = { db: Database; broker: BrokerClient; logger: Logger }

const SUBSCRIPTIONS = [
  { durable: 'discussion-copies-articles', subject: 'content.article.>' },
  { durable: 'discussion-copies-profiles', subject: 'content.profile.updated' },
  { durable: 'discussion-copies-users', subject: 'identity.user.>' },
] as const

/** Запускает потребителей копий. Каждый — durable с собственной записью в `processed_events`. */
export async function startCopiesConsumers(deps: CopiesConsumerDeps): Promise<RunningConsumer> {
  const handler = createCopiesHandler()
  const running = await Promise.all(SUBSCRIPTIONS.map((item) => createIdempotentConsumer({ ...deps, ...item, handler })))
  return { stop: async () => void (await Promise.all(running.map((consumer) => consumer.stop()))) }
}
