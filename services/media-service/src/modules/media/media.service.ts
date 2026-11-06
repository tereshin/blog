import { randomUUID } from 'node:crypto'
import { Readable } from 'node:stream'
import type { MediaKind, MediaUploadResponse } from '@blog/contracts'
import { ForbiddenError, NotFoundError, RestrictedError, UnauthorizedError, ValidationError } from '@blog/errors'
import { validateFavicon } from './favicon-validation.ts'
import { compressImage } from './image-compression.ts'
import { PayloadTooLargeError, UnsupportedMediaError } from './media.errors.ts'
import { MEDIA_LIMITS, TEXT_MIME, readBounded, sniff } from './media.sniff.ts'
import type { MediaRepositoryPort, MediaRuntime, ObjectStore, UploadInput } from './media.types.ts'

const MANIFEST_LIMIT_BYTES = 128 * 1024

function publicUrl(base: string, key: string): string {
  return `${base.replace(/\/$/, '')}/${key}`
}

export class MediaService {
  constructor(
    private readonly repository: MediaRepositoryPort,
    private readonly store: ObjectStore,
    private readonly public_base: string,
    private readonly runtime?: MediaRuntime,
  ) {}

  async upload(input: UploadInput): Promise<MediaUploadResponse> {
    const { viewer } = input
    if (!viewer.user_id) throw new UnauthorizedError()
    if (viewer.is_restricted) throw new RestrictedError()
    if (!input.idempotency_key)
      throw new ValidationError({
        message: 'Нужен заголовок X-Idempotency-Key',
        details: { field: 'idempotency_key' },
      })

    const existing = await this.repository.findByKey(viewer.user_id, input.idempotency_key)
    if (existing) return existing

    if (input.kind === 'favicon' && viewer.role !== 'superadmin')
      throw new ForbiddenError({ message: 'Загрузка favicon доступна суперадминистратору' })
    const limit = input.variant === 'manifest' ? MANIFEST_LIMIT_BYTES : MEDIA_LIMITS[input.kind]
    if (input.content_length !== undefined && input.content_length > limit) throw new PayloadTooLargeError(limit)

    let bytes = await readBounded(input.body as Readable, limit)
    let mime =
      input.kind === 'favicon' && input.variant ? await validateFavicon(bytes, input.variant) : await sniff(bytes, input.kind)
    if (!mime) throw new UnsupportedMediaError(null)

    const target = await this.runtime?.current()
    if (input.kind === 'image' && target) ({ bytes, mime } = await compressImage(bytes, mime, target.compression))

    const id = randomUUID()
    const key = `uploads/${id}`
    const url = publicUrl(target?.public_url ?? this.public_base, key)
    await (target?.store ?? this.store).put({
      key,
      body: bytes,
      content_type: mime === TEXT_MIME ? `${TEXT_MIME}; charset=utf-8` : mime,
    })
    const stored = await this.repository.insert({
      id,
      uploader_id: viewer.user_id,
      kind: input.kind,
      mime,
      byte_size: bytes.length,
      url,
      idempotency_key: input.idempotency_key,
      storage_id: target?.storage_id ?? null,
    })
    if (stored) return stored
    const raced = await this.repository.findByKey(viewer.user_id, input.idempotency_key)
    if (!raced) throw new Error('файл не сохранился')
    return raced
  }

  async content(url: string): Promise<{ body: Readable; mime: string }> {
    const file = await this.repository.findByUrl(url)
    if (!file || file.kind !== 'favicon' || !file.id || !file.mime) throw new NotFoundError()
    const key = `uploads/${file.id}`
    const store = this.runtime ? (await this.runtime.forStorage(file.storage_id ?? null)).store : this.store
    const bytes = !store.stream && store.get ? await store.get({ key, max_bytes: MEDIA_LIMITS.favicon }) : null
    const body = store.stream ? await store.stream(key) : bytes ? Readable.from([bytes]) : null
    if (!body) throw new NotFoundError()
    return { body, mime: file.mime }
  }

  async lookup(url: string): Promise<{ uploader_id: string; kind: MediaKind; public_url?: string }> {
    const file = await this.repository.findByUrl(url)
    if (!file) throw new NotFoundError({ message: 'Файл не найден' })
    const target = await this.runtime?.forStorage(file.storage_id ?? null)
    return { uploader_id: file.uploader_id, kind: file.kind, ...(target ? { public_url: target.public_url } : {}) }
  }
}
