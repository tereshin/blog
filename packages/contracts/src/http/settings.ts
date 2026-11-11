import { z } from 'zod'
import { badgeDefinitionsSchema } from './badges.ts'
import { blocksDocumentSchema } from './blocks.ts'
import { faviconSettingsSchema } from './site-assets.ts'
import { reactionKindSchema } from './feed.ts'
import { seoSettingsSchema, socialCoverSettingsSchema } from './seo.ts'

export const welcomeContentSchema = z.object({
  title: z.string().trim().max(300),
  document: blocksDocumentSchema,
})
export type WelcomeContent = z.infer<typeof welcomeContentSchema>

export const maintenanceStatusSchema = z.strictObject({
  maintenance_enabled: z.boolean(),
  locale: z.enum(['ru', 'en', 'sr']),
})

export const localeSchema = z.enum(['ru', 'en', 'sr'])
const fontFamilySchema = z.string().trim().min(1).max(100).regex(/^[\p{L}\p{N} +.'-]+$/u)

export const MAX_ACTIVE_REACTIONS = 20
export const MAX_REACTION_APPEARANCES = 100

const reactionAppearanceFields = {
  kind: reactionKindSchema,
  label: z.string().trim().min(1).max(50),
  status: z.enum(['active', 'retired']),
}

/** Вид реакции в каталоге площадки. Порядок массива — порядок выбора; снятые идут после активных. */
export const reactionAppearanceSchema = z.discriminatedUnion('presentation', [
  z.strictObject({
    ...reactionAppearanceFields,
    presentation: z.literal('emoji'),
    emoji: z.string().min(1),
  }),
  z.strictObject({
    ...reactionAppearanceFields,
    presentation: z.literal('image'),
    image_url: z.string().min(1),
  }),
])
export type ReactionAppearance = z.infer<typeof reactionAppearanceSchema>

export const reactionAppearancesSchema = z
  .array(reactionAppearanceSchema)
  .min(1)
  .max(MAX_REACTION_APPEARANCES)
  .refine((items) => new Set(items.map((item) => item.kind)).size === items.length, {
    message: 'Идентификаторы реакций должны быть уникальными',
  })
  .refine((items) => items.some((item) => item.status === 'active'), {
    message: 'Нужна хотя бы одна активная реакция',
  })
  .refine(
    (items) => items.filter((item) => item.status === 'active').length <= MAX_ACTIVE_REACTIONS,
    {
      message: 'Активных реакций не больше 20',
    },
  )
  .refine(
    (items) => {
      const first_retired = items.findIndex((item) => item.status === 'retired')
      return (
        first_retired === -1 ||
        items.slice(first_retired).every((item) => item.status === 'retired')
      )
    },
    { message: 'Снятые реакции идут после активных' },
  )
export type ReactionAppearances = z.infer<typeof reactionAppearancesSchema>

export const DEFAULT_REACTION_APPEARANCES = reactionAppearancesSchema.parse([
  { kind: 'heart', label: 'Сердце', status: 'active', presentation: 'emoji', emoji: '❤️' },
  { kind: 'laugh', label: 'Смех', status: 'active', presentation: 'emoji', emoji: '😄' },
  { kind: 'thumb', label: 'Палец вверх', status: 'active', presentation: 'emoji', emoji: '👍' },
  { kind: 'fire', label: 'Огонь', status: 'active', presentation: 'emoji', emoji: '🔥' },
])

export const profileStatusIconSchema = z.strictObject({
  id: z.uuid(),
  label: z.string().trim().min(1).max(50),
  image_url: z.url(),
})
export const profileStatusIconsSchema = z
  .array(profileStatusIconSchema)
  .max(100)
  .refine((icons) => new Set(icons.map((icon) => icon.id)).size === icons.length, {
    message: 'Идентификаторы статусов должны быть уникальными',
  })
export type ProfileStatusIcon = z.infer<typeof profileStatusIconSchema>

/** Видимость пунктов левого меню и блока «Популярные комментарии». Пропуск поля значит «показать». */
export const DEFAULT_SHELL_VISIBILITY = {
  popular: true,
  fresh: true,
  mine: true,
  messages: true,
  rating: true,
  popular_comments: true,
}

export const shellVisibilitySchema = z.strictObject({
  popular: z.boolean().default(true),
  fresh: z.boolean().default(true),
  mine: z.boolean().default(true),
  messages: z.boolean().default(true),
  rating: z.boolean().default(true),
  popular_comments: z.boolean().default(true),
})
export type ShellVisibility = z.infer<typeof shellVisibilitySchema>

/** Токены вида площадки: радиус карточек и стеклянная шапка. */
export const DEFAULT_THEME_SETTINGS = {
  radius_card: '1rem',
  header_overlay_hue: 270,
  header_overlay_opacity: 90,
  header_overlay_blur_px: 4,
} as const

const radiusCardSchema = z
  .string()
  .trim()
  .min(2)
  .max(16)
  .regex(/^\d+(\.\d+)?(rem|px|em)$/)

export const themeSettingsSchema = z.strictObject({
  radius_card: radiusCardSchema.default(DEFAULT_THEME_SETTINGS.radius_card),
  header_overlay_hue: z.number().min(0).max(360).default(DEFAULT_THEME_SETTINGS.header_overlay_hue),
  header_overlay_opacity: z
    .number()
    .min(0)
    .max(100)
    .default(DEFAULT_THEME_SETTINGS.header_overlay_opacity),
  header_overlay_blur_px: z
    .number()
    .min(0)
    .max(40)
    .default(DEFAULT_THEME_SETTINGS.header_overlay_blur_px),
})
export type ThemeSettings = z.infer<typeof themeSettingsSchema>

/** Публичные настройки площадки: `GET /v1/settings`. Закрытые поля (регистрация) сюда не попадают. */
export const publicSettingsSchema = z.strictObject({
  meta_pixel_id: z.string().regex(/^[0-9]{5,25}$/).nullable().optional(),
  maintenance_enabled: z.boolean().optional(),
  welcome_content: welcomeContentSchema.nullable().optional(),
  name: z.string(),
  font_family: fontFamilySchema.optional(),
  font_stylesheet_url: z.url().nullable().optional(),
  logo_url: z.string().nullable(),
  logo_dark_url: z.string().nullable().optional(),
  favicon: faviconSettingsSchema.optional(),
  locale: localeSchema,
  reaction_appearances: reactionAppearancesSchema,
  profile_status_icons: profileStatusIconsSchema.default([]),
  profile_badges: badgeDefinitionsSchema,
  seo: seoSettingsSchema.optional(),
  social_cover: socialCoverSettingsSchema.optional(),
  shell: shellVisibilitySchema.default(DEFAULT_SHELL_VISIBILITY),
  theme: themeSettingsSchema.default(DEFAULT_THEME_SETTINGS),
})
export type PublicSettings = z.infer<typeof publicSettingsSchema>

/** То, что сохраняет суперадминистратор. Флаги регистрации и публикации остаются закрытыми. */
export const updateSettingsSchema = z.strictObject({
  meta_pixel_id: z.string().regex(/^[0-9]{5,25}$/).nullable().optional(),
  maintenance_enabled: z.boolean().optional(),
  welcome_content: welcomeContentSchema.nullable().optional(),
  name: z.string().max(100),
  font_family: fontFamilySchema.optional(),
  logo_url: z.string().nullable(),
  logo_dark_url: z.string().nullable().optional(),
  favicon: faviconSettingsSchema.optional(),
  locale: localeSchema,
  registration_open: z.boolean(),
  new_members_can_publish: z.boolean(),
  reaction_appearances: reactionAppearancesSchema,
  profile_status_icons: profileStatusIconsSchema.default([]),
  profile_badges: badgeDefinitionsSchema.optional(),
  seo: seoSettingsSchema.optional(),
  social_cover: socialCoverSettingsSchema.optional(),
  /** Нет поля — оставить сохранённую видимость. Пустой объект включает все разделы. */
  shell: shellVisibilitySchema.optional(),
  /** Нет поля — оставить сохранённые токены вида. */
  theme: themeSettingsSchema.optional(),
})
export type UpdateSettings = z.infer<typeof updateSettingsSchema>

export const adminSettingsSchema = publicSettingsSchema.extend({
  public_origin: z.url().optional(),
  registration_open: z.boolean(),
  new_members_can_publish: z.boolean(),
})
export type AdminSettings = z.infer<typeof adminSettingsSchema>
