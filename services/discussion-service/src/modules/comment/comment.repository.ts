import { and, asc, desc, eq, inArray, isNull, ne, or, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { ServiceContext } from '@blog/contracts'
import { articles_copy, comments, reactions, users_copy } from '../../infra/db/schema.ts'
import type { CommentCursor } from './comment.schema.ts'
import type { CommentRepository } from './comment.types.ts'
import type { CommentRow } from './comment.tree.ts'

/** Те же условия, что `canReadArticle` для `status = published` (контракт доступа общий для всех сервисов). */
function readableArticleWhere(viewer: ServiceContext): SQL {
  const is_admin = viewer.role === 'admin' || viewer.role === 'superadmin'
  const conditions: SQL[] = [eq(articles_copy.visibility, 'public')]
  if (viewer.role !== 'guest') conditions.push(eq(articles_copy.visibility, 'members'))
  if (is_admin) conditions.push(eq(articles_copy.visibility, 'author'))
  else if (viewer.user_id) conditions.push(and(eq(articles_copy.visibility, 'author'), eq(articles_copy.author_id, viewer.user_id)) as SQL)
  return and(eq(articles_copy.status, 'published'), or(...conditions)) as SQL
}

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
        .where(and(eq(comments.status, 'visible'), ne(comments.body, ''), readableArticleWhere(viewer)))
        .orderBy(desc(comments.reaction_count), desc(comments.created_at), desc(comments.id))
        .limit(limit)
    },

    async findArticle(article_id) {
      const [row] = await db
        .select({
          author_id: articles_copy.author_id,
          visibility: articles_copy.visibility,
          status: articles_copy.status,
        })
        .from(articles_copy)
        .where(eq(articles_copy.article_id, article_id))
        .limit(1)
      return row ?? null
    },

    async listRoots(article_id, cursor, limit) {
      return selectComments(db, and(eq(comments.article_id, article_id), isNull(comments.parent_id), threaded(), cursorAfter(cursor)), limit)
    },

    async listReplies(root_ids) {
      if (root_ids.length === 0) return []
      return selectComments(db, and(inArray(comments.parent_id, [...root_ids]), threaded()))
    },

    async countReactions(comment_ids) {
      if (comment_ids.length === 0) return []
      const rows = await db
        .select({ target_id: reactions.target_id, kind: reactions.kind, total: sql<number>`count(*)::int` })
        .from(reactions)
        .where(and(eq(reactions.target_type, 'comment'), inArray(reactions.target_id, [...comment_ids])))
        .groupBy(reactions.target_id, reactions.kind)
      return rows.map((row) => ({ target_id: row.target_id, kind: row.kind, total: Number(row.total) }))
    },

    async findMine(user_id, comment_ids) {
      if (comment_ids.length === 0) return []
      return db
        .select({ target_id: reactions.target_id, kind: reactions.kind })
        .from(reactions)
        .where(and(eq(reactions.user_id, user_id), eq(reactions.target_type, 'comment'), inArray(reactions.target_id, [...comment_ids])))
    },
  }
}

/** Видимый комментарий или заглушка, у которой уже есть ответы. */
function threaded(): SQL {
  return or(eq(comments.status, 'visible'), sql`${comments.reply_count} > 0`) as SQL
}

function cursorAfter(cursor: CommentCursor | null): SQL | undefined {
  if (!cursor) return undefined
  return sql`(${comments.created_at}, ${comments.id}) > (${new Date(cursor.t)}, ${cursor.id})`
}

function selectComments(db: NodePgDatabase, where: SQL | undefined, limit?: number): Promise<CommentRow[]> {
  const query = db
    .select({
      id: comments.id,
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
    .orderBy(asc(comments.created_at), asc(comments.id))
  return (limit === undefined ? query : query.limit(limit)) as Promise<CommentRow[]>
}

