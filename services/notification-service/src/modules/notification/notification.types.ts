import type { NotificationKind } from '@blog/contracts'
import type { NotificationCursor } from './notification.schema.ts'

export type ArticleCopy = { article_id: string; author_id: string; title: string; slug: string }

export type UserCopy = { user_id: string; display_name?: string | null; avatar_url?: string | null }

/** Событие-источник: из него берутся `correlation_id` и `causation_id` нового события. */
export type NotificationSource = { event_id: string; occurred_at: string; correlation_id: string }

export type NotifyInput = {
  source: NotificationSource
  user_id: string
  kind: NotificationKind
  article_id?: string | null
  comment_id?: string | null
  conversation_id?: string | null
  actor_id?: string | null
}

export type NotificationRow = {
  id: string
  kind: NotificationKind
  article_id: string | null
  article_slug: string | null
  article_title: string | null
  comment_id: string | null
  conversation_id: string | null
  actor_display_name: string | null
  actor_avatar_url: string | null
  read_at: Date | null
  created_at: Date
}

/**
 * Порт хранилища уведомлений. Записи из событий идут в транзакции потребителя `TTx`;
 * конкретный тип транзакции задаёт место сборки.
 */
export type NotificationRepositoryPort<TTx> = {
  upsertArticle: (tx: TTx, copy: ArticleCopy) => Promise<void>
  upsertUser: (tx: TTx, patch: UserCopy) => Promise<void>
  notify: (tx: TTx, input: NotifyInput) => Promise<void>
  list: (user_id: string, cursor: NotificationCursor | null, limit: number) => Promise<NotificationRow[]>
  unreadCount: (user_id: string) => Promise<number>
  markRead: (user_id: string, id: string) => Promise<NotificationRow | null>
  markAllRead: (user_id: string) => Promise<void>
}
