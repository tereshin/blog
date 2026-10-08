import { boolean, index, integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

// Таблицы outbox и processed_events описаны в @blog/broker и создаются миграцией этого сервиса.
export { outbox, processed_events } from '@blog/broker'

export const article_visibility = pgEnum('article_visibility', ['public', 'members', 'author'])
export const article_status = pgEnum('article_status', ['draft', 'published', 'hidden', 'deleted'])
export const comment_status = pgEnum('comment_status', ['visible', 'deleted', 'hidden'])
export const reaction_target_type = pgEnum('reaction_target_type', ['article', 'comment'])
export const reaction_kind = pgEnum('reaction_kind', ['laugh', 'heart', 'thumb', 'fire'])

/** Копия статьи из content: только то, что нужно для проверки доступа и заголовков. */
export const articles_copy = pgTable('articles_copy', {
  article_id: uuid('article_id').primaryKey(),
  author_id: uuid('author_id').notNull(),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  visibility: article_visibility('visibility').notNull(),
  status: article_status('status').notNull(),
  comments_enabled: boolean('comments_enabled').notNull(),
  published_at: timestamp('published_at', { withTimezone: true }),
})

/** Копия участника: имя и аватар из content, ограничение из identity. */
export const users_copy = pgTable('users_copy', {
  user_id: uuid('user_id').primaryKey(),
  display_name: text('display_name'),
  avatar_url: text('avatar_url'),
  is_restricted: boolean('is_restricted').notNull().default(false),
})

export const comments = pgTable(
  'comments',
  {
    id: uuid('id').primaryKey(),
    article_id: uuid('article_id').notNull(),
    author_id: uuid('author_id').notNull(),
    parent_id: uuid('parent_id'),
    body: varchar('body', { length: 5000 }).notNull().default(''),
    status: comment_status('status').notNull().default('visible'),
    edited_at: timestamp('edited_at', { withTimezone: true }),
    reaction_count: integer('reaction_count').notNull().default(0),
    reply_count: integer('reply_count').notNull().default(0),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('comments_article_idx').on(table.article_id, table.created_at),
    index('comments_parent_idx').on(table.parent_id),
  ],
)

export const reactions = pgTable(
  'reactions',
  {
    user_id: uuid('user_id').notNull(),
    target_type: reaction_target_type('target_type').notNull(),
    target_id: uuid('target_id').notNull(),
    kind: reaction_kind('kind').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.user_id, table.target_type, table.target_id] })],
)

export const views = pgTable(
  'views',
  {
    article_id: uuid('article_id').notNull(),
    viewer_key: text('viewer_key').notNull(),
    counted_at: timestamp('counted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.article_id, table.viewer_key] })],
)

export const feed_seen = pgTable(
  'feed_seen',
  {
    viewer_key: text('viewer_key').notNull(),
    feed_key: text('feed_key').notNull(),
    article_id: uuid('article_id').notNull(),
    seen_at: timestamp('seen_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.viewer_key, table.feed_key, table.article_id] })],
)

export const bookmarks = pgTable(
  'bookmarks',
  {
    user_id: uuid('user_id').notNull(),
    article_id: uuid('article_id').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.user_id, table.article_id] }), index('bookmarks_user_idx').on(table.user_id, table.created_at)],
)

/** Ответ мутации по `X-Idempotency-Key`: повтор того же ключа не меняет данные ещё раз. */
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
