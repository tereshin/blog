export type FeedMode = 'fresh' | 'popular' | 'mine' | `topic:${string}`

export type ReactionKind = 'laugh' | 'heart' | 'thumb' | 'fire'
export type ReactionCounts = Record<ReactionKind, number>

export type ArticleVisibility = 'public' | 'members' | 'author'

/** Карточка статьи в ленте: готовая к показу модель, а не ответ сервера. */
export type ArticleCardModel = {
  id: string
  slug: string
  title: string
  excerpt: string
  first_image_url: string | null
  published_at: string
  /** `HH:mm` для сегодняшней статьи, иначе `дд.мм.гггг` (FR-061). */
  time_label: string
  author: { user_id: string; display_name: string; avatar_url: string | null; slug: string; href: string }
  topic: { id: string; title: string; slug: string; status: 'active' | 'archived'; href: string }
  reaction_counts: ReactionCounts
  reaction_count: number
  comment_count: number
  bookmark_count: number
  view_count: number
  top_comment: { id: string; author_name: string; author_avatar_url: string | null; excerpt: string } | null
  visibility: ArticleVisibility
  comments_enabled: boolean
  href: string
}

export type FeedPageModel = { items: ArticleCardModel[]; next_cursor: string | null }
