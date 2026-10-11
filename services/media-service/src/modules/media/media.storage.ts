import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import type { ObjectStore } from './media.types.ts'

export function createS3Store(input: {
  endpoint: string
  region: string
  bucket: string
  access_key: string
  secret_key: string
}): ObjectStore {
  const client = new S3Client({
    region: input.region,
    endpoint: input.endpoint,
    forcePathStyle: true,
    credentials: { accessKeyId: input.access_key, secretAccessKey: input.secret_key },
    maxAttempts: 3,
  })
  return {
    async get({ key, max_bytes }) {
      try {
        const result = await client.send(new GetObjectCommand({ Bucket: input.bucket, Key: key }), { abortSignal: AbortSignal.timeout(10_000) })
        if (!result.Body) return null
        const stream = result.Body.transformToWebStream()
        const reader = stream.getReader()
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
        } finally { await reader.cancel(); reader.releaseLock() }
      } catch (error) {
        if (error instanceof Error && ['NoSuchKey', 'NotFound'].includes(error.name)) return null
        throw error
      }
    },
    async put({ key, body, content_type }) {
      await client.send(new PutObjectCommand({ Bucket: input.bucket, Key: key, Body: body, ContentType: content_type, ...(key.startsWith('social-covers/') ? { CacheControl: 'public, max-age=31536000, immutable' } : {}) }), { abortSignal: AbortSignal.timeout(10_000) })
    },
  }
}
