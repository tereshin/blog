import { z } from 'zod'

export const localeSchema = z.enum(['ru', 'en', 'sr'])

const REACTION_ORDER = ['laugh', 'heart', 'thumb', 'fire'] as const

function reactionAppearance(kind: (typeof REACTION_ORDER)[number]) {
  return z.discriminatedUnion('presentation', [
    z.strictObject({
      kind: z.literal(kind),
      presentation: z.literal('emoji'),
      emoji: z.string().min(1),
    }),
    z.strictObject({
      kind: z.literal(kind),
      presentation: z.literal('image'),
      image_url: z.string().min(1),
    }),
  ])
}

/** Ровно четыре вида в порядке laugh, heart, thumb, fire. */
export const reactionAppearancesSchema = z.tuple([
  reactionAppearance('laugh'),
  reactionAppearance('heart'),
  reactionAppearance('thumb'),
  reactionAppearance('fire'),
])
export type ReactionAppearance = z.infer<ReturnType<typeof reactionAppearance>>
export type ReactionAppearances = z.infer<typeof reactionAppearancesSchema>

export const DEFAULT_REACTION_APPEARANCES = reactionAppearancesSchema.parse([
  { kind: 'laugh', presentation: 'emoji', emoji: '😄' },
  { kind: 'heart', presentation: 'emoji', emoji: '❤️' },
  { kind: 'thumb', presentation: 'emoji', emoji: '👍' },
  { kind: 'fire', presentation: 'emoji', emoji: '🔥' },
])

/** Публичные настройки площадки: `GET /v1/settings`. Закрытые поля (регистрация) сюда не попадают. */
export const publicSettingsSchema = z.strictObject({
  name: z.string(),
  logo_url: z.string().nullable(),
  locale: localeSchema,
  about: z.string(),
  reaction_appearances: reactionAppearancesSchema,
})
export type PublicSettings = z.infer<typeof publicSettingsSchema>

/** То, что сохраняет суперадминистратор. Публичный ответ эти флаги не отдаёт. */
export const updateSettingsSchema = z.strictObject({
  name: z.string().max(100),
  logo_url: z.string().nullable(),
  locale: localeSchema,
  about: z.string(),
  registration_open: z.boolean(),
  new_members_can_publish: z.boolean(),
  reaction_appearances: reactionAppearancesSchema,
})
export type UpdateSettings = z.infer<typeof updateSettingsSchema>

export const adminSettingsSchema = publicSettingsSchema.extend({
  registration_open: z.boolean(),
  new_members_can_publish: z.boolean(),
})
export type AdminSettings = z.infer<typeof adminSettingsSchema>
