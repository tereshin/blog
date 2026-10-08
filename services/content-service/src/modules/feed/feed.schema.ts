import { z } from 'zod'
import { feedModeSchema } from '@blog/contracts'
import { FEED_PAGE_SIZE } from './feed.rules.ts'

export const feedQuerySchema = z.object({
  mode: feedModeSchema.default('fresh'),
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(FEED_PAGE_SIZE).default(FEED_PAGE_SIZE),
})
export type FeedQuery = z.infer<typeof feedQuerySchema>
