import { and, desc, eq, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { messageSchema } from '@blog/contracts'
import type { Message } from '@blog/contracts'
import { newEventId } from '@blog/broker'
import type { Database } from '@blog/broker'
import { RestrictedError } from '@blog/errors'
import { conversations, idempotency_keys, messages, users_copy } from '../../infra/db/schema.ts'
import { pairOf } from '../conversation/index.ts'
import { toExcerpt } from '../../shared/excerpt.ts'
import { appendMessageSent } from './message.events.ts'
import { PeerNotFoundError } from './message.errors.ts'
import type { MessageCursor } from './message.schema.ts'

export type MessageRow = {
  id: string
  conversation_id: string
  sender_id: string
  body: string
  created_at: Date
  read_at: Date | null
}

export type SendMessageInput = {
  sender_id: string
  peer_user_id: string
  body: string
  idempotency_key: string | null
  correlation_id: string
}

export type MessageRepository = {
  list: (conversation_id: string, cursor: MessageCursor | null, limit: number) => Promise<MessageRow[]>
  isParticipant: (user_id: string, conversation_id: string) => Promise<boolean>
  send: (input: SendMessageInput) => Promise<Message>
}

function toMessage(row: MessageRow): Message {
  return {
    id: row.id,
    conversation_id: row.conversation_id,
    sender_id: row.sender_id,
    body: row.body,
    created_at: row.created_at.toISOString(),
    read_at: row.read_at ? row.read_at.toISOString() : null,
  }
}

async function lock(tx: Database, key: string): Promise<void> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${key}))`)
}

export function createMessageRepository(db: NodePgDatabase): MessageRepository {
  return {
    async list(conversation_id, cursor, limit) {
      const after = cursor ? sql`(${messages.created_at}, ${messages.id}) < (${new Date(cursor.t)}, ${cursor.id}::uuid)` : undefined
      return db
        .select({
          id: messages.id,
          conversation_id: messages.conversation_id,
          sender_id: messages.sender_id,
          body: messages.body,
          created_at: messages.created_at,
          read_at: messages.read_at,
        })
        .from(messages)
        .where(and(eq(messages.conversation_id, conversation_id), after))
        .orderBy(desc(messages.created_at), desc(messages.id))
        .limit(limit)
    },

    async isParticipant(user_id, conversation_id) {
      const [row] = await db
        .select({ id: conversations.id })
        .from(conversations)
        .where(
          and(
            eq(conversations.id, conversation_id),
            sql`(${conversations.user_low_id} = ${user_id}::uuid or ${conversations.user_high_id} = ${user_id}::uuid)`,
          ),
        )
        .limit(1)
      return Boolean(row)
    },

    async send(input) {
      return db.transaction(async (tx) => {
        if (input.idempotency_key) {
          await lock(tx, `idem:${input.sender_id}:${input.idempotency_key}`)
          const [stored] = await tx
            .select({ response: idempotency_keys.response })
            .from(idempotency_keys)
            .where(and(eq(idempotency_keys.user_id, input.sender_id), eq(idempotency_keys.key, input.idempotency_key)))
            .limit(1)
          if (stored) return messageSchema.parse(stored.response)
        }

        const [sender] = await tx
          .select({ is_restricted: users_copy.is_restricted })
          .from(users_copy)
          .where(eq(users_copy.user_id, input.sender_id))
          .limit(1)
        if (sender?.is_restricted) throw new RestrictedError()

        const [peer] = await tx
          .select({ is_restricted: users_copy.is_restricted })
          .from(users_copy)
          .where(eq(users_copy.user_id, input.peer_user_id))
          .limit(1)
        if (!peer) throw new PeerNotFoundError()
        if (peer.is_restricted) throw new RestrictedError()

        const pair = pairOf(input.sender_id, input.peer_user_id)
        await lock(tx, `pair:${pair.user_low_id}:${pair.user_high_id}`)
        const [existing] = await tx
          .select({ id: conversations.id })
          .from(conversations)
          .where(and(eq(conversations.user_low_id, pair.user_low_id), eq(conversations.user_high_id, pair.user_high_id)))
          .limit(1)

        const now = new Date()
        const conversation_id = existing?.id ?? newEventId()
        if (existing) {
          await tx.update(conversations).set({ last_message_at: now }).where(eq(conversations.id, conversation_id))
        } else {
          await tx.insert(conversations).values({
            id: conversation_id,
            user_low_id: pair.user_low_id,
            user_high_id: pair.user_high_id,
            last_message_at: now,
          })
        }

        const message_id = newEventId()
        const [row] = await tx
          .insert(messages)
          .values({
            id: message_id,
            conversation_id,
            sender_id: input.sender_id,
            body: input.body,
            created_at: now,
          })
          .returning({
            id: messages.id,
            conversation_id: messages.conversation_id,
            sender_id: messages.sender_id,
            body: messages.body,
            created_at: messages.created_at,
            read_at: messages.read_at,
          })
        if (!row) throw new Error('сообщение не записано')
        const message = toMessage(row)
        await appendMessageSent(tx, {
          correlation_id: input.correlation_id,
          occurred_at: now.toISOString(),
          message_id: message.id,
          conversation_id,
          sender_id: input.sender_id,
          recipient_id: input.peer_user_id,
          excerpt: toExcerpt(input.body),
        })
        if (input.idempotency_key) {
          await tx.insert(idempotency_keys).values({ user_id: input.sender_id, key: input.idempotency_key, response: message })
        }
        return message
      })
    },
  }
}
