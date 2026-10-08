import { z } from 'zod'

export const topicParamsSchema = z.object({ slug: z.string().min(1).max(60) })
export const topicIdParamsSchema = z.object({ id: z.uuid() })
export const topicListQuerySchema = z.object({ include_archived: z.literal('1').optional() })
