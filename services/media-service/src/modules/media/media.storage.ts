import { Readable } from 'node:stream'
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import type { ObjectStore } from './media.types.ts'

const S3_TIMEOUT_MS = 10_000

export type MediaStorageOptions = {
  endpoint: string
  region: string
  bucket: string
  access_key: string
  secret_key: string
}

function isMissing(error: unknown): boolean {
  return error instanceof Error && ['NoSuchKey', 'NotFound'].includes(error.name)
}

/** Объектное хранилище S3/MinIO: один клиент на процесс. */
export class MediaStorage implements ObjectStore {
  private readonly client: S3Client
  private readonly bucket: string

  constructor(options: MediaStorageOptions) {
    this.bucket = options.bucket
    this.client = new S3Client({
      region: options.region,
      endpoint: options.endpoint,
      forcePathStyle: true,
      credentials: { accessKeyId: options.access_key, secretAccessKey: options.secret_key },
      maxAttempts: 3,
    })
  }

  async stream(key: string): Promise<Readable | null> {
    try {
      const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
        abortSignal: AbortSignal.timeout(S3_TIMEOUT_MS),
      })
      return result.Body ? Readable.fromWeb(result.Body.transformToWebStream()) : null
    } catch (error) {
      if (isMissing(error)) return null
      throw error
    }
  }

  async get({ key, max_bytes }: { key: string; max_bytes: number }): Promise<Uint8Array | null> {
    try {
      const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
        abortSignal: AbortSignal.timeout(S3_TIMEOUT_MS),
      })
      if (!result.Body) return null
      const reader = result.Body.transformToWebStream().getReader()
      const chunks: Uint8Array[] = []
      let size = 0
      try {
        if ((result.ContentLength ?? 0) > max_bytes) return null
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          size += value.byteLength
          if (size > max_bytes) return null
          chunks.push(value)
        }
        return Buffer.concat(chunks)
      } finally {
        await reader.cancel()
        reader.releaseLock()
      }
    } catch (error) {
      if (isMissing(error)) return null
      throw error
    }
  }

  async put({ key, body, content_type }: { key: string; body: Uint8Array; content_type: string }): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: content_type,
        ...(key.startsWith('social-covers/') ? { CacheControl: 'public, max-age=31536000, immutable' } : {}),
      }),
      { abortSignal: AbortSignal.timeout(S3_TIMEOUT_MS) },
    )
  }
}
