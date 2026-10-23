import { and, desc, eq, inArray, ne, sql } from 'drizzle-orm'
import type { Database } from '@blog/broker'
import { articles, profiles, topics, users_copy } from '../../infra/db/schema.ts'
import { has_more_content, preview_blocks } from '../../infra/db/article-preview.ts'
import { visibleArticlesWhere } from '../../infra/db/visible-articles.ts'
import { appendArticleEvent } from './article.events.ts'
import type { ServiceContext } from '@blog/contracts'
import type {
  ArticleEventName,
  ArticleRepositoryPort,
  ArticleRow,
  ArticleSave,
  NewArticle,
  ProfileLite,
  StoredArticle,
  TopicStatus,
} from './article.types.ts'

const COLUMNS = {
  id: articles.id,
  slug: articles.slug,
  title: articles.title,
  excerpt: articles.excerpt,
  has_more_content,
  preview_blocks,
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
  author_status_icon_id: profiles.status_icon_id,
  topic_id: topics.id,
  topic_title: topics.title,
  topic_slug: topics.slug,
  topic_status: topics.status,
  topic_avatar_url: topics.avatar_url,
  reaction_counts: articles.reaction_counts,
  reaction_count: articles.reaction_count,
  comment_count: articles.comment_count,
  bookmark_count: articles.bookmark_count,
  view_count: articles.view_count,
  top_comment: articles.top_comment,
}

const STORED_COLUMNS = {
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
  seo_title: articles.seo_title,
  seo_description: articles.seo_description,
}

function from(db: Database) {
  return db
    .select(COLUMNS)
    .from(articles)
    .innerJoin(topics, eq(topics.id, articles.topic_id))
    .leftJoin(profiles, eq(profiles.user_id, articles.author_id))
    .leftJoin(users_copy, eq(users_copy.user_id, articles.author_id))
}

export class ArticleRepository implements ArticleRepositoryPort<Database> {
  constructor(private readonly db: Database) {}

  transaction<T>(work: (tx: Database) => Promise<T>): Promise<T> {
    return this.db.transaction((tx) => work(tx))
  }

  async findBySlug(slug: string): Promise<ArticleRow | null> {
    const [row] = await from(this.db).where(eq(articles.slug, slug)).limit(1)
    return (row as ArticleRow | undefined) ?? null
  }

  async findVisibleByIds(viewer: ServiceContext, ids: readonly string[]): Promise<ArticleRow[]> {
    if (ids.length === 0) return []
    const rows = await from(this.db).where(and(visibleArticlesWhere(viewer), inArray(articles.id, [...ids])))
    const by_id = new Map(rows.map((row) => [row.id, row as ArticleRow]))
    return ids.flatMap((id) => {
      const row = by_id.get(id)
      return row ? [row] : []
    })
  }

  async findProfiles(user_ids: readonly string[]): Promise<Map<string, ProfileLite>> {
    const result = new Map<string, ProfileLite>()
    if (user_ids.length === 0) return result
    const rows = await this.db
      .select({ user_id: profiles.user_id, display_name: profiles.display_name, avatar_url: profiles.avatar_url })
      .from(profiles)
      .where(inArray(profiles.user_id, [...user_ids]))
    for (const row of rows) result.set(row.user_id, { display_name: row.display_name, avatar_url: row.avatar_url })
    return result
  }

  async findForAuthor(id: string, author_id: string, tx: Database = this.db): Promise<StoredArticle | null> {
    const [row] = await tx
      .select(STORED_COLUMNS)
      .from(articles)
      .where(and(eq(articles.id, id), eq(articles.author_id, author_id)))
      .limit(1)
    return (row as StoredArticle | undefined) ?? null
  }

  async listDrafts(author_id: string): Promise<StoredArticle[]> {
    const rows = await this.db
      .select(STORED_COLUMNS)
      .from(articles)
      .where(and(eq(articles.author_id, author_id), eq(articles.status, 'draft')))
      .orderBy(desc(articles.updated_at), desc(articles.id))
    return rows as StoredArticle[]
  }

  async findTopicStatus(tx: Database, topic_id: string): Promise<TopicStatus | null> {
    const [topic] = await tx.select({ status: topics.status }).from(topics).where(eq(topics.id, topic_id)).limit(1)
    return topic?.status ?? null
  }

  async findPublicNumber(tx: Database, user_id: string): Promise<number | null> {
    const [user] = await tx.select({ public_number: users_copy.public_number }).from(users_copy).where(eq(users_copy.user_id, user_id)).limit(1)
    return user?.public_number ?? null
  }

  async insertDraft(tx: Database, input: NewArticle & { id: string; slug: string }): Promise<StoredArticle> {
    const [row] = await tx
      .insert(articles)
      .values({
        id: input.id,
        author_id: input.author_id,
        topic_id: input.topic_id,
        title: input.title,
        seo_title: input.seo_title,
        seo_description: input.seo_description,
        slug: input.slug,
        blocks: input.blocks,
        visibility: input.visibility,
        comments_enabled: input.comments_enabled,
        status: 'draft',
        excerpt: input.excerpt,
        first_image_url: input.first_image_url,
      })
      .returning(STORED_COLUMNS)
    if (!row) throw new Error('article row was not written')
    return row as StoredArticle
  }

  async save(tx: Database, id: string, author_id: string, input: ArticleSave & { should_index: boolean }): Promise<StoredArticle | null> {
    const [saved] = await tx
      .update(articles)
      .set({
        title: input.title,
        seo_title: input.seo_title,
        seo_description: input.seo_description,
        topic_id: input.topic_id,
        blocks: input.blocks,
        visibility: input.visibility,
        comments_enabled: input.comments_enabled,
        excerpt: input.excerpt,
        first_image_url: input.first_image_url,
        ...(input.slug === undefined ? {} : { slug: input.slug }),
        ...(input.should_index ? { search_vector: sql`to_tsvector('simple', ${input.search_text})` } : {}),
        updated_at: new Date(),
      })
      .where(and(eq(articles.id, id), eq(articles.author_id, author_id), ne(articles.status, 'deleted')))
      .returning(STORED_COLUMNS)
    return (saved as StoredArticle | undefined) ?? null
  }

  async publish(tx: Database, id: string, input: { published_at: Date; search_text: string }): Promise<StoredArticle | null> {
    const [saved] = await tx
      .update(articles)
      .set({
        status: 'published',
        published_at: input.published_at,
        search_vector: sql`to_tsvector('simple', ${input.search_text})`,
        updated_at: new Date(),
      })
      .where(eq(articles.id, id))
      .returning(STORED_COLUMNS)
    return (saved as StoredArticle | undefined) ?? null
  }

  async markDeleted(tx: Database, id: string): Promise<void> {
    // Адрес освобождён для других. В строке остаётся внутренний ключ, чтобы старый slug не нашёл удалённую статью.
    await tx
      .update(articles)
      .set({ status: 'deleted', slug: `deleted-${id}`, updated_at: new Date() })
      .where(eq(articles.id, id))
  }

  appendEvent(tx: Database, name: ArticleEventName, row: StoredArticle, correlation_id: string, moderator_id?: string): Promise<void> {
    return appendArticleEvent(tx, name, row, correlation_id, moderator_id)
  }
}
