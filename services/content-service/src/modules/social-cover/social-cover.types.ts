import type { SocialCoverGeneratedV1, SocialCoverInput } from '@blog/contracts'

export type CoverSiteSource = { name: string; logo_url: string | null; social_cover: unknown }

export type CoverArticle = {
  id: string
  title: string
  first_image_url: string | null
  author_name: string | null
}

export type CoverArticleSource = CoverArticle & {
  status: 'draft' | 'published' | 'hidden' | 'deleted'
  visibility: 'public' | 'members' | 'author'
}

export type CoverRequest = { target_id: string; revision: string; input: SocialCoverInput; correlation_id: string }

/** Порт хранилища обложек. Все операции идут в транзакции владельца записи (`TTx`). */
export type SocialCoverRepositoryPort<TTx> = {
  findSite: (tx: TTx) => Promise<CoverSiteSource | null>
  findArticle: (tx: TTx, article_id: string) => Promise<CoverArticleSource | null>
  /** Опубликованные публичные статьи автора, для которых обложка уже запрашивалась; курсор по `id`. */
  listCoveredByAuthor: (tx: TTx, author_id: string, after_id: string | undefined, limit: number) => Promise<CoverArticle[]>
  /** `true`, если ревизия изменилась (или прежний запрос завис) и задачу нужно отправить. */
  saveRequest: (tx: TTx, target_id: string, revision: string) => Promise<boolean>
  appendRequested: (tx: TTx, request: CoverRequest) => Promise<void>
  remove: (tx: TTx, target_id: string) => Promise<void>
  applyGenerated: (tx: TTx, result: SocialCoverGeneratedV1) => Promise<void>
}
