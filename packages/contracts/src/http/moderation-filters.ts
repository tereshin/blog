import { z } from 'zod'
import { pageQuerySchema } from './pagination.ts'
export const moderationFiltersSchema = pageQuerySchema.extend({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  q: z.string().trim().max(200).default(''),
  status: z.enum(['open', 'reviewed', 'all']).default('open'),
  sort: z.enum(['newest', 'oldest']).default('newest'),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  topic_id: z.uuid().optional(),
  article_status: z.enum(['published', 'hidden', 'deleted', 'all']).default('all'),
})
export type ModerationFilters = z.infer<typeof moderationFiltersSchema>
export const moderationArticleQuerySchema = moderationFiltersSchema.extend({
  filter: z.enum(['reported', 'hidden', 'search']).default('reported'),
})
export type ModerationArticleQuery = z.infer<typeof moderationArticleQuerySchema>
