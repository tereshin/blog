import { bigint, pgSchema, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const media_schema = pgSchema('media');

export const media_objects = media_schema.table('media_objects', {
  id: uuid('id').primaryKey(),
  owner_user_id: uuid('owner_user_id').notNull(),
  object_key: text('object_key').notNull(),
  content_type: text('content_type'),
  byte_size: bigint('byte_size', { mode: 'number' }),
  status: text('status').notNull(),
  created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  completed_at: timestamp('completed_at', { withTimezone: true, mode: 'string' }),
});
