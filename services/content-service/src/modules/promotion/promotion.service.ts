import type { Promotion, ServiceContext } from '@blog/contracts'
import { ForbiddenError, NotFoundError, RestrictedError, UnauthorizedError } from '@blog/errors'
import { PromotionNotAllowedError } from './promotion.errors.ts'
import { PROMOTION_DURATION_MS } from './promotion.types.ts'
import type { PromotionRepository, PromotionRow } from './promotion.types.ts'

export type PromotionService = {
  confirm: (viewer: ServiceContext, article_id: string) => Promise<Promotion>
  get: (viewer: ServiceContext, article_id: string) => Promise<Promotion>
}

function requireAuthor(viewer: ServiceContext): string {
  if (viewer.user_id === undefined) throw new UnauthorizedError()
  if (viewer.is_restricted) throw new RestrictedError()
  return viewer.user_id
}

function toPromotion(row: PromotionRow): Promotion {
  return {
    article_id: row.article_id,
    confirmed_at: row.confirmed_at.toISOString(),
    until: row.until.toISOString(),
  }
}

export function createPromotionService(repository: PromotionRepository, options: { now?: () => Date } = {}): PromotionService {
  const now = options.now ?? (() => new Date())
  return {
    async confirm(viewer, article_id) {
      const user_id = requireAuthor(viewer)
      const article = await repository.findArticle(article_id)
      if (!article) throw new NotFoundError({ message: 'Такой статьи нет' })
      if (article.author_id !== user_id) throw new ForbiddenError({ message: 'Продвигать статью может только автор' })
      if (article.status !== 'published') throw new PromotionNotAllowedError()
      const confirmed_at = now()
      const until = new Date(confirmed_at.getTime() + PROMOTION_DURATION_MS)
      return toPromotion(await repository.upsert({ article_id, confirmed_at, until }))
    },
    async get(viewer, article_id) {
      if (viewer.user_id === undefined) throw new UnauthorizedError()
      const article = await repository.findArticle(article_id)
      if (!article) throw new NotFoundError({ message: 'Такой статьи нет' })
      if (article.author_id !== viewer.user_id) throw new ForbiddenError({ message: 'Продвижение видит только автор' })
      const row = await repository.find(article_id)
      if (!row) throw new NotFoundError({ message: 'Продвижения ещё нет' })
      return toPromotion(row)
    },
  }
}
