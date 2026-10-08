import { ANCHOR_OFFSETS, at } from './anchor.ts'
import { articleId } from './articles.ts'
import type { SeedPromotion } from './types.ts'

/** Одно действующее и одно истёкшее продвижение; смещения заданы от якоря. */
export function buildPromotions(anchor: Date): SeedPromotion[] {
  return [
    {
      article_id: articleId('published_promoted'),
      confirmed_at: at(anchor, ANCHOR_OFFSETS.promotion_active_confirmed_at),
      until: at(anchor, ANCHOR_OFFSETS.promotion_active_until),
    },
    {
      article_id: articleId('published_promotion_expired'),
      confirmed_at: at(anchor, ANCHOR_OFFSETS.promotion_expired_confirmed_at),
      until: at(anchor, ANCHOR_OFFSETS.promotion_expired_until),
    },
  ]
}
