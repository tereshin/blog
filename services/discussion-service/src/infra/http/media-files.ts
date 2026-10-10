import { z } from 'zod'
import type { ServiceClient } from '@blog/http-kit'
const fileSchema = z.object({ uploader_id: z.uuid(), kind: z.enum(['image', 'attachment']) })
export async function lookupCommentMedia(client: ServiceClient, url: string) {
  const response = await client.request({ path: `/internal/files?url=${encodeURIComponent(url)}` })
  const result = response.status === 200 ? fileSchema.safeParse(response.body) : null
  return result?.success ? result.data : null
}
