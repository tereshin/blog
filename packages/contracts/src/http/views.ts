import { z } from 'zod'

/** `POST /v1/articles/{article_id}/views`. `moderation` — открытие из очереди модерации. */
export const recordViewSchema = z.strictObject({
  context: z.literal('moderation').optional(),
})
export type RecordView = z.infer<typeof recordViewSchema>

export const viewCountSchema = z.strictObject({
  counted: z.boolean(),
  view_count: z.number().int().nonnegative(),
})
export type ViewCount = z.infer<typeof viewCountSchema>
