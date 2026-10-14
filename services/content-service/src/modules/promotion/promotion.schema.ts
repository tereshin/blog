import { z } from 'zod'

export const PromotionParamsSchema = z.object({ id: z.uuid() })
