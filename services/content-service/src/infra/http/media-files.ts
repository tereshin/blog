import { z } from 'zod'
import type { ServiceClient } from '@blog/http-kit'
import type { FileOwner } from '../../shared/editor-document/document.sanitizer.ts'

const fileSchema = z.looseObject({ uploader_id: z.uuid(), public_url: z.url().optional() })

/** `GET {MEDIA_URL}/internal/files?url=` — чей файл. 404 и чужой ответ считаются «не наш». */
export async function lookupMediaFile(client: ServiceClient, url: string): Promise<FileOwner | null> {
  const response = await client.request({ path: `/internal/files?url=${encodeURIComponent(url)}` })
  if (response.status !== 200) return null
  const parsed = fileSchema.safeParse(response.body)
  return parsed.success ? { uploader_id: parsed.data.uploader_id, ...(parsed.data.public_url ? { public_url: parsed.data.public_url } : {}) } : null
}
