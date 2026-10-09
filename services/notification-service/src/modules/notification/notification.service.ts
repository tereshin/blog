import type { Notification, NotificationPage, ServiceContext, UnreadCount } from '@blog/contracts'
import { UnauthorizedError } from '@blog/errors'
import { NotificationNotFoundError } from './notification.errors.ts'
import type { NotificationRepository, NotificationRow } from './notification.repository.ts'
import { decodeNotificationCursor, encodeNotificationCursor } from './notification.schema.ts'
import type { notificationQuerySchema } from './notification.schema.ts'
import type { z } from 'zod'

type NotificationQuery = z.infer<typeof notificationQuerySchema>

function requireUser(viewer: ServiceContext): string {
  if (!viewer.user_id) throw new UnauthorizedError()
  return viewer.user_id
}

function toNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    kind: row.kind,
    article_id: row.article_id,
    article_slug: row.article_slug,
    article_title: row.article_title,
    comment_id: row.comment_id,
    conversation_id: row.conversation_id,
    actor: { display_name: row.actor_display_name ?? '', avatar_url: row.actor_avatar_url },
    read_at: row.read_at ? row.read_at.toISOString() : null,
    created_at: row.created_at.toISOString(),
  }
}

export type NotificationService = {
  list: (viewer: ServiceContext, query: NotificationQuery) => Promise<NotificationPage>
  unreadCount: (viewer: ServiceContext) => Promise<UnreadCount>
  markRead: (viewer: ServiceContext, id: string) => Promise<Notification>
  markAllRead: (viewer: ServiceContext) => Promise<void>
}

export function createNotificationService(repository: NotificationRepository): NotificationService {
  return {
    async list(viewer, query) {
      const user_id = requireUser(viewer)
      const cursor = query.cursor ? decodeNotificationCursor(query.cursor) : null
      const rows = await repository.list(user_id, cursor, query.limit + 1)
      const page = rows.slice(0, query.limit)
      const last = page.at(-1)
      return {
        items: page.map(toNotification),
        next_cursor: rows.length > query.limit && last ? encodeNotificationCursor({ t: last.created_at.toISOString(), id: last.id }) : null,
      }
    },

    async unreadCount(viewer) {
      return { count: await repository.unreadCount(requireUser(viewer)) }
    },

    async markRead(viewer, id) {
      const row = await repository.markRead(requireUser(viewer), id)
      if (!row) throw new NotificationNotFoundError()
      return toNotification(row)
    },

    markAllRead(viewer) {
      return repository.markAllRead(requireUser(viewer))
    },
  }
}
