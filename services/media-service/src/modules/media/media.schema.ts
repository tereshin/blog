import { z } from 'zod'
import { mediaKindSchema } from '@blog/contracts'

export const uploadQuerySchema = z.object({ kind: mediaKindSchema })

export const fileLookupQuerySchema = z.object({ url: z.string().min(1) })
