import { and, eq, inArray } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { ArticleStates, ReactionKind, ServiceContext } from '@blog/contracts'
import { bookmarks, reactions } from '../../infra/db/schema.ts'

export type ArticleStateService = {
  get: (viewer: ServiceContext, article_ids: readonly string[]) => Promise<ArticleStates>
}

export function createArticleStateService(db: NodePgDatabase): ArticleStateService {
  return {
    async get(viewer, article_ids) {
      if (viewer.user_id === undefined || article_ids.length === 0) return { states: {} }
      const user_id = viewer.user_id
      const ids = [...article_ids]
      const [reaction_rows, bookmark_rows] = await Promise.all([
        db
          .select({ target_id: reactions.target_id, kind: reactions.kind })
          .from(reactions)
          .where(and(eq(reactions.user_id, user_id), eq(reactions.target_type, 'article'), inArray(reactions.target_id, ids))),
        db
          .select({ article_id: bookmarks.article_id })
          .from(bookmarks)
          .where(and(eq(bookmarks.user_id, user_id), inArray(bookmarks.article_id, ids))),
      ])
      const reaction_by_id = new Map<string, ReactionKind>(reaction_rows.map((row) => [row.target_id, row.kind]))
      const bookmarked = new Set(bookmark_rows.map((row) => row.article_id))
      const states: ArticleStates['states'] = {}
      for (const article_id of ids) {
        states[article_id] = { my_reaction: reaction_by_id.get(article_id) ?? null, is_bookmarked: bookmarked.has(article_id) }
      }
      return { states }
    },
  }
}
