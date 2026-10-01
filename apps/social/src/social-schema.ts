import { integer, jsonb, pgSchema, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const social_schema = pgSchema('social');

export const user_follows = social_schema.table(
  'user_follows',
  {
    follower_id: uuid('follower_id').notNull(),
    following_id: uuid('following_id').notNull(),
    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.follower_id, table.following_id] })],
);

export const category_follows = social_schema.table(
  'category_follows',
  {
    user_id: uuid('user_id').notNull(),
    category_id: uuid('category_id').notNull(),
    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.user_id, table.category_id] })],
);

export const outbox_events = social_schema.table('outbox_events', {
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
