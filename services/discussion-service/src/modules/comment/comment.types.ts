import type {
  ArticleAccessFields,
  CommentSort,
  Comment,
  ReactionKind,
  ServiceContext,
} from '@blog/contracts'
import type { CommentCursor, UserCommentCursor } from './comment.schema.ts'
import type { CommentRow, CommentStatus } from './comment.tree.ts'

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

export type CommentArticle = ArticleAccessFields & { comments_enabled: boolean }

export type CommentRepositoryPort = {
  /** Видимые комментарии опубликованных статей, доступных зрителю, по убыванию реакций. */
  findPopular: (viewer: ServiceContext, limit: number) => Promise<PopularCommentRow[]>
  findArticle: (article_id: string) => Promise<CommentArticle | null>
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

type WriteBase = {
  user_id: string
  idempotency_key: string | null
  correlation_id: string
}

export type InsertCommentInput = WriteBase & {
  article_id: string
  body: string
  media?: { url: string; alt: string }[] | undefined
  mentions?: { user_id: string; display_name: string }[] | undefined
  parent_id?: string | undefined
}

export type ChangeCommentInput = WriteBase & { comment_id: string }

export type ModerateCommentInput = {
  comment_id: string
  status: CommentStatus
  correlation_id: string
  moderator_id: string
}

/** Запись комментариев: транзакция, идемпотентность и события живут за этим портом. */
export type CommentWriterPort = {
  insert: (input: InsertCommentInput) => Promise<Comment>
  update: (input: ChangeCommentInput & { body: string }) => Promise<Comment>
  remove: (input: ChangeCommentInput) => Promise<Comment>
  moderate: (input: ModerateCommentInput) => Promise<Comment>
}
