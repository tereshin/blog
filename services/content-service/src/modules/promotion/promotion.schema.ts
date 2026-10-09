import { z } from 'zod'

export const promotionParamsSchema = z.object({ id: z.uuid() })
