import { pgSchema, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

export const notifications_schema = pgSchema('notifications');

export const notifications = notifications_schema.table(
  'notifications',
  {
    id: uuid('id').primaryKey(),
    user_id: uuid('user_id').notNull(),
    type: text('type').notNull(),
    actor_id: uuid('actor_id').notNull(),
    entity_type: text('entity_type').notNull(),
    entity_id: uuid('entity_id').notNull(),
    source_event_id: uuid('source_event_id').notNull(),
    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => [unique('notifications_notifications_user_event_key').on(table.user_id, table.source_event_id)],
);
