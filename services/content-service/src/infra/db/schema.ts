import type { FaviconSettings } from '@blog/contracts'
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import {
  DEFAULT_REACTION_APPEARANCES,
  DEFAULT_SEO_SETTINGS,
  DEFAULT_SOCIAL_COVER_SETTINGS,
} from '@blog/contracts'
import type {
  ProfileStatusIcon,
  ReactionAppearances,
  SeoSettings,
  SocialCoverSettings,
  SocialImages,
} from '@blog/contracts'

// Таблицы outbox и processed_events описаны в @blog/broker и создаются миграцией этого сервиса.
export { outbox, processed_events } from '@blog/broker'

/** Полнотекстовый вектор: пишет сам сервис (заголовок + текст блоков), читает GIN-индекс поиска. */
const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector'
  },
})

export const user_role = pgEnum('user_role', ['member', 'admin', 'superadmin'])
export const slug_owner_type = pgEnum('slug_owner_type', ['profile', 'topic', 'article'])
export const topic_status = pgEnum('topic_status', ['active', 'archived'])
export const article_visibility = pgEnum('article_visibility', ['public', 'members', 'author'])
export const article_status = pgEnum('article_status', ['draft', 'published', 'hidden', 'deleted'])
export const follow_target_type = pgEnum('follow_target_type', ['user', 'topic'])
export const report_status = pgEnum('report_status', ['open', 'reviewed'])
export const locale = pgEnum('locale', ['ru', 'en', 'sr'])

/** Копия участника из identity: роль, право публикации, ограничение. Пишут только события. */
export const users_copy = pgTable('users_copy', {
  user_id: uuid('user_id').primaryKey(),
  public_number: integer('public_number').notNull().unique(),
  role: user_role('role').notNull().default('member'),
  can_publish: boolean('can_publish').notNull().default(true),
  is_restricted: boolean('is_restricted').notNull().default(false),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
})

export const profiles = pgTable('profiles', {
  user_id: uuid('user_id').primaryKey(),
  display_name: varchar('display_name', { length: 50 }).notNull(),
  bio: varchar('bio', { length: 500 }),
  avatar_url: text('avatar_url'),
  cover_url: text('cover_url'),
  status_icon_id: uuid('status_icon_id'),
  slug: text('slug').unique(),
  reputation: integer('reputation').notNull().default(0),
})

/** Общий реестр коротких адресов профилей, тем и статей. */
export const slugs = pgTable('slugs', {
  slug: text('slug').primaryKey(),
  owner_type: slug_owner_type('owner_type').notNull(),
  owner_id: uuid('owner_id').notNull(),
})

export const topics = pgTable('topics', {
  id: uuid('id').primaryKey(),
  title: text('title').notNull(),
  description: varchar('description', { length: 500 }),
  avatar_url: text('avatar_url'),
  cover_url: text('cover_url'),
  slug: text('slug').notNull(),
  status: topic_status('status').notNull().default('active'),
  position: integer('position').notNull().default(0),
})

export const articles = pgTable(
  'articles',
  {
    id: uuid('id').primaryKey(),
    author_id: uuid('author_id').notNull(),
    topic_id: uuid('topic_id')
      .notNull()
      .references(() => topics.id),
    title: varchar('title', { length: 150 }).notNull(),
    seo_title: varchar('seo_title', { length: 200 }),
    seo_description: varchar('seo_description', { length: 500 }),
    slug: text('slug').notNull(),
    blocks: jsonb('blocks').notNull().default([]),
    visibility: article_visibility('visibility').notNull().default('public'),
    comments_enabled: boolean('comments_enabled').notNull().default(true),
    status: article_status('status').notNull().default('draft'),
    published_at: timestamp('published_at', { withTimezone: true }),
    reaction_count: integer('reaction_count').notNull().default(0),
    reaction_counts: jsonb('reaction_counts').notNull().default({}),
    comment_count: integer('comment_count').notNull().default(0),
    view_count: integer('view_count').notNull().default(0),
    bookmark_count: integer('bookmark_count').notNull().default(0),
    top_comment: jsonb('top_comment'),
    excerpt: text('excerpt').notNull().default(''),
    first_image_url: text('first_image_url'),
    search_vector: tsvector('search_vector'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('articles_feed_idx').on(table.status, table.published_at.desc(), table.id.desc()),
    index('articles_topic_idx').on(table.topic_id, table.published_at.desc()),
    index('articles_author_idx').on(table.author_id),
    index('articles_search_idx').using('gin', table.search_vector),
  ],
)

export const follows = pgTable(
  'follows',
  {
    follower_id: uuid('follower_id').notNull(),
    target_type: follow_target_type('target_type').notNull(),
    target_id: uuid('target_id').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.follower_id, table.target_type, table.target_id] })],
)

export const promotions = pgTable('promotions', {
  article_id: uuid('article_id')
    .primaryKey()
    .references(() => articles.id),
  confirmed_at: timestamp('confirmed_at', { withTimezone: true }).notNull(),
  until: timestamp('until', { withTimezone: true }).notNull(),
})

export const settings = pgTable('settings', {
  id: smallint('id').primaryKey().default(1),
  name: text('name').notNull(),
  logo_url: text('logo_url'),
  logo_dark_url: text('logo_dark_url'),
  favicon: jsonb('favicon')
    .$type<FaviconSettings>()
    .notNull()
    .default({ png: null, svg: null, ico: null, apple: null, manifest: null }),
  locale: locale('locale').notNull().default('ru'),
  about: text('about').notNull().default(''),
  registration_open: boolean('registration_open').notNull().default(true),
  new_members_can_publish: boolean('new_members_can_publish').notNull().default(true),
  reaction_appearances: jsonb('reaction_appearances')
    .$type<ReactionAppearances>()
    .notNull()
    .default(DEFAULT_REACTION_APPEARANCES),
  profile_status_icons: jsonb('profile_status_icons')
    .$type<ProfileStatusIcon[]>()
    .notNull()
    .default([]),
  seo: jsonb('seo').$type<SeoSettings>().notNull().default(DEFAULT_SEO_SETTINGS),
  social_cover: jsonb('social_cover')
    .$type<SocialCoverSettings>()
    .notNull()
    .default(DEFAULT_SOCIAL_COVER_SETTINGS),
})

export const reports = pgTable(
  'reports',
  {
    id: uuid('id').primaryKey(),
    article_id: uuid('article_id')
      .notNull()
      .references(() => articles.id),
    reporter_id: uuid('reporter_id').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    status: report_status('status').notNull().default('open'),
  },
  (table) => [uniqueIndex('reports_article_reporter_idx').on(table.article_id, table.reporter_id)],
)

export const seed_runs = pgTable('seed_runs', {
  profile: text('profile').primaryKey(),
  anchor_at: timestamp('anchor_at', { withTimezone: true }).notNull(),
  started_at: timestamp('started_at', { withTimezone: true }).notNull(),
  finished_at: timestamp('finished_at', { withTimezone: true }),
})

export const social_covers = pgTable('social_covers', {
  target_id: text('target_id').primaryKey(),
  revision: text('revision').notNull(),
  images: jsonb('images').$type<SocialImages>(),
  requested_at: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
})
