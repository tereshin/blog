import type { FaviconVariant } from '@blog/contracts'
import { z } from 'zod'
import { postBinary } from '@/shared/api'

const responseSchema = z.object({
  id: z.string(),
  url: z.string(),
  kind: z.enum(['image', 'attachment', 'favicon']),
  mime: z.string(),
  byte_size: z.number(),
})

export type UploadedMedia = z.infer<typeof responseSchema>

export function uploadMedia(
  file: File,
  kind: 'image' | 'attachment' | 'favicon',
  variant?: FaviconVariant,
): Promise<UploadedMedia> {
  return postBinary('/v1/media', file, responseSchema, { query: { kind, variant } })
}
