import { and, eq, or } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import type { ServiceContext } from '@blog/contracts'
import { articles_copy } from '../../infra/db/schema.ts'

/**
 * SQL-эквивалент `canReadArticle` для опубликованных статей.
 * Комментарии, закладки и реакции не отдают закрытую статью ни фрагментом, ни ссылкой.
 */
export function readableArticleWhere(viewer: ServiceContext): SQL {
  const is_admin = viewer.role === 'admin' || viewer.role === 'superadmin'
  const conditions: SQL[] = [eq(articles_copy.visibility, 'public')]
  if (viewer.role !== 'guest') conditions.push(eq(articles_copy.visibility, 'members'))
  if (is_admin) conditions.push(eq(articles_copy.visibility, 'author'))
  else if (viewer.user_id) conditions.push(and(eq(articles_copy.visibility, 'author'), eq(articles_copy.author_id, viewer.user_id)) as SQL)
  return and(eq(articles_copy.status, 'published'), or(...conditions)) as SQL
}
