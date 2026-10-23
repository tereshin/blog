import type { ServiceContext } from '@blog/contracts'

export const FRAME_TYPES = ['article', 'comment', 'reaction', 'bookmark', 'view', 'notification', 'message', 'settings'] as const
export type FrameType = (typeof FRAME_TYPES)[number]

/** Кадр потока: только тип и идентификаторы, без текста статьи (contracts/realtime.md). */
export type EventFrame =
  | { type: 'hello'; connection_id: string }
  | {
      type: FrameType
      article_id?: string
      comment_id?: string
      conversation_id?: string
      notification_id?: string
      occurred_at: string
    }

/** Поля доступа, которые события несут от владельца статьи. */
export type AccessFields = {
  visibility?: 'public' | 'members' | 'author'
  status?: 'draft' | 'published' | 'hidden' | 'deleted'
  author_id?: string
}

export type Connection = {
  id: string
  viewer: ServiceContext
  article_ids: Set<string>
  conversation_ids: Set<string>
  feed_key: string | null
  notifications: boolean
  write: (frame: EventFrame) => boolean
  close: () => void
}

/** Решение владельца статьи о доступе зрителя: `GET /internal/articles/{id}/access`. */
export type ArticleAccess = {
  can_read: boolean
  visibility: 'public' | 'members' | 'author'
  status: 'draft' | 'published' | 'hidden' | 'deleted'
  author_id: string
}

/** Порт проверки доступа у владельца статьи; `null` — статьи нет. */
export type ArticleAccessPort = {
  check: (viewer_jwt: string, article_id: string) => Promise<ArticleAccess | null>
}

export type BrokerMessage = { subject: string; json: () => unknown }
export type BrokerSubscription = AsyncIterable<BrokerMessage> & { unsubscribe: () => void }

/** Порт источника событий брокера: реализацию (NATS) подставляет main.ts. */
export type EventSourcePort = {
  subscribe: (subject: string) => BrokerSubscription
}
