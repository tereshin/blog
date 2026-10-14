import { z } from 'zod'

export const ArticleParamsSchema = z.strictObject({ slug: z.string().min(1) })

export const ArticleIdParamsSchema = z.strictObject({ id: z.uuid() })

/** Пока отдаём только черновики автора. Другой статус — отказ схемы, а не чужой список. */
export const MyArticlesQuerySchema = z.strictObject({ status: z.literal('draft') })

export const ArticleIdsQuerySchema = z.object({
  ids: z
    .string()
    .optional()
    .transform((value) => (value ? value.split(',').filter((item) => item.length > 0) : []))
    .pipe(z.array(z.uuid()).max(50)),
})
