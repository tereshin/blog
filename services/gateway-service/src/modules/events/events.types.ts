import { z } from 'zod'
import type { ServiceContext } from '@blog/contracts'

export const FRAME_TYPES = ['article', 'comment', 'reaction', 'bookmark', 'view', 'notification', 'message'] as const
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

export const MAX_ARTICLE_SUBSCRIPTIONS = 200
export const MAX_CONVERSATION_SUBSCRIPTIONS = 50

/** `PUT /v1/events/subscriptions`. */
export const subscriptionsSchema = z.strictObject({
  connection_id: z.uuid(),
  article_ids: z.array(z.uuid()).max(MAX_ARTICLE_SUBSCRIPTIONS).default([]),
  feed_key: z.string().min(1).max(100).optional(),
  conversation_ids: z.array(z.uuid()).max(MAX_CONVERSATION_SUBSCRIPTIONS).default([]),
  notifications: z.boolean().default(false),
})
export type SubscriptionsInput = z.infer<typeof subscriptionsSchema>

/** Поля доступа, которые события несут от владельца статьи. */
export type AccessFields = {
  visibility?: 'public' | 'members' | 'author'
  status?: 'draft' | 'published' | 'hidden' | 'deleted'
  author_id?: string
}

/** Минимум полей события, нужный gateway. Остальное он не читает. */
export const eventFieldsSchema = z.looseObject({
  name: z.string(),
  occurred_at: z.string(),
  article_id: z.uuid().optional(),
  comment_id: z.uuid().optional(),
  conversation_id: z.uuid().optional(),
  notification_id: z.uuid().optional(),
  recipient_id: z.uuid().optional(),
  sender_id: z.uuid().optional(),
  participant_ids: z.array(z.uuid()).optional(),
  visibility: z.enum(['public', 'members', 'author']).optional(),
  status: z.enum(['draft', 'published', 'hidden', 'deleted']).optional(),
  author_id: z.uuid().optional(),
})
export type EventFields = z.infer<typeof eventFieldsSchema>

export type Connection = {
  id: string
  viewer: ServiceContext
  /** Служебный JWT последнего `PUT /subscriptions`: им перепроверяется доступ после смены видимости. */
  viewer_jwt: string | null
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

export type AccessChecker = (viewer_jwt: string, article_id: string) => Promise<ArticleAccess | null>
