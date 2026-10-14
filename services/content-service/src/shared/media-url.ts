import { ValidationError } from '@blog/errors'

/** Картинка площадки должна быть загружена на свой media-origin. Чужой адрес не сохраняем. */
export function assertMediaUrl(value: string | null, media_url: string, field: string): void {
  if (value === null) return
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new ValidationError({ message: 'Адрес изображения не подходит', details: { field } })
  }
  if (parsed.origin !== new URL(media_url).origin) {
    throw new ValidationError({ message: 'Изображение должно быть загружено на площадку', details: { field, reason: 'media_url' } })
  }
}
