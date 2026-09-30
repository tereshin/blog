import { numeric, pgSchema, timestamp, uuid } from 'drizzle-orm/pg-core';

export const feed_schema = pgSchema('feed');

export const popular_weights = feed_schema.table('popular_weights', {
  id: uuid('id').primaryKey(),
  views_weight: numeric('views_weight', { mode: 'number' }).notNull(),
  likes_weight: numeric('likes_weight', { mode: 'number' }).notNull(),
  comments_weight: numeric('comments_weight', { mode: 'number' }).notNull(),
  bookmarks_weight: numeric('bookmarks_weight', { mode: 'number' }).notNull(),
  age_decay: numeric('age_decay', { mode: 'number' }).notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
});
