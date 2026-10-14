import { createIdempotentConsumer } from '@blog/broker'
import type { BrokerClient, Database, EventHandler, RunningConsumer } from '@blog/broker'
import { ArticleDeletedV1, ArticleHiddenV1, ArticlePublishedV1, ArticleRestoredV1, ArticleUpdatedV1, ProfileUpdatedV1, UserCreatedV1, UserRestrictedV1, UserUpdatedV1 } from '@blog/contracts'
import type { Logger } from '@blog/logger'
import type { CopiesService } from './copies.service.ts'

/** События статьи, которые обновляют `articles_copy`: поля у всех одинаковые. */
const ARTICLE_EVENTS = {
  'content.article.published': ArticlePublishedV1,
  'content.article.updated': ArticleUpdatedV1,
  'content.article.hidden': ArticleHiddenV1,
  'content.article.restored': ArticleRestoredV1,
  'content.article.deleted': ArticleDeletedV1,
} as const

const SUBSCRIPTIONS = [
  { durable: 'discussion-copies-articles', subject: 'content.article.>' },
  { durable: 'discussion-copies-profiles', subject: 'content.profile.updated' },
  { durable: 'discussion-copies-users', subject: 'identity.user.>' },
] as const

export type CopiesConsumerDeps = { db: Database; broker: BrokerClient; logger: Logger }

export class CopiesConsumer {
  constructor(private readonly service: CopiesService<Database>) {}

  /** Применяет одно событие к копиям. Неизвестные события пропускает: подписка шире, чем список владельцев копий. */
  readonly handle: EventHandler = async (tx, event) => {
    switch (event.name) {
      case 'content.article.published':
      case 'content.article.updated':
      case 'content.article.hidden':
      case 'content.article.restored':
      case 'content.article.deleted': {
        await this.service.applyArticle(tx, ARTICLE_EVENTS[event.name].parse(event))
        return
      }
      case 'identity.user.created': {
        const parsed = UserCreatedV1.parse(event)
        await this.service.applyUser(tx, { user_id: parsed.user_id, display_name: parsed.display_name, is_restricted: parsed.is_restricted })
        return
      }
      case 'identity.user.updated': {
        const parsed = UserUpdatedV1.parse(event)
        await this.service.applyUser(tx, { user_id: parsed.user_id, is_restricted: parsed.is_restricted })
        return
      }
      case 'identity.user.restricted': {
        const parsed = UserRestrictedV1.parse(event)
        await this.service.applyUser(tx, { user_id: parsed.user_id, is_restricted: parsed.is_restricted })
        return
      }
      case 'content.profile.updated': {
        const parsed = ProfileUpdatedV1.parse(event)
        await this.service.applyUser(tx, { user_id: parsed.user_id, display_name: parsed.display_name, avatar_url: parsed.avatar_url, slug: parsed.slug })
        return
      }
      default:
        return
    }
  }

  /** Запускает потребителей копий. Каждый — durable с собственной записью в `processed_events`. */
  async start(deps: CopiesConsumerDeps): Promise<RunningConsumer> {
    const running = await Promise.all(SUBSCRIPTIONS.map((item) => createIdempotentConsumer({ ...deps, ...item, handler: this.handle })))
    return { stop: async () => void (await Promise.all(running.map((consumer) => consumer.stop()))) }
  }
}
