import { integer, jsonb, pgSchema, text, timestamp, uuid } from 'drizzle-orm/pg-core';

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
