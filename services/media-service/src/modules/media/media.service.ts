import { randomUUID } from 'node:crypto'
import { Readable } from 'node:stream'
import { validateFavicon } from './favicon-validation.ts'
import {
  ForbiddenError,
  NotFoundError,
  RestrictedError,
  UnauthorizedError,
  ValidationError,
} from '@blog/errors'
import type { MediaUploadResponse } from '@blog/contracts'
import { UnsupportedMediaError, PayloadTooLargeError } from './media.errors.ts'
import { MEDIA_LIMITS, TEXT_MIME, readBounded, sniff } from './media.sniff.ts'
import type { MediaRepository, MediaService, ObjectStore } from './media.types.ts'

function publicUrl(base: string, key: string): string {
  return `${base.replace(/\/$/, '')}/${key}`
}

export function createMediaService(
  repository: MediaRepository,
  store: ObjectStore,
  public_base: string,
): MediaService {
  return {
    async upload(input) {
      const { viewer } = input
      if (!viewer.user_id) throw new UnauthorizedError()
      if (viewer.is_restricted) throw new RestrictedError()
      if (!input.idempotency_key)
        throw new ValidationError({
          message: 'Нужен заголовок X-Idempotency-Key',
          details: { field: 'idempotency_key' },
        })

      const existing = await repository.findByKey(viewer.user_id, input.idempotency_key)
      if (existing) return existing

      if (input.kind === 'favicon' && viewer.role !== 'superadmin')
        throw new ForbiddenError({ message: 'Загрузка favicon доступна суперадминистратору' })
      const limit = input.variant === 'manifest' ? 128 * 1024 : MEDIA_LIMITS[input.kind]
      if (input.content_length !== undefined && input.content_length > limit)
        throw new PayloadTooLargeError(limit)

      const bytes = await readBounded(input.body as Readable, limit)
      const mime =
        input.kind === 'favicon' && input.variant
          ? await validateFavicon(bytes, input.variant)
          : await sniff(bytes, input.kind)
      if (!mime) throw new UnsupportedMediaError(null)

      const id = randomUUID()
      const key = `uploads/${id}`
      const url = publicUrl(public_base, key)
      await store.put({
        key,
        body: bytes,
        content_type: mime === TEXT_MIME ? `${TEXT_MIME}; charset=utf-8` : mime,
      })
      const stored = await repository.insert({
        id,
        uploader_id: viewer.user_id,
        kind: input.kind,
        mime,
        byte_size: bytes.length,
        url,
        idempotency_key: input.idempotency_key,
      })
      if (stored) return stored
      const raced = await repository.findByKey(viewer.user_id, input.idempotency_key)
      if (!raced) throw new Error('файл не сохранился')
      return raced
    },

    async content(url) {
      const file = await repository.findByUrl(url)
      if (!file || file.kind !== 'favicon' || !file.id || !file.mime) throw new NotFoundError()
      const key = `uploads/${file.id}`
      const bytes =
        !store.stream && store.get
          ? await store.get({ key, max_bytes: MEDIA_LIMITS.favicon })
          : null
      const body = store.stream ? await store.stream(key) : bytes ? Readable.from([bytes]) : null
      if (!body) throw new NotFoundError()
      return { body, mime: file.mime }
    },
    async lookup(url) {
      const file = await repository.findByUrl(url)
      if (!file) throw new NotFoundError({ message: 'Файл не найден' })
      return { uploader_id: file.uploader_id, kind: file.kind }
    },
  }
}

export type { MediaUploadResponse }
