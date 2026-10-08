import type { ArticleAccessFields, CommentTreePage, PageQuery, PopularComment, ReactionKind, ServiceContext, UserCommentPage } from '@blog/contracts'
import type { CommentCursor, UserCommentCursor } from './comment.schema.ts'
import type { CommentRow } from './comment.tree.ts'

export type PopularCommentRow = {
  id: string
  body: string
  reaction_count: number
  article_id: string
  article_title: string
  article_slug: string
  author_name: string | null
  author_avatar_url: string | null
}

export type UserCommentRow = PopularCommentRow & { created_at: Date }

export type CommentRepository = {
  /** Видимые комментарии опубликованных статей, доступных зрителю, по убыванию реакций. */
  findPopular: (viewer: ServiceContext, limit: number) => Promise<PopularCommentRow[]>
  findArticle: (article_id: string) => Promise<ArticleAccessFields | null>
  listRoots: (article_id: string, cursor: CommentCursor | null, limit: number) => Promise<CommentRow[]>
  listReplies: (root_ids: readonly string[]) => Promise<CommentRow[]>
  countReactions: (comment_ids: readonly string[]) => Promise<{ target_id: string; kind: ReactionKind; total: number }[]>
  findMine: (user_id: string, comment_ids: readonly string[]) => Promise<{ target_id: string; kind: ReactionKind }[]>
  listByAuthor: (
    viewer: ServiceContext,
    author_id: string,
    sort: 'fresh' | 'popular',
    cursor: UserCommentCursor | null,
    limit: number,
  ) => Promise<UserCommentRow[]>
}

export type CommentService = {
  getPopular: (viewer: ServiceContext) => Promise<PopularComment[]>
  listForArticle: (viewer: ServiceContext, article_id: string, query: PageQuery) => Promise<CommentTreePage>
  listByAuthor: (viewer: ServiceContext, author_id: string, sort: 'fresh' | 'popular', query: PageQuery) => Promise<UserCommentPage>
}
