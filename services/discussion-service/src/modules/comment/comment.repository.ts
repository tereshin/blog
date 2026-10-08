import { and, desc, eq, ne, or } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { ServiceContext } from '@blog/contracts'
import { articles_copy, comments, users_copy } from '../../infra/db/schema.ts'
import type { CommentRepository } from './comment.types.ts'

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
  }
}

