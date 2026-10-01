import { integer, jsonb, pgSchema, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const messages_schema = pgSchema('messages');

export const conversations = messages_schema.table('conversations', {
  id: uuid('id').primaryKey(),
  created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
});

export const conversation_members = messages_schema.table(
  'conversation_members',
  {
    conversation_id: uuid('conversation_id').notNull(),
    user_id: uuid('user_id').notNull(),
  },
  (table) => [primaryKey({ columns: [table.conversation_id, table.user_id] })],
);

export const conversation_pairs = messages_schema.table(
  'conversation_pairs',
  {
    user_id_low: uuid('user_id_low').notNull(),
    user_id_high: uuid('user_id_high').notNull(),
    conversation_id: uuid('conversation_id').notNull(),
  },
  (table) => [primaryKey({ columns: [table.user_id_low, table.user_id_high] })],
);

export const direct_messages = messages_schema.table('direct_messages', {
  id: uuid('id').primaryKey(),
  conversation_id: uuid('conversation_id').notNull(),
  sender_id: uuid('sender_id').notNull(),
  body: text('body').notNull(),
  created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  read_at: timestamp('read_at', { withTimezone: true, mode: 'string' }),
});

export const outbox_events = messages_schema.table('outbox_events', {
  id: uuid('id').primaryKey(),
  event_type: text('event_type').notNull(),
  aggregate_id: uuid('aggregate_id').notNull(),
  payload: jsonb('payload').notNull(),
  correlation_id: uuid('correlation_id'),
  causation_id: uuid('causation_id'),
  producer: text('producer').notNull(),
  event_version: integer('event_version').notNull(),
  created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  published_at: timestamp('published_at', { withTimezone: true, mode: 'string' }),
});
