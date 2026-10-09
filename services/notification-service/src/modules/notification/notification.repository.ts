import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { notificationCreatedEvent } from './notification.events.ts'
import type { NotificationKind } from '@blog/contracts'
import { appendToOutbox, newEventId } from '@blog/broker'
import type { Database, OutboxEvent } from '@blog/broker'
import { articles_copy, notifications, users_copy } from '../../infra/db/schema.ts'

export type ArticleCopy = { article_id: string; author_id: string; title: string; slug: string }

export type UserCopy = { user_id: string; display_name?: string | null; avatar_url?: string | null }

export type NotifyInput = {
  source: OutboxEvent
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

export type NotificationRepository = {
  upsertArticle: (tx: Database, copy: ArticleCopy) => Promise<void>
  upsertUser: (tx: Database, patch: UserCopy) => Promise<void>
  notify: (tx: Database, input: NotifyInput) => Promise<void>
  list: (user_id: string, cursor: { t: string; id: string } | null, limit: number) => Promise<NotificationRow[]>
  unreadCount: (user_id: string) => Promise<number>
  markRead: (user_id: string, id: string) => Promise<NotificationRow | null>
  markAllRead: (user_id: string) => Promise<void>
}

function present(row: {
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
}): NotificationRow {
  return row
}

const listed = {
  id: notifications.id,
  kind: notifications.kind,
  article_id: notifications.article_id,
  article_slug: articles_copy.slug,
  article_title: articles_copy.title,
  comment_id: notifications.comment_id,
  conversation_id: notifications.conversation_id,
  actor_display_name: users_copy.display_name,
  actor_avatar_url: users_copy.avatar_url,
  read_at: notifications.read_at,
  created_at: notifications.created_at,
}

export function createNotificationRepository(db: NodePgDatabase): NotificationRepository {
  return {
    async upsertArticle(tx, copy) {
      await tx
        .insert(articles_copy)
        .values(copy)
        .onConflictDoUpdate({
          target: articles_copy.article_id,
          set: { author_id: copy.author_id, title: copy.title, slug: copy.slug },
        })
    },

    async upsertUser(tx, patch) {
      const { user_id, ...fields } = patch
      const defined = Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined))
      await tx
        .insert(users_copy)
        .values({ user_id, display_name: patch.display_name ?? null, avatar_url: patch.avatar_url ?? null })
        .onConflictDoUpdate({ target: users_copy.user_id, set: defined })
    },

    async notify(tx, input) {
      const id = newEventId()
      await tx.insert(notifications).values({
        id,
        user_id: input.user_id,
        kind: input.kind,
        article_id: input.article_id ?? null,
        comment_id: input.comment_id ?? null,
        conversation_id: input.conversation_id ?? null,
        actor_id: input.actor_id ?? null,
      })
      await appendToOutbox(
        tx,
        notificationCreatedEvent({
          occurred_at: input.source.occurred_at,
          correlation_id: input.source.correlation_id,
          causation_id: input.source.event_id,
          notification_id: id,
          user_id: input.user_id,
          kind: input.kind,
        }),
      )
    },

    async list(user_id, cursor, limit) {
      const after = cursor ? sql`(${notifications.created_at}, ${notifications.id}) < (${new Date(cursor.t)}, ${cursor.id})` : undefined
      const rows = await db
        .select(listed)
        .from(notifications)
        .leftJoin(articles_copy, eq(articles_copy.article_id, notifications.article_id))
        .leftJoin(users_copy, eq(users_copy.user_id, notifications.actor_id))
        .where(and(eq(notifications.user_id, user_id), after))
        .orderBy(desc(notifications.created_at), desc(notifications.id))
        .limit(limit)
      return rows.map(present)
    },

    async unreadCount(user_id) {
      const [row] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(notifications)
        .where(and(eq(notifications.user_id, user_id), isNull(notifications.read_at)))
      return Number(row?.count ?? 0)
    },

    async markRead(user_id, id) {
      const now = new Date()
      const [updated] = await db
        .update(notifications)
        .set({ read_at: now })
        .where(and(eq(notifications.id, id), eq(notifications.user_id, user_id), isNull(notifications.read_at)))
        .returning({ id: notifications.id })
      if (!updated) {
        const [existing] = await db
          .select({ id: notifications.id })
          .from(notifications)
          .where(and(eq(notifications.id, id), eq(notifications.user_id, user_id)))
        if (!existing) return null
      }
      const [row] = await db
        .select(listed)
        .from(notifications)
        .leftJoin(articles_copy, eq(articles_copy.article_id, notifications.article_id))
        .leftJoin(users_copy, eq(users_copy.user_id, notifications.actor_id))
        .where(eq(notifications.id, id))
      return row ? present(row) : null
    },

    async markAllRead(user_id) {
      await db.update(notifications).set({ read_at: new Date() }).where(and(eq(notifications.user_id, user_id), isNull(notifications.read_at)))
    },
  }
}
