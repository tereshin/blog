import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
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
  })
  return {
    async put({ key, body, content_type }) {
      await client.send(new PutObjectCommand({ Bucket: input.bucket, Key: key, Body: body, ContentType: content_type }))
    },
  }
}
