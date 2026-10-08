import { randomUUID } from 'node:crypto'
import { LRUCache } from 'lru-cache'
import { canReadArticle } from '@blog/contracts'
import type { ServiceContext } from '@blog/contracts'
import type { Logger } from '@blog/logger'
import type { NatsConnection } from '@nats-io/transport-node'
import { eventFieldsSchema } from './events.types.ts'
import type {
  AccessChecker,
  AccessFields,
  Connection,
  EventFields,
  EventFrame,
  FrameType,
  SubscriptionsInput,
} from './events.types.ts'
import { SubscriptionRegistry } from './subscription-registry.ts'

/** События брокера → тип кадра. Не из списка — кадра нет. */
const FRAME_BY_PREFIX: readonly { prefix: string; type: FrameType }[] = [
  { prefix: 'content.article.', type: 'article' },
  { prefix: 'discussion.comment.', type: 'comment' },
  { prefix: 'discussion.reaction.', type: 'reaction' },
  { prefix: 'discussion.bookmark.', type: 'bookmark' },
  { prefix: 'discussion.view.', type: 'view' },
  { prefix: 'notification.notification.', type: 'notification' },
  { prefix: 'messaging.message.', type: 'message' },
]

const BROKER_SUBJECTS = ['content.>', 'discussion.>', 'messaging.>', 'notification.>'] as const
const ACCESS_CACHE_TTL_MS = 30_000
const ACCESS_CONCURRENCY = 8

export function frameTypeOf(event_name: string): FrameType | null {
  return FRAME_BY_PREFIX.find((item) => event_name.startsWith(item.prefix))?.type ?? null
}

/**
 * Правило чтения по полям события — то же, что у владельца статьи (`canReadArticle` из @blog/contracts).
 * Поля, которых нет в событии, трактуются как «опубликовано и публично».
 */
export function canReadFields(viewer: ServiceContext, fields: AccessFields): boolean {
  return canReadArticle(viewer, {
    author_id: fields.author_id ?? '',
    visibility: fields.visibility ?? 'public',
    status: fields.status ?? 'published',
  })
}

export function toFrame(type: FrameType, event: EventFields): EventFrame {
  return {
    type,
    ...(event.article_id ? { article_id: event.article_id } : {}),
    ...(event.comment_id ? { comment_id: event.comment_id } : {}),
    ...(event.conversation_id ? { conversation_id: event.conversation_id } : {}),
    ...(event.notification_id ? { notification_id: event.notification_id } : {}),
    occurred_at: event.occurred_at,
  }
}

export class EventsService {
  readonly registry = new SubscriptionRegistry()
  private readonly access_cache = new LRUCache<string, boolean>({ max: 20_000, ttl: ACCESS_CACHE_TTL_MS })

  constructor(
    private readonly check_access: AccessChecker,
    private readonly logger: Logger,
  ) {}

  newConnectionId(): string {
    return randomUUID()
  }

  /**
   * Заменяет подписки соединения. Статьи, которые зритель не вправе читать, в подписку не попадают
   * (чужой черновик, закрытая статья) — клиент узнаёт об этом по списку принятых.
   */
  async subscribe(connection: Connection, viewer_jwt: string, input: SubscriptionsInput): Promise<{ article_ids: string[] }> {
    const accepted = await this.filterReadable(connection.viewer, viewer_jwt, input.article_ids)
    this.registry.replace(connection, {
      article_ids: accepted,
      conversation_ids: input.conversation_ids,
      feed_key: input.feed_key ?? null,
      notifications: input.notifications && connection.viewer.user_id !== undefined,
    })
    return { article_ids: accepted }
  }

  /** Разбирает событие брокера и рассылает кадры подходящим соединениям этой реплики. */
  dispatch(raw_event: unknown): number {
    const parsed = eventFieldsSchema.safeParse(raw_event)
    if (!parsed.success) return 0
    const event = parsed.data
    const type = frameTypeOf(event.name)
    if (!type) return 0

    const frame = toFrame(type, event)
    let delivered = 0
    for (const connection of this.targets(type, event)) {
      if (connection.write(frame)) delivered += 1
    }
    return delivered
  }

  /** Подписывается на события брокера; возвращает функцию остановки. */
  start(nc: NatsConnection): { stop: () => void } {
    const subscriptions = BROKER_SUBJECTS.map((subject) => nc.subscribe(subject))
    for (const subscription of subscriptions) {
      void (async () => {
        for await (const message of subscription) {
          try {
            this.dispatch(message.json())
          } catch (error) {
            this.logger.warn({ err: error, subject: message.subject }, 'events: сообщение брокера не разобрано')
          }
        }
      })()
    }
    return { stop: () => subscriptions.forEach((subscription) => subscription.unsubscribe()) }
  }

  closeUserConnections(user_id: string): void {
    for (const connection of this.registry.forUser(user_id)) connection.close()
  }

  private targets(type: FrameType, event: EventFields): Connection[] {
    switch (type) {
      case 'notification':
        return event.recipient_id
          ? this.registry.forUser(event.recipient_id).filter((connection) => connection.notifications)
          : []
      case 'message':
        return (event.participant_ids ?? []).flatMap((user_id) => this.registry.forUser(user_id))
      case 'article':
        // Сигнал статьи уходит и тем, у кого доступ сузили: клиент должен убрать текст.
        return event.article_id ? this.registry.forArticle(event.article_id) : []
      default: {
        if (!event.article_id) return []
        const has_access_fields = event.status !== undefined || event.visibility !== undefined
        return this.registry
          .forArticle(event.article_id)
          .filter((connection) => !has_access_fields || canReadFields(connection.viewer, event))
      }
    }
  }

  private async filterReadable(viewer: ServiceContext, viewer_jwt: string, article_ids: readonly string[]): Promise<string[]> {
    const readable = new Set<string>()
    const pending: string[] = []
    for (const id of article_ids) {
      const cached = this.access_cache.get(`${viewer.viewer_key}:${id}`)
      if (cached === undefined) pending.push(id)
      else if (cached) readable.add(id)
    }
    for (let index = 0; index < pending.length; index += ACCESS_CONCURRENCY) {
      const batch = pending.slice(index, index + ACCESS_CONCURRENCY)
      const results = await Promise.all(batch.map((id) => this.check_access(viewer_jwt, id)))
      batch.forEach((id, position) => {
        const can_read = results[position]?.can_read === true
        this.access_cache.set(`${viewer.viewer_key}:${id}`, can_read)
        if (can_read) readable.add(id)
      })
    }
    return article_ids.filter((id) => readable.has(id))
  }
}
