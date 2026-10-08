import { z } from 'zod'

export const topicParamsSchema = z.object({ slug: z.string().min(1).max(60) })
