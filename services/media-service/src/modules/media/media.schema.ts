import { z } from 'zod'
import { faviconVariantSchema, mediaKindSchema } from '@blog/contracts'

export const uploadQuerySchema = z
  .object({ kind: mediaKindSchema, variant: faviconVariantSchema.optional() })
  .refine((query) => query.kind !== 'favicon' || query.variant !== undefined, {
    message: 'Нужен вариант favicon',
  })

export const fileLookupQuerySchema = z.object({ url: z.string().min(1) })
