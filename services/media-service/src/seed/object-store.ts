import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

export type SeedObjectStore = {
  exists: (key: string) => Promise<boolean>
  put: (input: { key: string; body: Uint8Array; content_type: string }) => Promise<void>
}

function isMissing(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const name = 'name' in error ? String(error.name) : ''
  const metadata = '$metadata' in error ? error.$metadata : null
  const status = metadata && typeof metadata === 'object' && 'httpStatusCode' in metadata ? metadata.httpStatusCode : 0
  return name === 'NotFound' || name === 'NoSuchKey' || status === 404
}

/** MinIO: существующий объект не перезаписывается. */
export function createS3SeedStore(input: {
  endpoint: string
  region: string
  bucket: string
  access_key: string
  secret_key: string
}): SeedObjectStore {
  const client = new S3Client({
    region: input.region,
    endpoint: input.endpoint,
    forcePathStyle: true,
    credentials: { accessKeyId: input.access_key, secretAccessKey: input.secret_key },
  })
  return {
    async exists(key) {
      try {
        await client.send(new HeadObjectCommand({ Bucket: input.bucket, Key: key }))
        return true
      } catch (error) {
        if (isMissing(error)) return false
        throw error
      }
    },
    async put({ key, body, content_type }) {
      await client.send(new PutObjectCommand({ Bucket: input.bucket, Key: key, Body: body, ContentType: content_type }))
    },
  }
}
