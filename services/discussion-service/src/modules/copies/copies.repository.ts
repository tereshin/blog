import { sql } from 'drizzle-orm'
import type { Database } from '@blog/broker'
import { articles_copy, users_copy } from '../../infra/db/schema.ts'

export type ArticleCopy = typeof articles_copy.$inferInsert

export type UserCopyPatch = {
  user_id: string
  display_name?: string | undefined
  avatar_url?: string | null | undefined
  is_restricted?: boolean | undefined
}

/** Копии пишут только потребители событий; остальные модули сервиса копии читают. */
export const copiesRepository = {
  async upsertArticle(tx: Database, copy: ArticleCopy): Promise<void> {
    await tx
      .insert(articles_copy)
      .values(copy)
      .onConflictDoUpdate({
        target: articles_copy.article_id,
        set: {
          author_id: copy.author_id,
          title: copy.title,
          slug: copy.slug,
          visibility: copy.visibility,
          status: copy.status,
          comments_enabled: copy.comments_enabled,
          published_at: copy.published_at ?? null,
        },
      })
  },

  /** Меняет только переданные поля, остальные поля копии остаются как были. */
  async upsertUser(tx: Database, patch: UserCopyPatch): Promise<void> {
    const { user_id, ...fields } = patch
    const defined = Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined))
    await tx
      .insert(users_copy)
      .values({ user_id, ...defined })
      .onConflictDoUpdate({ target: users_copy.user_id, set: Object.keys(defined).length > 0 ? defined : { user_id: sql`${users_copy.user_id}` } })
  },
}
