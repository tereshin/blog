import { z } from 'zod'
import { http } from '@/shared/api'

/** Ответ `GET /v1/settings`. Неизвестный язык не ломает приложение: берём русский. */
export const publicSettingsSchema = z.object({
  name: z.string(),
  logo_url: z.string().nullable(),
  locale: z.enum(['ru', 'en', 'sr']).catch('ru'),
  about: z.string().nullable().optional(),
})
type PublicSettingsDto = z.infer<typeof publicSettingsSchema>

/** Модель для интерфейса: поля всегда заданы, компоненты не знают о формате ответа. */
export type PublicSettings = {
  name: string
  logo_url: string | null
  locale: 'ru' | 'en' | 'sr'
  about: string
}

export function toPublicSettings(dto: PublicSettingsDto): PublicSettings {
  return { name: dto.name.trim(), logo_url: dto.logo_url, locale: dto.locale, about: dto.about ?? '' }
}

export async function getSettings(signal?: AbortSignal): Promise<PublicSettings> {
  return toPublicSettings(await http.get('/v1/settings', publicSettingsSchema, { signal }))
}
