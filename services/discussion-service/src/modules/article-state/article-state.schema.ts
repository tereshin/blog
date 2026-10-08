import { z } from 'zod'

export const ARTICLE_STATES_LIMIT = 50

export const articleStatesQuerySchema = z.object({
  article_ids: z
    .string()
    .optional()
    .transform((value) => (value ? value.split(',').filter((item) => item.length > 0) : []))
    .pipe(z.array(z.uuid()).max(ARTICLE_STATES_LIMIT)),
})
