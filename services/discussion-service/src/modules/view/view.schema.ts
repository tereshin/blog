import { z } from 'zod'

export const viewParamsSchema = z.strictObject({ article_id: z.uuid() })
