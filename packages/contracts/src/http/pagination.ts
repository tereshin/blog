import { z } from 'zod'

export const DEFAULT_PAGE_LIMIT = 20
export const MAX_PAGE_LIMIT = 100

/** Курсорная пагинация: `?cursor=&limit=`. */
export const pageQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).default(DEFAULT_PAGE_LIMIT),
})

export type PageQuery = z.infer<typeof pageQuerySchema>

export function pageSchema<TItem extends z.ZodType>(item: TItem) {
  return z.strictObject({
    items: z.array(item),
    next_cursor: z.string().nullable(),
  })
}
