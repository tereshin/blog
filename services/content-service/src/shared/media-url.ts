import { ValidationError } from '@blog/errors'
import type { FileOwner } from './editor-document/document.sanitizer.ts'

/** Картинка площадки должна быть загружена на свой media-origin. Чужой адрес не сохраняем. */
export function assertMediaUrl(value: string | null, media_url: string, field: string): void {
  if (value === null) return
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new ValidationError({ message: 'Адрес изображения не подходит', details: { field } })
  }
  if (
    !['http:', 'https:'].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    parsed.origin !== new URL(media_url).origin
  ) {
    throw new ValidationError({
      message: 'Изображение должно быть загружено на площадку',
      details: { field, reason: 'media_url' },
    })
  }
}

/** Accept another configured storage only when media-service recognizes this exact file. */
export async function assertUploadedMediaUrl(
  value: string | null,
  bases: string | readonly string[],
  field: string,
  lookup?: (url: string) => Promise<FileOwner | null>,
): Promise<void> {
  if (value === null) return
  const allowed_bases = typeof bases === 'string' ? [bases] : bases
  for (const base of allowed_bases) {
    try {
      assertMediaUrl(value, base, field)
      return
    } catch (error) {
      if (!(error instanceof ValidationError)) throw error
    }
  }
  const file = await lookup?.(value)
  if (file?.public_url) {
    assertMediaUrl(value, file.public_url, field)
    return
  }
  throw new ValidationError({
    message: 'Изображение должно быть загружено на площадку',
    details: { field, reason: 'media_url' },
  })
}
