import { and, eq, inArray } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { ReactionKind } from '@blog/contracts'
import { bookmarks, reactions } from '../../infra/db/schema.ts'
import type { ArticleStateRepositoryPort, ViewerArticleMarks } from './article-state.types.ts'

export class ArticleStateRepository implements ArticleStateRepositoryPort {
  constructor(private readonly db: NodePgDatabase) {}

  async findViewerMarks(user_id: string, article_ids: readonly string[]): Promise<ViewerArticleMarks> {
    const ids = [...article_ids]
    const [reaction_rows, bookmark_rows] = await Promise.all([
      this.db
        .select({ target_id: reactions.target_id, kind: reactions.kind })
        .from(reactions)
        .where(and(eq(reactions.user_id, user_id), eq(reactions.target_type, 'article'), inArray(reactions.target_id, ids))),
      this.db
        .select({ article_id: bookmarks.article_id })
        .from(bookmarks)
        .where(and(eq(bookmarks.user_id, user_id), inArray(bookmarks.article_id, ids))),
    ])
    return {
      reaction_by_article_id: new Map<string, ReactionKind>(reaction_rows.map((row) => [row.target_id, row.kind])),
      bookmarked_article_ids: new Set(bookmark_rows.map((row) => row.article_id)),
    }
  }
}
