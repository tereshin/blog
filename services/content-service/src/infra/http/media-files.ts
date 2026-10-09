import { z } from 'zod'
import type { ServiceClient } from '@blog/http-kit'

const fileSchema = z.looseObject({ uploader_id: z.uuid() })

/** `GET {MEDIA_URL}/internal/files?url=` — чей файл. 404 и чужой ответ считаются «не наш». */
export async function lookupMediaFile(client: ServiceClient, url: string): Promise<{ uploader_id: string } | null> {
  const response = await client.request({ path: `/internal/files?url=${encodeURIComponent(url)}` })
  if (response.status !== 200) return null
  const parsed = fileSchema.safeParse(response.body)
  return parsed.success ? { uploader_id: parsed.data.uploader_id } : null
}
