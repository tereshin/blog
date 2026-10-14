import type { Readable } from 'node:stream'
import type { FaviconVariant, MediaKind, MediaUploadResponse, ServiceContext } from '@blog/contracts'

export type StoredFile = MediaUploadResponse & { uploader_id: string }

export type FoundFile = { uploader_id: string; kind: MediaKind; id?: string; mime?: string }

/** Порт объектного хранилища: S3 в проде, словарь в памяти в тестах. */
export type ObjectStore = {
  stream?: (key: string) => Promise<Readable | null>
  get?: (input: { key: string; max_bytes: number }) => Promise<Uint8Array | null>
  put: (input: { key: string; body: Uint8Array; content_type: string }) => Promise<void>
}

/** Порт хранилища записей о файлах: сервис зависит от него, реализацию подставляет app.ts. */
export type MediaRepositoryPort = {
  findByKey: (uploader_id: string, idempotency_key: string) => Promise<StoredFile | null>
  findByUrl: (url: string) => Promise<FoundFile | null>
  insert: (file: StoredFile & { idempotency_key: string }) => Promise<StoredFile | null>
}

export type UploadInput = {
  viewer: ServiceContext
  variant?: FaviconVariant
  kind: MediaKind
  idempotency_key: string | undefined
  body: NodeJS.ReadableStream
  content_length: number | undefined
}
