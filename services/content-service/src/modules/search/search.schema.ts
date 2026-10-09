import { z } from 'zod'

export const SEARCH_PAGE_SIZE = 20

export const searchQuerySchema = z.object({
  q: z.string().trim().min(2).max(100),
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(SEARCH_PAGE_SIZE).default(SEARCH_PAGE_SIZE),
})
export type SearchQuery = z.infer<typeof searchQuerySchema>
