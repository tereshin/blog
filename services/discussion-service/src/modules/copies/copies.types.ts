import type { ArticleStatus, ArticleVisibility } from '@blog/contracts'

export type ArticleCopy = {
  article_id: string
  author_id: string
  title: string
  slug: string
  visibility: ArticleVisibility
  status: ArticleStatus
  comments_enabled: boolean
  published_at: Date | null
}

/** Поля статьи из событий `content.article.*`: у всех событий одинаковые. */
export type ArticleSnapshotEvent = Omit<ArticleCopy, 'published_at'> & { published_at: string | null }

export type UserCopyPatch = {
  user_id: string
  slug?: string | null | undefined
  display_name?: string | undefined
  avatar_url?: string | null | undefined
  is_restricted?: boolean | undefined
  is_deleted?: boolean | undefined
}

/** Копии пишут только потребители событий; остальные модули сервиса копии читают. */
export type CopiesRepositoryPort<TTx> = {
  upsertArticle: (tx: TTx, copy: ArticleCopy) => Promise<void>
  upsertUser: (tx: TTx, patch: UserCopyPatch) => Promise<void>
}
