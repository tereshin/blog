import { and, asc, desc, eq, exists, inArray, isNull, ne, or, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { CommentSort, ReactionKind, ServiceContext } from '@blog/contracts'
import { readableArticleWhere } from '../../infra/db/readable-article-where.ts'
import {
  articles_copy,
  comment_bookmarks,
  comments,
  reactions,
  users_copy,
} from '../../infra/db/schema.ts'
import type { CommentCursor, UserCommentCursor } from './comment.schema.ts'
import type {
  CommentArticle,
  CommentRepositoryPort,
  PopularCommentRow,
  UserCommentRow,
} from './comment.types.ts'
import type { CommentRow } from './comment.tree.ts'

type ArticleCommentRow = CommentRow & { article_id: string }

export class CommentRepository implements CommentRepositoryPort {
  constructor(private readonly db: NodePgDatabase) {}

  async findPopular(viewer: ServiceContext, limit: number): Promise<PopularCommentRow[]> {
    return this.db
      .select({
        id: comments.id,
        body: comments.body,
        reaction_count: comments.reaction_count,
        article_id: articles_copy.article_id,
        article_title: articles_copy.title,
        article_slug: articles_copy.slug,
        author_name: users_copy.display_name,
        author_avatar_url: users_copy.avatar_url,
      })
      .from(comments)
      .innerJoin(articles_copy, eq(articles_copy.article_id, comments.article_id))
      .leftJoin(users_copy, eq(users_copy.user_id, comments.author_id))
      .where(
        and(
          eq(comments.status, 'visible'),
          ne(comments.body, ''),
          readableArticleWhere(viewer),
          exists(
            this.db
              .select({ value: sql`1` })
              .from(reactions)
              .where(
                and(eq(reactions.target_type, 'comment'), eq(reactions.target_id, comments.id)),
              ),
          ),
        ),
      )
      .orderBy(desc(comments.created_at), desc(comments.id))
      .limit(limit)
  }

  async findArticle(article_id: string): Promise<CommentArticle | null> {
    const [row] = await this.db
      .select({
        author_id: articles_copy.author_id,
        visibility: articles_copy.visibility,
        status: articles_copy.status,
        comments_enabled: articles_copy.comments_enabled,
      })
      .from(articles_copy)
      .where(eq(articles_copy.article_id, article_id))
      .limit(1)
    return row ?? null
  }

  async listRoots(
    article_id: string,
    cursor: CommentCursor | null,
    limit: number,
    sort: CommentSort = 'oldest',
  ): Promise<CommentRow[]> {
    return this.selectComments(
      and(
        eq(comments.article_id, article_id),
        isNull(comments.parent_id),
        threaded(),
        cursorAfter(cursor, sort),
      ),
      limit,
      sort,
    )
  }

  async listReplies(root_ids: readonly string[]): Promise<CommentRow[]> {
    if (root_ids.length === 0) return []
    return this.selectComments(and(inArray(comments.parent_id, [...root_ids]), threaded()))
  }

  async findByIds(viewer: ServiceContext, ids: string[]): Promise<CommentRow[]> {
    if (!ids.length) return []
    return this.selectComments(
      and(
        inArray(comments.id, ids),
        eq(comments.status, 'visible'),
        inArray(
          comments.article_id,
          this.db
            .select({ id: articles_copy.article_id })
            .from(articles_copy)
            .where(readableArticleWhere(viewer)),
        ),
      ),
    )
  }

  async findComment(id: string): Promise<ArticleCommentRow | null> {
    const [row] = await this.selectComments(eq(comments.id, id), 1)
    return row ?? null
  }

  async listReplyPage(
    root_id: string,
    cursor: CommentCursor | null,
    limit: number,
    sort: CommentSort,
  ): Promise<CommentRow[]> {
    return this.selectComments(
      and(eq(comments.parent_id, root_id), threaded(), cursorAfter(cursor, sort)),
      limit,
      sort,
    )
  }

  async findBookmarks(user_id: string, ids: readonly string[]): Promise<string[]> {
    if (!ids.length) return []
    const rows = await this.db
      .select({ id: comment_bookmarks.comment_id })
      .from(comment_bookmarks)
      .where(
        and(
          eq(comment_bookmarks.user_id, user_id),
          inArray(comment_bookmarks.comment_id, [...ids]),
        ),
      )
    return rows.map((row) => row.id)
  }

  async countReactions(
    comment_ids: readonly string[],
  ): Promise<{ target_id: string; kind: ReactionKind; total: number }[]> {
    if (comment_ids.length === 0) return []
    const rows = await this.db
      .select({
        target_id: reactions.target_id,
        kind: reactions.kind,
        total: sql<number>`count(*)::int`,
      })
      .from(reactions)
      .where(
        and(eq(reactions.target_type, 'comment'), inArray(reactions.target_id, [...comment_ids])),
      )
      .groupBy(reactions.target_id, reactions.kind)
    return rows.map((row) => ({ target_id: row.target_id, kind: row.kind, total: Number(row.total) }))
  }

  async findMine(
    user_id: string,
    comment_ids: readonly string[],
  ): Promise<{ target_id: string; kind: ReactionKind }[]> {
    if (comment_ids.length === 0) return []
    return this.db
      .select({ target_id: reactions.target_id, kind: reactions.kind })
      .from(reactions)
      .where(
        and(
          eq(reactions.user_id, user_id),
          eq(reactions.target_type, 'comment'),
          inArray(reactions.target_id, [...comment_ids]),
        ),
      )
  }

  async listByAuthor(
    viewer: ServiceContext,
    author_id: string,
    sort: 'fresh' | 'popular',
    cursor: UserCommentCursor | null,
    limit: number,
  ): Promise<UserCommentRow[]> {
    const score = sql<number>`${comments.reaction_count}`
    const after =
      sort === 'popular'
        ? cursor?.k === 'score'
          ? sql`(${score}, ${comments.id}) < (${cursor.s}, ${cursor.id})`
          : undefined
        : cursor?.k === 'time'
          ? sql`(${comments.created_at}, ${comments.id}) < (${new Date(cursor.t)}, ${cursor.id})`
          : undefined
    return this.db
      .select({
        id: comments.id,
        body: comments.body,
        reaction_count: comments.reaction_count,
        article_id: articles_copy.article_id,
        article_title: articles_copy.title,
        article_slug: articles_copy.slug,
        author_name: users_copy.display_name,
        author_avatar_url: users_copy.avatar_url,
        created_at: comments.created_at,
      })
      .from(comments)
      .innerJoin(articles_copy, eq(articles_copy.article_id, comments.article_id))
      .leftJoin(users_copy, eq(users_copy.user_id, comments.author_id))
      .where(
        and(eq(comments.author_id, author_id), eq(comments.status, 'visible'), readableArticleWhere(viewer), after),
      )
      .orderBy(
        sort === 'popular' ? desc(comments.reaction_count) : desc(comments.created_at),
        desc(comments.id),
      )
      .limit(limit)
  }

  private selectComments(
    where: SQL | undefined,
    limit?: number,
    sort: CommentSort = 'oldest',
  ): Promise<ArticleCommentRow[]> {
    const query = this.db
      .select({
        id: comments.id,
        article_id: comments.article_id,
        media: comments.media,
        mentions: comments.mentions,
        author_id: comments.author_id,
        parent_id: comments.parent_id,
        body: comments.body,
        status: comments.status,
        edited_at: comments.edited_at,
        reaction_count: comments.reaction_count,
        reply_count: comments.reply_count,
        created_at: comments.created_at,
        author_name: users_copy.display_name,
        author_avatar_url: users_copy.avatar_url,
      })
      .from(comments)
      .leftJoin(users_copy, eq(users_copy.user_id, comments.author_id))
      .where(where)
      .orderBy(
        ...(sort === 'best'
          ? [desc(comments.reaction_count), desc(comments.created_at), desc(comments.id)]
          : sort === 'newest'
            ? [desc(comments.created_at), desc(comments.id)]
            : [asc(comments.created_at), asc(comments.id)]),
      )
    return limit === undefined ? query : query.limit(limit)
  }
}

/** Видимый комментарий или заглушка, у которой уже есть ответы. */
function threaded(): SQL {
  return or(eq(comments.status, 'visible'), sql`${comments.reply_count} > 0`) as SQL
}

function cursorAfter(cursor: CommentCursor | null, sort: CommentSort): SQL | undefined {
  if (!cursor) return undefined
  if (sort === 'best')
    return sql`(${comments.reaction_count}, ${comments.created_at}, ${comments.id}) < (${cursor.score}, ${new Date(cursor.t)}, ${cursor.id})`
  return sort === 'oldest'
    ? sql`(${comments.created_at}, ${comments.id}) > (${new Date(cursor.t)}, ${cursor.id})`
    : sql`(${comments.created_at}, ${comments.id}) < (${new Date(cursor.t)}, ${cursor.id})`
}
