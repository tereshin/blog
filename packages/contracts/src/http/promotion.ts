import { z } from 'zod'

/** Подтверждение пакета показов. Денег не списывается, других пакетов нет. */
export const confirmPromotionSchema = z.strictObject({
  package: z.literal('basic'),
})
export type ConfirmPromotion = z.infer<typeof confirmPromotionSchema>

export const promotionSchema = z.strictObject({
  article_id: z.uuid(),
  confirmed_at: z.iso.datetime(),
  until: z.iso.datetime(),
})
export type Promotion = z.infer<typeof promotionSchema>
