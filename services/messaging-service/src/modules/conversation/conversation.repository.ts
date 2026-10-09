import { and, desc, eq, or, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { conversations, messages, users_copy } from '../../infra/db/schema.ts'
import type { ConversationCursor } from './conversation.schema.ts'

export type UserCopy = {
  user_id: string
  display_name?: string | null
  avatar_url?: string | null
  slug?: string | null
  is_restricted?: boolean
}

export type ConversationRow = {
  id: string
  peer_user_id: string
  peer_display_name: string | null
  peer_avatar_url: string | null
  peer_slug: string | null
  last_message_at: Date | null
  last_message_body: string | null
  unread_count: number
}

export type ConversationRepository = {
  upsertUser: (tx: NodePgDatabase, patch: UserCopy) => Promise<void>
  list: (user_id: string, cursor: ConversationCursor | null, limit: number) => Promise<ConversationRow[]>
  unreadCount: (user_id: string) => Promise<number>
  isParticipant: (user_id: string, conversation_id: string) => Promise<boolean>
  markRead: (user_id: string, conversation_id: string) => Promise<boolean>
}

export function createConversationRepository(db: NodePgDatabase): ConversationRepository {
  return {
    async upsertUser(tx, patch) {
      const { user_id, ...fields } = patch
      const defined = Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined))
      await tx
        .insert(users_copy)
        .values({
          user_id,
          display_name: patch.display_name ?? null,
          avatar_url: patch.avatar_url ?? null,
          slug: patch.slug ?? null,
          is_restricted: patch.is_restricted ?? false,
        })
        .onConflictDoUpdate({ target: users_copy.user_id, set: defined })
    },

    async list(user_id, cursor, limit) {
      const mine = or(eq(conversations.user_low_id, user_id), eq(conversations.user_high_id, user_id))
      const after = cursor
        ? sql`(${conversations.last_message_at}, ${conversations.id}) < (${new Date(cursor.t)}, ${cursor.id}::uuid)`
        : undefined
      const peer_user_id = sql<string>`case when ${conversations.user_low_id} = ${user_id}::uuid then ${conversations.user_high_id} else ${conversations.user_low_id} end`
      const rows = await db
        .select({
          id: conversations.id,
          peer_user_id,
          peer_display_name: users_copy.display_name,
          peer_avatar_url: users_copy.avatar_url,
          peer_slug: users_copy.slug,
          last_message_at: conversations.last_message_at,
          last_message_body: sql<string | null>`(
            select m.body from messages m
            where m.conversation_id = ${conversations.id}
            order by m.created_at desc, m.id desc
            limit 1
          )`,
          unread_count: sql<number>`(
            select count(*)::int from messages m
            where m.conversation_id = ${conversations.id}
              and m.sender_id <> ${user_id}::uuid
              and m.read_at is null
          )`,
        })
        .from(conversations)
        .leftJoin(users_copy, sql`${users_copy.user_id} = ${peer_user_id}`)
        .where(and(mine, after))
        .orderBy(sql`${conversations.last_message_at} desc nulls last`, desc(conversations.id))
        .limit(limit)
      return rows.map((row) => ({ ...row, unread_count: Number(row.unread_count) }))
    },

    async unreadCount(user_id) {
      const [row] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(messages)
        .innerJoin(conversations, eq(conversations.id, messages.conversation_id))
        .where(
          and(
            or(eq(conversations.user_low_id, user_id), eq(conversations.user_high_id, user_id)),
            sql`${messages.sender_id} <> ${user_id}::uuid`,
            sql`${messages.read_at} is null`,
          ),
        )
      return Number(row?.count ?? 0)
    },

    async isParticipant(user_id, conversation_id) {
      const [row] = await db
        .select({ id: conversations.id })
        .from(conversations)
        .where(
          and(
            eq(conversations.id, conversation_id),
            or(eq(conversations.user_low_id, user_id), eq(conversations.user_high_id, user_id)),
          ),
        )
        .limit(1)
      return Boolean(row)
    },

    async markRead(user_id, conversation_id) {
      const allowed = await db
        .select({ id: conversations.id })
        .from(conversations)
        .where(
          and(
            eq(conversations.id, conversation_id),
            or(eq(conversations.user_low_id, user_id), eq(conversations.user_high_id, user_id)),
          ),
        )
        .limit(1)
      if (!allowed[0]) return false
      await db
        .update(messages)
        .set({ read_at: new Date() })
        .where(and(eq(messages.conversation_id, conversation_id), sql`${messages.sender_id} <> ${user_id}::uuid`, sql`${messages.read_at} is null`))
      return true
    },
  }
}
