import { index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export { outbox, processed_events } from '@blog/broker'

export const notification_kind = pgEnum('notification_kind', [
  'comment',
  'reply',
  'reaction',
  'message',
  'moderation',
  'mention',
])

export const articles_copy = pgTable('articles_copy', {
  article_id: uuid('article_id').primaryKey(),
  author_id: uuid('author_id').notNull(),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
})

export const users_copy = pgTable('users_copy', {
  user_id: uuid('user_id').primaryKey(),
  display_name: text('display_name'),
  avatar_url: text('avatar_url'),
})

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey(),
    user_id: uuid('user_id').notNull(),
    kind: notification_kind('kind').notNull(),
    article_id: uuid('article_id'),
    comment_id: uuid('comment_id'),
    conversation_id: uuid('conversation_id'),
    actor_id: uuid('actor_id'),
    read_at: timestamp('read_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('notifications_user_idx').on(table.user_id, table.created_at.desc(), table.id.desc()),
    index('notifications_unread_idx').on(table.user_id),
  ],
)
