import type { Article, ArticleCards, ServiceContext } from '@blog/contracts'

export type ArticleRow = {
  id: string
  slug: string
  title: string
  excerpt: string
  first_image_url: string | null
  blocks: unknown
  published_at: Date | null
  visibility: 'public' | 'members' | 'author'
  comments_enabled: boolean
  status: 'draft' | 'published' | 'hidden' | 'deleted'
  author_id: string
  author_display_name: string | null
  author_avatar_url: string | null
  author_slug: string | null
  author_public_number: number | null
  topic_id: string
  topic_title: string
  topic_slug: string
  topic_status: 'active' | 'archived'
  reaction_counts: unknown
  reaction_count: number
  comment_count: number
  bookmark_count: number
  view_count: number
  top_comment: unknown
}

export type ArticleRepository = {
  findBySlug: (slug: string) => Promise<ArticleRow | null>
  findVisibleByIds: (viewer: ServiceContext, ids: readonly string[]) => Promise<ArticleRow[]>
  findProfiles: (user_ids: readonly string[]) => Promise<Map<string, { display_name: string; avatar_url: string | null }>>
}

export type ArticleService = {
  getBySlug: (viewer: ServiceContext, slug: string) => Promise<Article>
  getByIds: (viewer: ServiceContext, ids: readonly string[]) => Promise<ArticleCards>
}
