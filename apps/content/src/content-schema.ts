import { integer, jsonb, pgSchema, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const content_schema = pgSchema('content');

export const articles = content_schema.table('articles', {
  id: uuid('id').primaryKey(),
  author_id: uuid('author_id').notNull(),
  category_id: uuid('category_id'),
  slug: text('slug'),
  language: text('language'),
  title: text('title'),
  editor_json: jsonb('editor_json').notNull(),
  rendered_html: text('rendered_html').notNull(),
  version: integer('version').notNull(),
  status: text('status').notNull(),
  removed_by: text('removed_by'),
  published_at: timestamp('published_at', { withTimezone: true, mode: 'string' }),
  created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
});

export const article_images = content_schema.table(
  'article_images',
  {
    article_id: uuid('article_id').notNull(),
    media_id: uuid('media_id').notNull(),
    position: integer('position').notNull(),
  },
  (table) => [primaryKey({ columns: [table.article_id, table.media_id] })],
);

export const article_revisions = content_schema.table('article_revisions', {
  id: uuid('id').primaryKey(),
  article_id: uuid('article_id').notNull(),
  version: integer('version').notNull(),
  title: text('title'),
  editor_json: jsonb('editor_json').notNull(),
  rendered_html: text('rendered_html').notNull(),
  created_by: uuid('created_by').notNull(),
  created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
});

export const article_complaints = content_schema.table('article_complaints', {
  id: uuid('id').primaryKey(),
  article_id: uuid('article_id').notNull(),
  reporter_id: uuid('reporter_id').notNull(),
  reason: text('reason').notNull(),
  status: text('status').notNull(),
  resolution_reason: text('resolution_reason'),
  resolved_at: timestamp('resolved_at', { withTimezone: true, mode: 'string' }),
  created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
});

export const outbox_events = content_schema.table('outbox_events', {
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
