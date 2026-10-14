import { and, desc, eq, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { ServiceContext } from '@blog/contracts'
import type { Database } from '@blog/broker'
import { readableArticleWhere } from '../../infra/db/readable-article-where.ts'
import { articles_copy, bookmarks } from '../../infra/db/schema.ts'
import type { BookmarkCursor } from './bookmark.schema.ts'
import type { BookmarkArticle, BookmarkRepositoryPort } from './bookmark.types.ts'

export class BookmarkRepository implements BookmarkRepositoryPort<Database> {
  constructor(private readonly db: NodePgDatabase) {}

  async findArticle(article_id: string): Promise<BookmarkArticle | null> {
    const [row] = await this.db
      .select({
        article_id: articles_copy.article_id,
        author_id: articles_copy.author_id,
        visibility: articles_copy.visibility,
        status: articles_copy.status,
      })
      .from(articles_copy)
      .where(eq(articles_copy.article_id, article_id))
      .limit(1)
    return row ?? null
  }

  transaction<TResult>(work: (tx: Database) => Promise<TResult>): Promise<TResult> {
    return this.db.transaction((tx) => work(tx))
  }

  async setBookmarked(tx: Database, input: { user_id: string; article_id: string; is_bookmarked: boolean }): Promise<void> {
    if (input.is_bookmarked) {
      await tx.insert(bookmarks).values({ user_id: input.user_id, article_id: input.article_id }).onConflictDoNothing()
      return
    }
    await tx.delete(bookmarks).where(and(eq(bookmarks.user_id, input.user_id), eq(bookmarks.article_id, input.article_id)))
  }

  async list(viewer: ServiceContext, user_id: string, cursor: BookmarkCursor | null, limit: number): Promise<{ article_id: string; created_at: Date }[]> {
    const after = cursor ? sql`(${bookmarks.created_at}, ${bookmarks.article_id}) < (${new Date(cursor.t)}, ${cursor.id})` : undefined
    return this.db
      .select({ article_id: bookmarks.article_id, created_at: bookmarks.created_at })
      .from(bookmarks)
      .innerJoin(articles_copy, eq(articles_copy.article_id, bookmarks.article_id))
      .where(and(eq(bookmarks.user_id, user_id), readableArticleWhere(viewer), after))
      .orderBy(desc(bookmarks.created_at), desc(bookmarks.article_id))
      .limit(limit)
  }
}
