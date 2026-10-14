import type { Comment, CommentReport, ModerationFilters, ReactionKind, ServiceContext } from '@blog/contracts'
import type { CommentStatus } from '../comment.tree.ts'
import type { CommentArticle } from '../comment.types.ts'
import type { CommentReportRecord, ReviewReportInput } from '../write/comment-write.types.ts'

export type { CommentReportRecord }

export type PageCursor = { t: string; id: string } | null

export type ReportListRow = CommentReportRecord & {
  body: string
  author_id: string
  author_name: string | null
  comment_status: CommentStatus
  article_id: string
  article_slug: string
}

export type CommentInteractionRepositoryPort = {
  bookmark: (user_id: string, comment_id: string, is_saved: boolean) => Promise<{ is_bookmarked: boolean }>
  bookmarks: (
    viewer: ServiceContext,
    user_id: string,
    cursor: PageCursor,
    limit: number,
  ) => Promise<{ id: string; article_id: string; article_slug: string; article_title: string; created_at: Date }[]>
  reactors: (
    comment_id: string,
    kind: ReactionKind,
    cursor: PageCursor,
    limit: number,
  ) => Promise<{ user_id: string; display_name: string | null; avatar_url: string | null; created_at: Date }[]>
  report: (user_id: string, comment_id: string, reason: string) => Promise<CommentReportRecord>
  reports: (cursor: PageCursor, limit: number, filters: ModerationFilters) => Promise<ReportListRow[]>
  subscription: (user_id: string, article_id: string, enabled?: boolean) => Promise<{ is_subscribed: boolean }>
  mentions: (query: string) => Promise<{ user_id: string; display_name: string | null; avatar_url: string | null; slug: string | null }[]>
}

/** Чтение комментариев с проверкой доступа зрителя. */
export type CommentReaderPort = {
  getThread: (viewer: ServiceContext, id: string) => Promise<{ article_id: string; root: Comment; target: Comment }>
  getByIds: (viewer: ServiceContext, ids: string[]) => Promise<Comment[]>
}

export type CommentArticlesPort = {
  findArticle: (article_id: string) => Promise<CommentArticle | null>
}

export type CommentReportReviewerPort = {
  reviewReport: (input: ReviewReportInput) => Promise<CommentReport>
}
