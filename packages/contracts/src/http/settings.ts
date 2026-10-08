import { z } from 'zod'

export const localeSchema = z.enum(['ru', 'en', 'sr'])

/** Публичные настройки площадки: `GET /v1/settings`. Закрытые поля (регистрация) сюда не попадают. */
export const publicSettingsSchema = z.strictObject({
  name: z.string(),
  logo_url: z.string().nullable(),
  locale: localeSchema,
  about: z.string(),
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
})
export type UpdateSettings = z.infer<typeof updateSettingsSchema>

export const adminSettingsSchema = publicSettingsSchema.extend({
  registration_open: z.boolean(),
  new_members_can_publish: z.boolean(),
})
export type AdminSettings = z.infer<typeof adminSettingsSchema>
