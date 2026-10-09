/** Срок одного подтверждения. Повтор заменяет дату, а не прибавляет остаток. */
export const PROMOTION_DURATION_MS = 7 * 24 * 60 * 60 * 1000

export type PromotionRow = {
  article_id: string
  confirmed_at: Date
  until: Date
}

export type PromotionArticle = {
  id: string
  author_id: string
  status: 'draft' | 'published' | 'hidden' | 'deleted'
}

export type PromotionRepository = {
  findArticle: (article_id: string) => Promise<PromotionArticle | null>
  find: (article_id: string) => Promise<PromotionRow | null>
  upsert: (row: PromotionRow) => Promise<PromotionRow>
}
