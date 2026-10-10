import { and, asc, desc, eq, inArray, isNull, ne, or, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import {
  articles_copy,
  comment_bookmarks,
  comments,
  reactions,
  users_copy,
} from '../../infra/db/schema.ts'
import { readableArticleWhere } from '../access/readable-where.ts'
import type { CommentSort } from '@blog/contracts'
import type { CommentCursor } from './comment.schema.ts'
import type { CommentRepository } from './comment.types.ts'
import type { CommentRow } from './comment.tree.ts'

export function createCommentRepository(db: NodePgDatabase): CommentRepository {
  return {
    async findPopular(viewer, limit) {
      return db
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
          and(eq(comments.status, 'visible'), ne(comments.body, ''), readableArticleWhere(viewer)),
        )
        .orderBy(desc(comments.reaction_count), desc(comments.created_at), desc(comments.id))
        .limit(limit)
    },

    async findArticle(article_id) {
      const [row] = await db
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
    },

    async listRoots(article_id, cursor, limit, sort = 'oldest') {
      return selectComments(
        db,
        and(
          eq(comments.article_id, article_id),
          isNull(comments.parent_id),
          threaded(),
          cursorAfter(cursor, sort),
        ),
        limit,
        sort,
      )
    },

    async listReplies(root_ids) {
      if (root_ids.length === 0) return []
      return selectComments(db, and(inArray(comments.parent_id, [...root_ids]), threaded()))
    },

    async findByIds(viewer, ids) {
      if (!ids.length) return []
      return selectComments(
        db,
        and(
          inArray(comments.id, ids),
          eq(comments.status, 'visible'),
          inArray(
            comments.article_id,
            db
              .select({ id: articles_copy.article_id })
              .from(articles_copy)
              .where(readableArticleWhere(viewer)),
          ),
        ),
      )
    },
    async findComment(id) {
      const [row] = await selectComments(db, eq(comments.id, id), 1)
      return row ?? null
    },
    async listReplyPage(root_id, cursor, limit, sort) {
      return selectComments(
        db,
        and(eq(comments.parent_id, root_id), threaded(), cursorAfter(cursor, sort)),
        limit,
        sort,
      )
    },
    async findBookmarks(user_id, ids) {
      if (!ids.length) return []
      const rows = await db
        .select({ id: comment_bookmarks.comment_id })
        .from(comment_bookmarks)
        .where(
          and(
            eq(comment_bookmarks.user_id, user_id),
            inArray(comment_bookmarks.comment_id, [...ids]),
          ),
        )
      return rows.map((row) => row.id)
    },
    async countReactions(comment_ids) {
      if (comment_ids.length === 0) return []
      const rows = await db
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
      return rows.map((row) => ({
        target_id: row.target_id,
        kind: row.kind,
        total: Number(row.total),
      }))
    },

    async findMine(user_id, comment_ids) {
      if (comment_ids.length === 0) return []
      return db
        .select({ target_id: reactions.target_id, kind: reactions.kind })
        .from(reactions)
        .where(
          and(
            eq(reactions.user_id, user_id),
            eq(reactions.target_type, 'comment'),
            inArray(reactions.target_id, [...comment_ids]),
          ),
        )
    },

    async listByAuthor(viewer, author_id, sort, cursor, limit) {
      const score = sql<number>`${comments.reaction_count}`
      const after =
        sort === 'popular'
          ? cursor?.k === 'score'
            ? sql`(${score}, ${comments.id}) < (${cursor.s}, ${cursor.id})`
            : undefined
          : cursor?.k === 'time'
            ? sql`(${comments.created_at}, ${comments.id}) < (${new Date(cursor.t)}, ${cursor.id})`
            : undefined
      return db
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
          and(
            eq(comments.author_id, author_id),
            eq(comments.status, 'visible'),
            readableArticleWhere(viewer),
            after,
          ),
        )
        .orderBy(
          sort === 'popular' ? desc(comments.reaction_count) : desc(comments.created_at),
          desc(comments.id),
        )
        .limit(limit)
    },
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

function selectComments(
  db: NodePgDatabase,
  where: SQL | undefined,
  limit?: number,
  sort: CommentSort = 'oldest',
): Promise<(CommentRow & { article_id: string })[]> {
  const query = db
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
  return (limit === undefined ? query : query.limit(limit)) as Promise<
    (CommentRow & { article_id: string })[]
  >
}
