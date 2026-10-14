import { and, desc, eq, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { messageSchema } from '@blog/contracts'
import type { Message } from '@blog/contracts'
import { newEventId } from '@blog/broker'
import type { Database } from '@blog/broker'
import { conversations, idempotency_keys, messages, users_copy } from '../../infra/db/schema.ts'
import type { ConversationPair } from '../../shared/pair.ts'
import { appendMessageSent } from './message.events.ts'
import type { MessageCursor } from './message.schema.ts'
import type { AppendMessageInput, MessageRepositoryPort, MessageRow } from './message.types.ts'

async function lock(tx: Database, key: string): Promise<void> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${key}))`)
}

export class MessageRepository implements MessageRepositoryPort<Database> {
  constructor(private readonly db: NodePgDatabase) {}

  async list(conversation_id: string, cursor: MessageCursor | null, limit: number): Promise<MessageRow[]> {
    const after = cursor ? sql`(${messages.created_at}, ${messages.id}) < (${new Date(cursor.t)}, ${cursor.id}::uuid)` : undefined
    return this.db
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
  }

  async isParticipant(user_id: string, conversation_id: string): Promise<boolean> {
    const [row] = await this.db
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
  }

  transaction<TResult>(work: (tx: Database) => Promise<TResult>): Promise<TResult> {
    return this.db.transaction((tx) => work(tx))
  }

  async lockIdempotencyKey(tx: Database, sender_id: string, idempotency_key: string): Promise<void> {
    await lock(tx, `idem:${sender_id}:${idempotency_key}`)
  }

  async findStoredResponse(tx: Database, sender_id: string, idempotency_key: string): Promise<Message | null> {
    const [stored] = await tx
      .select({ response: idempotency_keys.response })
      .from(idempotency_keys)
      .where(and(eq(idempotency_keys.user_id, sender_id), eq(idempotency_keys.key, idempotency_key)))
      .limit(1)
    return stored ? messageSchema.parse(stored.response) : null
  }

  async storeResponse(tx: Database, sender_id: string, idempotency_key: string, message: Message): Promise<void> {
    await tx.insert(idempotency_keys).values({ user_id: sender_id, key: idempotency_key, response: message })
  }

  async findRestriction(tx: Database, user_id: string): Promise<{ is_restricted: boolean } | null> {
    const [row] = await tx
      .select({ is_restricted: users_copy.is_restricted })
      .from(users_copy)
      .where(eq(users_copy.user_id, user_id))
      .limit(1)
    return row ?? null
  }

  /** Диалог пары создаётся или сдвигается под advisory-блокировкой пары; событие пишется в outbox той же транзакции. */
  async appendMessage(tx: Database, input: AppendMessageInput): Promise<MessageRow> {
    const now = new Date()
    const conversation_id = await this.touchConversation(tx, input.pair, now)
    const [row] = await tx
      .insert(messages)
      .values({
        id: newEventId(),
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
    await appendMessageSent(tx, {
      correlation_id: input.correlation_id,
      occurred_at: now.toISOString(),
      message_id: row.id,
      conversation_id,
      sender_id: input.sender_id,
      recipient_id: input.recipient_id,
      excerpt: input.excerpt,
    })
    return row
  }

  private async touchConversation(tx: Database, pair: ConversationPair, now: Date): Promise<string> {
    await lock(tx, `pair:${pair.user_low_id}:${pair.user_high_id}`)
    const [existing] = await tx
      .select({ id: conversations.id })
      .from(conversations)
      .where(and(eq(conversations.user_low_id, pair.user_low_id), eq(conversations.user_high_id, pair.user_high_id)))
      .limit(1)
    if (existing) {
      await tx.update(conversations).set({ last_message_at: now }).where(eq(conversations.id, existing.id))
      return existing.id
    }
    const conversation_id = newEventId()
    await tx.insert(conversations).values({
      id: conversation_id,
      user_low_id: pair.user_low_id,
      user_high_id: pair.user_high_id,
      last_message_at: now,
    })
    return conversation_id
  }
}
