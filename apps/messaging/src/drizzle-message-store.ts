import { and, eq, isNull, ne } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type { Conversation, DirectMessage, MessageStore, SentEvent } from './message-store';
import { conversation_members, conversation_pairs, conversations, direct_messages, outbox_events } from './messages-schema';

export class DrizzleMessageStore implements MessageStore {
  private readonly db: NodePgDatabase;

  constructor(database_url: string) {
    const pool = new Pool({ connectionString: database_url });
    this.db = drizzle(pool);
  }

  async findPair(user_id_low: string, user_id_high: string): Promise<Conversation | null> {
    const rows = await this.db
      .select()
      .from(conversation_pairs)
      .where(and(eq(conversation_pairs.user_id_low, user_id_low), eq(conversation_pairs.user_id_high, user_id_high)))
      .limit(1);
    const row = rows[0];
    return row ? { id: row.conversation_id, user_id_low, user_id_high } : null;
  }

  async insertConversation(conversation: Conversation): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.insert(conversations).values({ id: conversation.id });
      await tx.insert(conversation_pairs).values({
        user_id_low: conversation.user_id_low,
        user_id_high: conversation.user_id_high,
        conversation_id: conversation.id,
      });
      await tx.insert(conversation_members).values([
        { conversation_id: conversation.id, user_id: conversation.user_id_low },
        { conversation_id: conversation.id, user_id: conversation.user_id_high },
      ]);
    });
  }

  async insertMessage(message: DirectMessage, event: SentEvent): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.insert(direct_messages).values(message);
      await tx.insert(outbox_events).values({
        id: event.id,
        event_type: event.event_type,
        aggregate_id: event.aggregate_id,
        payload: event.payload,
        producer: event.producer,
        event_version: event.event_version,
      });
    });
  }

  async listFor(user_id: string): Promise<Conversation[]> {
    const rows = await this.db
      .select()
      .from(conversation_pairs)
      .innerJoin(conversation_members, eq(conversation_members.conversation_id, conversation_pairs.conversation_id))
      .where(eq(conversation_members.user_id, user_id));
    return rows.map((row) => ({
      id: row.conversation_pairs.conversation_id,
      user_id_low: row.conversation_pairs.user_id_low,
      user_id_high: row.conversation_pairs.user_id_high,
    }));
  }

  async listMessages(conversation_id: string): Promise<DirectMessage[]> {
    const rows = await this.db.select().from(direct_messages).where(eq(direct_messages.conversation_id, conversation_id));
    return rows.map((row) => ({
      id: row.id,
      conversation_id: row.conversation_id,
      sender_id: row.sender_id,
      body: row.body,
      created_at: row.created_at,
      read_at: row.read_at,
    }));
  }

  async markRead(conversation_id: string, reader_id: string, read_at: string): Promise<void> {
    await this.db
      .update(direct_messages)
      .set({ read_at })
      .where(
        and(
          eq(direct_messages.conversation_id, conversation_id),
          ne(direct_messages.sender_id, reader_id),
          isNull(direct_messages.read_at),
        ),
      );
  }

  async isMember(conversation_id: string, user_id: string): Promise<boolean> {
    const rows = await this.db
      .select()
      .from(conversation_members)
      .where(and(eq(conversation_members.conversation_id, conversation_id), eq(conversation_members.user_id, user_id)))
      .limit(1);
    return rows.length > 0;
  }
}
