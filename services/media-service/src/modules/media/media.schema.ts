import { z } from 'zod'
import { faviconVariantSchema, mediaKindSchema } from '@blog/contracts'

export const UploadQuerySchema = z
  .object({ kind: mediaKindSchema, variant: faviconVariantSchema.optional() })
  .refine((query) => query.kind !== 'favicon' || query.variant !== undefined, {
    message: 'Нужен вариант favicon',
  })
export type UploadQuery = z.infer<typeof UploadQuerySchema>

export const FileLookupQuerySchema = z.object({ url: z.string().min(1) })
export type FileLookupQuery = z.infer<typeof FileLookupQuerySchema>
