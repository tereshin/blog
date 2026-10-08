import type { ServiceContext } from '@blog/contracts'

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

export type CommentRepository = {
  /** Видимые комментарии опубликованных статей, доступных зрителю, по убыванию реакций. */
  findPopular: (viewer: ServiceContext, limit: number) => Promise<PopularCommentRow[]>
}
