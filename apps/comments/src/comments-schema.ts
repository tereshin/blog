import { integer, jsonb, pgSchema, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const comments_schema = pgSchema('comments');

export const comments_table = comments_schema.table('comments', {
  id: uuid('id').primaryKey(),
  article_id: uuid('article_id').notNull(),
  author_id: uuid('author_id').notNull(),
  parent_id: uuid('parent_id'),
  root_id: uuid('root_id').notNull(),
  depth: integer('depth').notNull(),
  body: text('body').notNull(),
  status: text('status').notNull(),
  created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
});

export const comment_mentions = comments_schema.table(
  'comment_mentions',
  {
    comment_id: uuid('comment_id').notNull(),
    mentioned_user_id: uuid('mentioned_user_id').notNull(),
  },
  (table) => [primaryKey({ columns: [table.comment_id, table.mentioned_user_id] })],
);

export const outbox_events = comments_schema.table('outbox_events', {
  id: uuid('id').primaryKey(),
  event_type: text('event_type').notNull(),
  aggregate_id: uuid('aggregate_id').notNull(),
  payload: jsonb('payload').notNull(),
  producer: text('producer').notNull(),
  event_version: integer('event_version').notNull(),
  created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  published_at: timestamp('published_at', { withTimezone: true, mode: 'string' }),
});
