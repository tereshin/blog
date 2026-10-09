import type { Article, ArticleCards, ArticleDraft, BlocksDocument, CreateArticle, ServiceContext, UpdateArticle } from '@blog/contracts'

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

export type StoredArticle = {
  id: string
  author_id: string
  topic_id: string
  title: string
  slug: string
  blocks: unknown
  visibility: 'public' | 'members' | 'author'
  comments_enabled: boolean
  status: 'draft' | 'published' | 'hidden' | 'deleted'
  published_at: Date | null
  excerpt: string
  first_image_url: string | null
}

export type NewArticle = {
  author_id: string
  title: string
  topic_id: string
  blocks: BlocksDocument
  visibility: 'public' | 'members' | 'author'
  comments_enabled: boolean
  excerpt: string
  first_image_url: string | null
  slug?: string
}

export type ArticleSave = {
  title: string
  topic_id: string
  blocks: BlocksDocument
  visibility: 'public' | 'members' | 'author'
  comments_enabled: boolean
  excerpt: string
  first_image_url: string | null
  /** Заголовок и текст блоков: пишется в `search_vector`, пока статья опубликована. */
  search_text: string
  slug?: string
  correlation_id: string
}

export type ArticleRepository = {
  findBySlug: (slug: string) => Promise<ArticleRow | null>
  findVisibleByIds: (viewer: ServiceContext, ids: readonly string[]) => Promise<ArticleRow[]>
  findProfiles: (user_ids: readonly string[]) => Promise<Map<string, { display_name: string; avatar_url: string | null }>>
  findForAuthor: (id: string, author_id: string) => Promise<StoredArticle | null>
  listDrafts: (author_id: string) => Promise<StoredArticle[]>
  insertDraft: (input: NewArticle) => Promise<StoredArticle>
  save: (id: string, author_id: string, input: ArticleSave) => Promise<StoredArticle | null>
  publish: (id: string, author_id: string, input: { has_content: boolean; search_text: string; correlation_id: string }) => Promise<StoredArticle | null>
  remove: (id: string, author_id: string, correlation_id: string) => Promise<StoredArticle | null>
}

export type ArticleService = {
  getBySlug: (viewer: ServiceContext, slug: string) => Promise<Article>
  getByIds: (viewer: ServiceContext, ids: readonly string[]) => Promise<ArticleCards>
  create: (viewer: ServiceContext, input: CreateArticle, correlation_id: string) => Promise<ArticleDraft>
  update: (viewer: ServiceContext, id: string, input: UpdateArticle, correlation_id: string) => Promise<ArticleDraft>
  publish: (viewer: ServiceContext, id: string, correlation_id: string) => Promise<ArticleDraft>
  remove: (viewer: ServiceContext, id: string, correlation_id: string) => Promise<void>
  getDraft: (viewer: ServiceContext, id: string) => Promise<ArticleDraft>
  listDrafts: (viewer: ServiceContext) => Promise<ArticleDraft[]>
}
