import { createIdempotentConsumer } from '@blog/broker'
import type { BrokerClient, Database, OutboxEvent, RunningConsumer } from '@blog/broker'
import {
  ArticleDeletedV1,
  ArticleHiddenV1,
  ArticlePublishedV1,
  ArticleUpdatedV1,
  CommentCreatedV1,
  MessageSentV1,
  ProfileUpdatedV1,
  ReactionAddedV1,
  UserCreatedV1,
} from '@blog/contracts'
import type { Logger } from '@blog/logger'
import type { NotificationService } from './notification.service.ts'

const ARTICLE_EVENTS = {
  'content.article.published': ArticlePublishedV1,
  'content.article.updated': ArticleUpdatedV1,
  'content.article.hidden': ArticleHiddenV1,
  'content.article.deleted': ArticleDeletedV1,
} as const

export type NotificationConsumerDeps = {
  db: Database
  broker: BrokerClient
  logger: Logger
}

const SUBSCRIPTIONS = [
  { durable: 'notification-articles', subject: 'content.article.>' },
  { durable: 'notification-profiles', subject: 'content.profile.updated' },
  { durable: 'notification-users', subject: 'identity.user.created' },
  { durable: 'notification-comments', subject: 'discussion.comment.created' },
  { durable: 'notification-reactions', subject: 'discussion.reaction.added' },
  { durable: 'notification-messages', subject: 'messaging.message.sent' },
] as const

/** Разбирает событие и передаёт его сервису в транзакции потребителя; решения о получателях принимает сервис. */
export class NotificationConsumer {
  constructor(private readonly service: NotificationService<Database>) {}

  readonly handle = async (tx: Database, event: OutboxEvent): Promise<void> => {
    switch (event.name) {
      case 'content.article.published':
      case 'content.article.updated':
      case 'content.article.deleted':
      case 'content.article.hidden': {
        const parsed = ARTICLE_EVENTS[event.name].parse(event)
        const article = { article_id: parsed.article_id, author_id: parsed.author_id, title: parsed.title, slug: parsed.slug }
        await this.service.applyArticle(tx, event, article, event.name === 'content.article.hidden')
        return
      }
      case 'identity.user.created': {
        const parsed = UserCreatedV1.parse(event)
        await this.service.copyUser(tx, { user_id: parsed.user_id, display_name: parsed.display_name })
        return
      }
      case 'content.profile.updated': {
        const parsed = ProfileUpdatedV1.parse(event)
        await this.service.copyUser(tx, { user_id: parsed.user_id, display_name: parsed.display_name, avatar_url: parsed.avatar_url })
        return
      }
      case 'discussion.comment.created':
        await this.service.notifyComment(tx, event, CommentCreatedV1.parse(event))
        return
      case 'discussion.reaction.added':
        await this.service.notifyReaction(tx, event, ReactionAddedV1.parse(event))
        return
      case 'messaging.message.sent':
        await this.service.notifyMessage(tx, event, MessageSentV1.parse(event))
        return
      default:
        return
    }
  }

  /** Каждый durable пишет свою строку в `processed_events`. */
  async start(deps: NotificationConsumerDeps): Promise<RunningConsumer> {
    const running = await Promise.all(
      SUBSCRIPTIONS.map((item) => createIdempotentConsumer({ ...deps, ...item, handler: this.handle })),
    )
    return { stop: async () => void (await Promise.all(running.map((consumer) => consumer.stop()))) }
  }
}
