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
