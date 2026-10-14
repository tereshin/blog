import { z } from 'zod'

export const BUILT_IN_BADGE_IDS = ['first_post', 'ten_reactions', 'one_year'] as const
export const badgeIdSchema = z.union([z.enum(BUILT_IN_BADGE_IDS), z.uuid()])
export const badgeMetricSchema = z.enum(['published_posts', 'reputation', 'membership_months'])
export const badgeDefinitionSchema = z.strictObject({
  id: badgeIdSchema,
  label: z.string().trim().min(1).max(100),
  image_url: z.string().min(1).max(2048),
  status: z.enum(['active', 'archived']),
  trigger: z.strictObject({
    metric: badgeMetricSchema,
    threshold: z.number().int().min(1).max(120000),
  }),
})
export const badgeDefinitionsSchema = z
  .array(badgeDefinitionSchema)
  .max(100)
  .refine((items) => new Set(items.map((item) => item.id)).size === items.length, {
    message: 'Идентификаторы бейджей должны быть уникальными',
  })
export type BadgeDefinition = z.infer<typeof badgeDefinitionSchema>
export type BadgeMetric = z.infer<typeof badgeMetricSchema>
