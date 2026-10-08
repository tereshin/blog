import { z } from 'zod'

export const mediaKindSchema = z.enum(['image', 'attachment'])
export type MediaKind = z.infer<typeof mediaKindSchema>

export const mediaUploadResponseSchema = z.strictObject({
  id: z.uuid(),
  url: z.string(),
  kind: mediaKindSchema,
  mime: z.string(),
  byte_size: z.number().int().nonnegative(),
})
export type MediaUploadResponse = z.infer<typeof mediaUploadResponseSchema>
