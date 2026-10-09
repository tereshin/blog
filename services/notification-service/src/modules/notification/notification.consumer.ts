import { createIdempotentConsumer } from '@blog/broker'
import type { BrokerClient, Database, EventHandler, RunningConsumer } from '@blog/broker'
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
import type { NotificationRepository } from './notification.repository.ts'

const ARTICLE_EVENTS = {
  'content.article.published': ArticlePublishedV1,
  'content.article.updated': ArticleUpdatedV1,
  'content.article.hidden': ArticleHiddenV1,
  'content.article.deleted': ArticleDeletedV1,
} as const

/** Применяет одно событие: копии статьи и участника и записи уведомлений. Своё действие запись не создаёт. */
export function createNotificationHandler(repository: NotificationRepository): EventHandler {
  return async (tx: Database, event) => {
    switch (event.name) {
      case 'content.article.published':
      case 'content.article.updated':
      case 'content.article.deleted':
      case 'content.article.hidden': {
        const parsed = ARTICLE_EVENTS[event.name].parse(event)
        await repository.upsertArticle(tx, {
          article_id: parsed.article_id,
          author_id: parsed.author_id,
          title: parsed.title,
          slug: parsed.slug,
        })
        if (event.name === 'content.article.hidden') {
          await repository.notify(tx, {
            source: event,
            user_id: parsed.author_id,
            kind: 'moderation',
            article_id: parsed.article_id,
            actor_id: null,
          })
        }
        return
      }
      case 'identity.user.created': {
        const parsed = UserCreatedV1.parse(event)
        await repository.upsertUser(tx, { user_id: parsed.user_id, display_name: parsed.display_name })
        return
      }
      case 'content.profile.updated': {
        const parsed = ProfileUpdatedV1.parse(event)
        await repository.upsertUser(tx, { user_id: parsed.user_id, display_name: parsed.display_name, avatar_url: parsed.avatar_url })
        return
      }
      case 'discussion.comment.created': {
        const parsed = CommentCreatedV1.parse(event)
        if (parsed.author_id !== parsed.article_author_id) {
          await repository.notify(tx, {
            source: event,
            user_id: parsed.article_author_id,
            kind: 'comment',
            article_id: parsed.article_id,
            comment_id: parsed.comment_id,
            actor_id: parsed.author_id,
          })
        }
        if (parsed.parent_author_id && parsed.parent_author_id !== parsed.author_id && parsed.parent_author_id !== parsed.article_author_id) {
          await repository.notify(tx, {
            source: event,
            user_id: parsed.parent_author_id,
            kind: 'reply',
            article_id: parsed.article_id,
            comment_id: parsed.comment_id,
            actor_id: parsed.author_id,
          })
        }
        return
      }
      case 'discussion.reaction.added': {
        const parsed = ReactionAddedV1.parse(event)
        if (parsed.target_type === 'article' && parsed.actor_id !== parsed.target_author_id) {
          await repository.notify(tx, {
            source: event,
            user_id: parsed.target_author_id,
            kind: 'reaction',
            article_id: parsed.article_id,
            actor_id: parsed.actor_id,
          })
        }
        return
      }
      case 'messaging.message.sent': {
        const parsed = MessageSentV1.parse(event)
        if (parsed.sender_id === parsed.recipient_id) return
        await repository.notify(tx, {
          source: event,
          user_id: parsed.recipient_id,
          kind: 'message',
          conversation_id: parsed.conversation_id,
          actor_id: parsed.sender_id,
        })
        return
      }
      default:
        return
    }
  }
}

export type NotificationConsumerDeps = { db: Database; broker: BrokerClient; logger: Logger; repository: NotificationRepository }

const SUBSCRIPTIONS = [
  { durable: 'notification-articles', subject: 'content.article.>' },
  { durable: 'notification-profiles', subject: 'content.profile.updated' },
  { durable: 'notification-users', subject: 'identity.user.created' },
  { durable: 'notification-comments', subject: 'discussion.comment.created' },
  { durable: 'notification-reactions', subject: 'discussion.reaction.added' },
  { durable: 'notification-messages', subject: 'messaging.message.sent' },
] as const

/** Запускает потребителей. Каждый durable пишет свою строку в `processed_events`. */
export async function startNotificationConsumers(deps: NotificationConsumerDeps): Promise<RunningConsumer> {
  const handler = createNotificationHandler(deps.repository)
  const running = await Promise.all(SUBSCRIPTIONS.map((item) => createIdempotentConsumer({ ...deps, ...item, handler })))
  return { stop: async () => void (await Promise.all(running.map((consumer) => consumer.stop()))) }
}
