import { boolean, index, jsonb, pgTable, primaryKey, text, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core'

export { outbox, processed_events } from '@blog/broker'

export const users_copy = pgTable('users_copy', {
  user_id: uuid('user_id').primaryKey(),
  display_name: text('display_name'),
  avatar_url: text('avatar_url'),
  slug: text('slug'),
  is_restricted: boolean('is_restricted').notNull().default(false),
})

export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').primaryKey(),
    user_low_id: uuid('user_low_id').notNull(),
    user_high_id: uuid('user_high_id').notNull(),
    last_message_at: timestamp('last_message_at', { withTimezone: true }),
  },
  (table) => [
    unique('conversations_pair_unique').on(table.user_low_id, table.user_high_id),
    index('conversations_low_idx').on(table.user_low_id, table.last_message_at, table.id),
    index('conversations_high_idx').on(table.user_high_id, table.last_message_at, table.id),
  ],
)

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey(),
    conversation_id: uuid('conversation_id').notNull(),
    sender_id: uuid('sender_id').notNull(),
    body: varchar('body', { length: 4000 }).notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    read_at: timestamp('read_at', { withTimezone: true }),
  },
  (table) => [index('messages_conversation_idx').on(table.conversation_id, table.created_at, table.id)],
)

export const idempotency_keys = pgTable(
  'idempotency_keys',
  {
    user_id: uuid('user_id').notNull(),
    key: text('key').notNull(),
    response: jsonb('response').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.user_id, table.key] })],
)

export const seed_runs = pgTable('seed_runs', {
  profile: text('profile').primaryKey(),
  anchor_at: timestamp('anchor_at', { withTimezone: true }).notNull(),
  started_at: timestamp('started_at', { withTimezone: true }).notNull(),
  finished_at: timestamp('finished_at', { withTimezone: true }),
})
