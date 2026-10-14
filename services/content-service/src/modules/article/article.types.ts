import type { BlocksDocument, ServiceContext } from '@blog/contracts'

export type ArticleRow = {
  id: string
  slug: string
  title: string
  excerpt: string
  has_more_content?: boolean
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
  author_status_icon_id: string | null
  topic_id: string
  topic_title: string
  topic_slug: string
  topic_status: 'active' | 'archived'
  topic_avatar_url?: string | null
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
  seo_title?: string | null
  seo_description?: string | null
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
  seo_title?: string | null
  seo_description?: string | null
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
  seo_title?: string | null
  seo_description?: string | null
}

export type ArticleEventName =
  | 'content.article.published'
  | 'content.article.updated'
  | 'content.article.hidden'
  | 'content.article.restored'
  | 'content.article.deleted'

export type ProfileLite = { display_name: string; avatar_url: string | null }

export type TopicStatus = 'active' | 'archived'

/** Порт хранилища статей: только чтение и запись строк, оркестрация — в сервисе. */
export type ArticleRepositoryPort<TTx> = {
  transaction: <T>(work: (tx: TTx) => Promise<T>) => Promise<T>
  findBySlug: (slug: string) => Promise<ArticleRow | null>
  findVisibleByIds: (viewer: ServiceContext, ids: readonly string[]) => Promise<ArticleRow[]>
  findProfiles: (user_ids: readonly string[]) => Promise<Map<string, ProfileLite>>
  findForAuthor: (id: string, author_id: string, tx?: TTx) => Promise<StoredArticle | null>
  listDrafts: (author_id: string) => Promise<StoredArticle[]>
  findTopicStatus: (tx: TTx, topic_id: string) => Promise<TopicStatus | null>
  findPublicNumber: (tx: TTx, user_id: string) => Promise<number | null>
  insertDraft: (tx: TTx, input: NewArticle & { id: string; slug: string }) => Promise<StoredArticle>
  /** `should_index` — статья опубликована, и `search_vector` пересчитывается вместе с правкой. */
  save: (tx: TTx, id: string, author_id: string, input: ArticleSave & { should_index: boolean }) => Promise<StoredArticle | null>
  publish: (tx: TTx, id: string, input: { published_at: Date; search_text: string }) => Promise<StoredArticle | null>
  markDeleted: (tx: TTx, id: string) => Promise<void>
  appendEvent: (tx: TTx, name: ArticleEventName, row: StoredArticle, correlation_id: string, moderator_id?: string) => Promise<void>
}

/** Чтение для витрины: методы без транзакции. */
export type ArticleReadRepositoryPort = Pick<ArticleRepositoryPort<never>, 'findBySlug' | 'findVisibleByIds' | 'findProfiles'>

export type ArticleSlugsPort<TTx> = {
  reserveSlug: (tx: TTx, slug: string, owner_type: 'article', owner_id: string) => Promise<void>
  replaceSlug: (tx: TTx, slug: string, owner_type: 'article', owner_id: string) => Promise<void>
  releaseSlug: (tx: TTx, owner_type: 'article', owner_id: string) => Promise<void>
  pickFree: (tx: TTx, choose: (is_unavailable: (slug: string) => boolean) => string) => Promise<string>
}

export type ArticleCoversPort<TTx> = {
  requestArticleCover: (tx: TTx, article_id: string, correlation_id: string) => Promise<void>
  invalidateArticleCover: (tx: TTx, article_id: string) => Promise<void>
}

export type ArticleBadgesPort<TTx> = {
  evaluate: (tx: TTx, user_id: string) => Promise<void>
}
