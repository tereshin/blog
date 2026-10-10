import type {
  ArticleAccessFields,
  CommentSort,
  Comment,
  CommentTreePage,
  PageQuery,
  PopularComment,
  ReactionKind,
  ServiceContext,
  UserCommentPage,
} from '@blog/contracts'
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
  findArticle: (
    article_id: string,
  ) => Promise<(ArticleAccessFields & { comments_enabled: boolean }) | null>
  listRoots: (
    article_id: string,
    cursor: CommentCursor | null,
    limit: number,
    sort?: CommentSort,
  ) => Promise<CommentRow[]>
  listReplies: (root_ids: readonly string[]) => Promise<CommentRow[]>
  findByIds: (viewer: ServiceContext, ids: string[]) => Promise<CommentRow[]>
  findComment: (id: string) => Promise<(CommentRow & { article_id: string }) | null>
  listReplyPage: (
    root_id: string,
    cursor: CommentCursor | null,
    limit: number,
    sort: CommentSort,
  ) => Promise<CommentRow[]>
  findBookmarks: (user_id: string, ids: readonly string[]) => Promise<string[]>
  countReactions: (
    comment_ids: readonly string[],
  ) => Promise<{ target_id: string; kind: ReactionKind; total: number }[]>
  findMine: (
    user_id: string,
    comment_ids: readonly string[],
  ) => Promise<{ target_id: string; kind: ReactionKind }[]>
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
  listForArticle: (
    viewer: ServiceContext,
    article_id: string,
    query: PageQuery & { sort?: CommentSort; include_replies?: boolean },
  ) => Promise<CommentTreePage>
  listReplyPage: (
    viewer: ServiceContext,
    root_id: string,
    query: PageQuery & { sort?: CommentSort },
  ) => Promise<CommentTreePage>
  getByIds: (viewer: ServiceContext, ids: string[]) => Promise<Comment[]>
  getThread: (
    viewer: ServiceContext,
    id: string,
  ) => Promise<{ article_id: string; root: Comment; target: Comment }>
  listByAuthor: (
    viewer: ServiceContext,
    author_id: string,
    sort: 'fresh' | 'popular',
    query: PageQuery,
  ) => Promise<UserCommentPage>
  create: (input: {
    viewer: ServiceContext
    article_id: string
    body: string
    media?: { url: string; alt: string }[] | undefined
    mentions?: { user_id: string; display_name: string }[] | undefined
    parent_id?: string | undefined
    idempotency_key: string | null
    correlation_id: string
  }) => Promise<Comment>
  update: (input: {
    viewer: ServiceContext
    comment_id: string
    body: string
    idempotency_key: string | null
    correlation_id: string
  }) => Promise<Comment>
  remove: (input: {
    viewer: ServiceContext
    comment_id: string
    idempotency_key: string | null
    correlation_id: string
  }) => Promise<Comment>
  hide: (input: {
    viewer: ServiceContext
    comment_id: string
    correlation_id: string
  }) => Promise<Comment>
  restore: (input: {
    viewer: ServiceContext
    comment_id: string
    correlation_id: string
  }) => Promise<Comment>
  moderateRemove: (input: {
    viewer: ServiceContext
    comment_id: string
    correlation_id: string
  }) => Promise<Comment>
}
