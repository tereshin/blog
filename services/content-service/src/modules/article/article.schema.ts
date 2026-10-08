import { z } from 'zod'

export const articleParamsSchema = z.strictObject({ slug: z.string().min(1) })

export const articleIdsQuerySchema = z.object({
  ids: z
    .string()
    .optional()
    .transform((value) => (value ? value.split(',').filter((item) => item.length > 0) : []))
    .pipe(z.array(z.uuid()).max(50)),
})
