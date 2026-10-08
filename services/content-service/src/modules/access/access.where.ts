import { and, eq, ne, or, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import type { ServiceContext } from '@blog/contracts'
import { articles } from '../../infra/db/schema.ts'

const NEVER = sql`false`

/**
 * SQL-эквивалент `canRead` для выборок: возвращает условие, которое оставляет только статьи, доступные зрителю.
 * Лента, поиск, темы и закладки дополнительно требуют `status = 'published'` — черновик читает автор,
 * но в общих выборках он не появляется.
 */
export function visibleArticlesWhere(viewer: ServiceContext): SQL {
  const is_admin = viewer.role === 'admin' || viewer.role === 'superadmin'
  const own = viewer.user_id === undefined ? NEVER : eq(articles.author_id, viewer.user_id)
  const may_read_restricted = is_admin ? sql`true` : own

  const published = and(
    eq(articles.status, 'published'),
    or(
      eq(articles.visibility, 'public'),
      viewer.role === 'guest' ? NEVER : eq(articles.visibility, 'members'),
      and(eq(articles.visibility, 'author'), may_read_restricted),
    ),
  )
  const draft = and(eq(articles.status, 'draft'), own)
  const hidden = and(eq(articles.status, 'hidden'), may_read_restricted)

  const readable = or(published, draft, hidden)
  return and(ne(articles.status, 'deleted'), readable) ?? NEVER
}
