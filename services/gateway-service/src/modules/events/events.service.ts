import { randomUUID } from 'node:crypto'
import { LRUCache } from 'lru-cache'
import type { ServiceContext } from '@blog/contracts'
import { ForbiddenError, NotFoundError } from '@blog/errors'
import type { Logger } from '@blog/logger'
import { EventFieldsSchema } from './events.schema.ts'
import type { EventFields, SubscriptionsInput } from './events.schema.ts'
import type {
  ArticleAccessPort,
  Connection,
  EventFrame,
  EventSourcePort,
  FrameType,
} from './events.types.ts'
import { SubscriptionRegistry } from './subscription-registry.ts'

/** События брокера → тип кадра. Не из списка — кадра нет. */
const FRAME_BY_PREFIX: readonly { prefix: string; type: FrameType }[] = [
  { prefix: 'content.article.', type: 'article' },
  { prefix: 'content.settings.', type: 'settings' },
  { prefix: 'discussion.comment.', type: 'comment' },
  { prefix: 'discussion.reaction.', type: 'reaction' },
  { prefix: 'discussion.bookmark.', type: 'bookmark' },
  { prefix: 'discussion.article_view.', type: 'view' },
  { prefix: 'notification.notification.', type: 'notification' },
  { prefix: 'messaging.message.', type: 'message' },
]

const BROKER_SUBJECTS = ['content.>', 'discussion.>', 'messaging.>', 'notification.>'] as const
const ACCESS_CACHE_TTL_MS = 30_000
const ACCESS_CONCURRENCY = 8

export function frameTypeOf(event_name: string): FrameType | null {
  return FRAME_BY_PREFIX.find((item) => event_name.startsWith(item.prefix))?.type ?? null
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
  private pending_access: Promise<void>[] = []

  constructor(
    private readonly access: ArticleAccessPort,
    private readonly logger: Logger,
    private readonly signer: { sign: (context: ServiceContext) => Promise<string> },
  ) {}

  newConnectionId(): string {
    return randomUUID()
  }

  register(connection: Connection): void {
    this.registry.add(connection)
  }

  unregister(connection_id: string): void {
    this.registry.remove(connection_id)
  }

  /** Подписки меняет только владелец соединения: чужой `connection_id` — 403. */
  async updateSubscriptions(viewer: ServiceContext, viewer_jwt: string, input: SubscriptionsInput): Promise<{ article_ids: string[] }> {
    const connection = this.registry.get(input.connection_id)
    if (!connection) throw new NotFoundError({ message: 'Соединение не найдено: переподключитесь' })
    if (connection.viewer.viewer_key !== viewer.viewer_key) throw new ForbiddenError()
    connection.viewer = viewer
    return this.subscribe(connection, viewer_jwt, input)
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
    const parsed = EventFieldsSchema.safeParse(raw_event)
    if (!parsed.success) return 0
    const event = parsed.data
    const type = frameTypeOf(event.name)
    if (!type) return 0

    const frame = toFrame(type, event)
    const targets = this.targets(type, event)
    let delivered = 0
    for (const connection of targets) {
      if (connection.write(frame)) delivered += 1
      if (
        type === 'settings' &&
        event.maintenance_enabled === true &&
        connection.viewer.role !== 'admin' &&
        connection.viewer.role !== 'superadmin'
      ) {
        connection.close()
        this.unregister(connection.id)
      }
    }
    if (type === 'article' && event.article_id && (event.visibility !== undefined || event.status !== undefined)) {
      this.track(this.revokeLostAccess(event.article_id, targets))
    }
    return delivered
  }

  /** Дожидается пересчёта доступа после кадров статьи. Нужен тестам и остановке реплики. */
  async settle(): Promise<void> {
    await Promise.all(this.pending_access)
  }

  /** Подписывается на события брокера; возвращает функцию остановки. */
  start(source: EventSourcePort): { stop: () => void } {
    const subscriptions = BROKER_SUBJECTS.map((subject) => source.subscribe(subject))
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
      case 'message': {
        const user_ids = new Set(event.participant_ids ?? [])
        if (event.sender_id) user_ids.add(event.sender_id)
        if (event.recipient_id) user_ids.add(event.recipient_id)
        return [...user_ids].flatMap((user_id) => this.registry.forUser(user_id))
      }
      case 'article':
        // Сигнал статьи уходит и тем, у кого доступ сузили: клиент должен убрать текст.
        return event.article_id ? this.registry.forArticle(event.article_id) : []
      case 'settings':
        return this.registry.all()
      default: {
        if (!event.article_id) return []
        return this.registry
          .forArticle(event.article_id)
          .filter((connection) => {
            const cached = this.access_cache.get(`${connection.viewer.viewer_key}:${event.article_id}`)
            return cached !== false
          })
      }
    }
  }

  private track(work: Promise<void>): void {
    const tracked = work.catch((error: unknown) => {
      this.logger.error({ err: error }, 'events: фоновая проверка доступа завершилась ошибкой')
    }).finally(() => {
      this.pending_access = this.pending_access.filter((item) => item !== tracked)
    })
    this.pending_access.push(tracked)
  }

  /**
   * Кадр статьи уже ушёл всем, кто её открыл, включая потерявших доступ.
   * Дальше статья снимается с подписки тех, кому владелец больше её не отдаёт.
   */
  private async revokeLostAccess(article_id: string, connections: readonly Connection[]): Promise<void> {
    for (let index = 0; index < connections.length; index += ACCESS_CONCURRENCY) {
      const batch = connections.slice(index, index + ACCESS_CONCURRENCY)
      await Promise.all(batch.map(async (connection) => {
        const key = `${connection.viewer.viewer_key}:${article_id}`
        this.access_cache.delete(key)
        try {
          // SSE живёт дольше служебного JWT: подписываем контекст перед каждым запросом.
          const viewer_jwt = await this.signer.sign(connection.viewer)
          const access = await this.access.check(viewer_jwt, article_id)
          const can_read = access?.can_read === true
          this.access_cache.set(key, can_read)
          if (!can_read) this.registry.dropArticle(connection.id, article_id)
        } catch (error) {
          // Если доступ не подтверждён, прекращаем сигналы этой статьи, не весь gateway.
          this.access_cache.set(key, false)
          this.registry.dropArticle(connection.id, article_id)
          this.logger.warn({ err: error, article_id }, 'events: доступ не подтверждён, подписка снята')
        }
      }))
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
      const results = await Promise.all(batch.map((id) => this.access.check(viewer_jwt, id)))
      batch.forEach((id, position) => {
        const can_read = results[position]?.can_read === true
        this.access_cache.set(`${viewer.viewer_key}:${id}`, can_read)
        if (can_read) readable.add(id)
      })
    }
    return article_ids.filter((id) => readable.has(id))
  }
}
