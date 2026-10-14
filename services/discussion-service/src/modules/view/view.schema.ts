import { z } from 'zod'

export const ViewParamsSchema = z.strictObject({ article_id: z.uuid() })
