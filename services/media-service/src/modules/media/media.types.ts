import type { Readable } from 'node:stream'
import type { FaviconVariant, MediaKind, MediaUploadResponse } from '@blog/contracts'
import type { ServiceContext } from '@blog/contracts'

export type StoredFile = MediaUploadResponse & { uploader_id: string }

export type ObjectStore = {
  stream?: (key: string) => Promise<Readable | null>
  get?: (input: { key: string; max_bytes: number }) => Promise<Uint8Array | null>
  put: (input: { key: string; body: Uint8Array; content_type: string }) => Promise<void>
}

export type MediaRepository = {
  findByKey: (uploader_id: string, idempotency_key: string) => Promise<StoredFile | null>
  findByUrl: (
    url: string,
  ) => Promise<{ uploader_id: string; kind: MediaKind; id?: string; mime?: string } | null>
  insert: (file: StoredFile & { idempotency_key: string }) => Promise<StoredFile | null>
}

export type MediaService = {
  upload: (input: {
    viewer: ServiceContext
    variant?: FaviconVariant
    kind: MediaKind
    idempotency_key: string | undefined
    body: NodeJS.ReadableStream
    content_length: number | undefined
  }) => Promise<MediaUploadResponse>
  content: (url: string) => Promise<{ body: Readable; mime: string }>
  lookup: (url: string) => Promise<{ uploader_id: string; kind: MediaKind }>
}
