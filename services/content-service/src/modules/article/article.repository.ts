import { randomUUID } from 'node:crypto'
import { and, desc, eq, inArray, ne, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { Database } from '@blog/broker'
import { ValidationError } from '@blog/errors'
import { articles, profiles, slugs, topics, users_copy } from '../../infra/db/schema.ts'
import { visibleArticlesWhere } from '../access/index.ts'
import { RESERVED_SLUGS, SLUG_PATTERN, releaseSlug, replaceSlug, reserveSlug } from '../slug/index.ts'
import { appendArticleEvent } from './article.events.ts'
import { NotPublishableError, TopicArchivedError } from './article.errors.ts'
import { uniqueSlug } from './lib/slugify.ts'
import type { ArticleRepository, ArticleRow, ArticleSave, NewArticle, StoredArticle } from './article.types.ts'

const columns = {
  id: articles.id,
  slug: articles.slug,
  title: articles.title,
  excerpt: articles.excerpt,
  first_image_url: articles.first_image_url,
  blocks: articles.blocks,
  published_at: articles.published_at,
  visibility: articles.visibility,
  comments_enabled: articles.comments_enabled,
  status: articles.status,
  author_id: articles.author_id,
  author_display_name: profiles.display_name,
  author_avatar_url: profiles.avatar_url,
  author_slug: profiles.slug,
  author_public_number: users_copy.public_number,
  topic_id: topics.id,
  topic_title: topics.title,
  topic_slug: topics.slug,
  topic_status: topics.status,
  reaction_counts: articles.reaction_counts,
  reaction_count: articles.reaction_count,
  comment_count: articles.comment_count,
  bookmark_count: articles.bookmark_count,
  view_count: articles.view_count,
  top_comment: articles.top_comment,
}

const stored_columns = {
  id: articles.id,
  author_id: articles.author_id,
  topic_id: articles.topic_id,
  title: articles.title,
  slug: articles.slug,
  blocks: articles.blocks,
  visibility: articles.visibility,
  comments_enabled: articles.comments_enabled,
  status: articles.status,
  published_at: articles.published_at,
  excerpt: articles.excerpt,
  first_image_url: articles.first_image_url,
}

function from(db: NodePgDatabase) {
  return db
    .select(columns)
    .from(articles)
    .innerJoin(topics, eq(topics.id, articles.topic_id))
    .leftJoin(profiles, eq(profiles.user_id, articles.author_id))
    .leftJoin(users_copy, eq(users_copy.user_id, articles.author_id))
}

async function loadOwned(database: Database, id: string, author_id: string): Promise<StoredArticle | null> {
  const [row] = await database
    .select(stored_columns)
    .from(articles)
    .where(and(eq(articles.id, id), eq(articles.author_id, author_id)))
    .limit(1)
  return (row as StoredArticle | undefined) ?? null
}

async function assertActiveTopic(database: Database, topic_id: string): Promise<void> {
  const [topic] = await database.select({ status: topics.status }).from(topics).where(eq(topics.id, topic_id)).limit(1)
  if (!topic) throw new ValidationError({ message: 'Тема не найдена', details: { field: 'topic_id' } })
  if (topic.status !== 'active') throw new TopicArchivedError()
}

async function allocateSlug(database: Database, title: string, public_number: number): Promise<string> {
  const existing = await database.select({ slug: slugs.slug }).from(slugs)
  const taken = new Set(existing.map((row) => row.slug))
  return uniqueSlug(title, public_number, (candidate) => taken.has(candidate) || RESERVED_SLUGS.includes(candidate) || !SLUG_PATTERN.test(candidate))
}

export function createArticleRepository(db: NodePgDatabase): ArticleRepository {
  const database_of = () => db as Database

  return {
    async findBySlug(slug) {
      const [row] = await from(db).where(eq(articles.slug, slug)).limit(1)
      return (row as ArticleRow | undefined) ?? null
    },

    async findVisibleByIds(viewer, ids) {
      if (ids.length === 0) return []
      const rows = await from(db).where(and(visibleArticlesWhere(viewer), inArray(articles.id, [...ids])))
      const by_id = new Map(rows.map((row) => [row.id, row as ArticleRow]))
      return ids.flatMap((id) => {
        const row = by_id.get(id)
        return row ? [row] : []
      })
    },

    async findProfiles(user_ids) {
      const result = new Map<string, { display_name: string; avatar_url: string | null }>()
      if (user_ids.length === 0) return result
      const rows = await db
        .select({ user_id: profiles.user_id, display_name: profiles.display_name, avatar_url: profiles.avatar_url })
        .from(profiles)
        .where(inArray(profiles.user_id, [...user_ids]))
      for (const row of rows) result.set(row.user_id, { display_name: row.display_name, avatar_url: row.avatar_url })
      return result
    },

    findForAuthor: (id, author_id) => loadOwned(database_of(), id, author_id),

    async listDrafts(author_id) {
      const rows = await db
        .select(stored_columns)
        .from(articles)
        .where(and(eq(articles.author_id, author_id), eq(articles.status, 'draft')))
        .orderBy(desc(articles.updated_at), desc(articles.id))
      return rows as StoredArticle[]
    },

    async insertDraft(input: NewArticle) {
      return database_of().transaction(async (tx) => {
        const database = tx as Database
        await assertActiveTopic(database, input.topic_id)
        const id = randomUUID()
        const [user] = await database.select({ public_number: users_copy.public_number }).from(users_copy).where(eq(users_copy.user_id, input.author_id)).limit(1)
        const slug = input.slug ?? (await allocateSlug(database, input.title, user?.public_number ?? 1))
        await reserveSlug(database, slug, 'article', id)
        const [row] = await database
          .insert(articles)
          .values({
            id,
            author_id: input.author_id,
            topic_id: input.topic_id,
            title: input.title,
            slug,
            blocks: input.blocks,
            visibility: input.visibility,
            comments_enabled: input.comments_enabled,
            status: 'draft',
            excerpt: input.excerpt,
            first_image_url: input.first_image_url,
          })
          .returning(stored_columns)
        if (!row) throw new Error('article row was not written')
        return row as StoredArticle
      })
    },

    async save(id, author_id, input: ArticleSave) {
      return database_of().transaction(async (tx) => {
        const database = tx as Database
        const current = await loadOwned(database, id, author_id)
        if (!current || current.status === 'deleted') return null
        if (input.topic_id !== current.topic_id) await assertActiveTopic(database, input.topic_id)
        if (input.slug !== undefined && input.slug !== current.slug) await replaceSlug(database, input.slug, 'article', id)
        const [saved] = await database
          .update(articles)
          .set({
            title: input.title,
            topic_id: input.topic_id,
            blocks: input.blocks,
            visibility: input.visibility,
            comments_enabled: input.comments_enabled,
            excerpt: input.excerpt,
            first_image_url: input.first_image_url,
            ...(input.slug === undefined ? {} : { slug: input.slug }),
            ...(current.status === 'published'
              ? { search_vector: sql`to_tsvector('simple', ${`${input.title}\n${input.excerpt}`})` }
              : {}),
            updated_at: new Date(),
          })
          .where(and(eq(articles.id, id), eq(articles.author_id, author_id), ne(articles.status, 'deleted')))
          .returning(stored_columns)
        if (!saved) return null
        const stored = saved as StoredArticle
        if (stored.status === 'published') await appendArticleEvent(database, 'content.article.updated', stored, input.correlation_id)
        return stored
      })
    },

    async publish(id, author_id, input) {
      return database_of().transaction(async (tx) => {
        const database = tx as Database
        const current = await loadOwned(database, id, author_id)
        if (!current || current.status === 'deleted') return null
        const [topic] = await database.select({ status: topics.status }).from(topics).where(eq(topics.id, current.topic_id)).limit(1)
        const reasons: string[] = []
        if (current.title.trim().length === 0) reasons.push('title')
        if (!topic || topic.status !== 'active') reasons.push('topic')
        if (!input.has_content) reasons.push('content')
        if (reasons.length > 0) throw new NotPublishableError(reasons)
        const published_at = current.published_at ?? new Date()
        const [saved] = await database
          .update(articles)
          .set({
            status: 'published',
            published_at,
            search_vector: sql`to_tsvector('simple', ${input.search_text})`,
            updated_at: new Date(),
          })
          .where(eq(articles.id, id))
          .returning(stored_columns)
        if (!saved) return null
        const stored = saved as StoredArticle
        if (current.status !== 'published') await appendArticleEvent(database, 'content.article.published', stored, input.correlation_id)
        return stored
      })
    },

    async remove(id, author_id, correlation_id) {
      return database_of().transaction(async (tx) => {
        const database = tx as Database
        const current = await loadOwned(database, id, author_id)
        if (!current || current.status === 'deleted') return null
        const removed: StoredArticle = { ...current, status: 'deleted' }
        await appendArticleEvent(database, 'content.article.deleted', removed, correlation_id)
        await releaseSlug(database, 'article', id)
        // Адрес освобождён для других. В строке остаётся внутренний ключ, чтобы старый slug не нашёл удалённую статью.
        await database
          .update(articles)
          .set({ status: 'deleted', slug: `deleted-${id}`, updated_at: new Date() })
          .where(eq(articles.id, id))
        return removed
      })
    },
  }
}
