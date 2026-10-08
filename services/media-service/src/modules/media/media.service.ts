import { randomUUID } from 'node:crypto'
import type { Readable } from 'node:stream'
import { NotFoundError, RestrictedError, UnauthorizedError, ValidationError } from '@blog/errors'
import type { MediaUploadResponse } from '@blog/contracts'
import { UnsupportedMediaError, PayloadTooLargeError } from './media.errors.ts'
import { MEDIA_LIMITS, readBounded, sniff } from './media.sniff.ts'
import type { MediaRepository, MediaService, ObjectStore } from './media.types.ts'

function publicUrl(base: string, key: string): string {
  return `${base.replace(/\/$/, '')}/${key}`
}

export function createMediaService(repository: MediaRepository, store: ObjectStore, public_base: string): MediaService {
  return {
    async upload(input) {
      const { viewer } = input
      if (!viewer.user_id) throw new UnauthorizedError()
      if (viewer.is_restricted) throw new RestrictedError()
      if (!input.idempotency_key) throw new ValidationError({ message: 'Нужен заголовок X-Idempotency-Key', details: { field: 'idempotency_key' } })

      const existing = await repository.findByKey(viewer.user_id, input.idempotency_key)
      if (existing) return existing

      const limit = MEDIA_LIMITS[input.kind]
      if (input.content_length !== undefined && input.content_length > limit) throw new PayloadTooLargeError(limit)

      const bytes = await readBounded(input.body as Readable, limit)
      const mime = await sniff(bytes, input.kind)
      if (!mime) throw new UnsupportedMediaError(null)

      const id = randomUUID()
      const key = `uploads/${id}`
      const url = publicUrl(public_base, key)
      await store.put({ key, body: bytes, content_type: mime })
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

    async lookup(url) {
      const file = await repository.findByUrl(url)
      if (!file) throw new NotFoundError({ message: 'Файл не найден' })
      return file
    },
  }
}

export type { MediaUploadResponse }
