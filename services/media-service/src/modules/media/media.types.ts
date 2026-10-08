import type { MediaKind, MediaUploadResponse } from '@blog/contracts'
import type { ServiceContext } from '@blog/contracts'

export type StoredFile = MediaUploadResponse & { uploader_id: string }

export type ObjectStore = {
  put: (input: { key: string; body: Uint8Array; content_type: string }) => Promise<void>
}

export type MediaRepository = {
  findByKey: (uploader_id: string, idempotency_key: string) => Promise<StoredFile | null>
  findByUrl: (url: string) => Promise<{ uploader_id: string; kind: MediaKind } | null>
  insert: (file: StoredFile & { idempotency_key: string }) => Promise<StoredFile | null>
}

export type MediaService = {
  upload: (input: {
    viewer: ServiceContext
    kind: MediaKind
    idempotency_key: string | undefined
    body: NodeJS.ReadableStream
    content_length: number | undefined
  }) => Promise<MediaUploadResponse>
  lookup: (url: string) => Promise<{ uploader_id: string; kind: MediaKind }>
}
