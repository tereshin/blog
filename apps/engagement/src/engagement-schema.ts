import { bigint, integer, jsonb, pgSchema, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const engagement_schema = pgSchema('engagement');

export const article_likes = engagement_schema.table(
  'article_likes',
  {
    article_id: uuid('article_id').notNull(),
    user_id: uuid('user_id').notNull(),
    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.article_id, table.user_id] })],
);

export const bookmarks = engagement_schema.table(
  'bookmarks',
  {
    user_id: uuid('user_id').notNull(),
    article_id: uuid('article_id').notNull(),
    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.user_id, table.article_id] })],
);

export const comment_likes = engagement_schema.table(
  'comment_likes',
  {
    comment_id: uuid('comment_id').notNull(),
    user_id: uuid('user_id').notNull(),
    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.comment_id, table.user_id] })],
);

export const article_stats = engagement_schema.table('article_stats', {
  article_id: uuid('article_id').primaryKey(),
  like_count: bigint('like_count', { mode: 'number' }).notNull(),
  view_count: bigint('view_count', { mode: 'number' }).notNull(),
  bookmark_count: bigint('bookmark_count', { mode: 'number' }).notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
});

export const comment_like_counts = engagement_schema.table('comment_like_counts', {
  comment_id: uuid('comment_id').primaryKey(),
  like_count: bigint('like_count', { mode: 'number' }).notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
});

export const outbox_events = engagement_schema.table('outbox_events', {
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
