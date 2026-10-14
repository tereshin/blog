import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { appendToOutbox, newEventId } from '@blog/broker'
import type { Database } from '@blog/broker'
import { articles_copy, notifications, users_copy } from '../../infra/db/schema.ts'
import { notificationCreatedEvent } from './notification.events.ts'
import type { NotificationCursor } from './notification.schema.ts'
import type { ArticleCopy, NotificationRepositoryPort, NotificationRow, NotifyInput, UserCopy } from './notification.types.ts'

const LISTED_COLUMNS = {
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

export class NotificationRepository implements NotificationRepositoryPort<Database> {
  constructor(private readonly db: NodePgDatabase) {}

  async upsertArticle(tx: Database, copy: ArticleCopy): Promise<void> {
    await tx
      .insert(articles_copy)
      .values(copy)
      .onConflictDoUpdate({
        target: articles_copy.article_id,
        set: { author_id: copy.author_id, title: copy.title, slug: copy.slug },
      })
  }

  async upsertUser(tx: Database, patch: UserCopy): Promise<void> {
    const { user_id, ...fields } = patch
    const defined = Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined))
    await tx
      .insert(users_copy)
      .values({ user_id, display_name: patch.display_name ?? null, avatar_url: patch.avatar_url ?? null })
      .onConflictDoUpdate({ target: users_copy.user_id, set: defined })
  }

  async notify(tx: Database, input: NotifyInput): Promise<void> {
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
  }

  async list(user_id: string, cursor: NotificationCursor | null, limit: number): Promise<NotificationRow[]> {
    const after = cursor ? sql`(${notifications.created_at}, ${notifications.id}) < (${new Date(cursor.t)}, ${cursor.id})` : undefined
    return this.db
      .select(LISTED_COLUMNS)
      .from(notifications)
      .leftJoin(articles_copy, eq(articles_copy.article_id, notifications.article_id))
      .leftJoin(users_copy, eq(users_copy.user_id, notifications.actor_id))
      .where(and(eq(notifications.user_id, user_id), after))
      .orderBy(desc(notifications.created_at), desc(notifications.id))
      .limit(limit)
  }

  async unreadCount(user_id: string): Promise<number> {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.user_id, user_id), isNull(notifications.read_at)))
    return Number(row?.count ?? 0)
  }

  /** Повторное прочтение не сдвигает `read_at`; чужое или отсутствующее уведомление — `null`. */
  async markRead(user_id: string, id: string): Promise<NotificationRow | null> {
    const [updated] = await this.db
      .update(notifications)
      .set({ read_at: new Date() })
      .where(and(eq(notifications.id, id), eq(notifications.user_id, user_id), isNull(notifications.read_at)))
      .returning({ id: notifications.id })
    if (!updated) {
      const [existing] = await this.db
        .select({ id: notifications.id })
        .from(notifications)
        .where(and(eq(notifications.id, id), eq(notifications.user_id, user_id)))
      if (!existing) return null
    }
    const [row] = await this.db
      .select(LISTED_COLUMNS)
      .from(notifications)
      .leftJoin(articles_copy, eq(articles_copy.article_id, notifications.article_id))
      .leftJoin(users_copy, eq(users_copy.user_id, notifications.actor_id))
      .where(eq(notifications.id, id))
    return row ?? null
  }

  async markAllRead(user_id: string): Promise<void> {
    await this.db
      .update(notifications)
      .set({ read_at: new Date() })
      .where(and(eq(notifications.user_id, user_id), isNull(notifications.read_at)))
  }
}
